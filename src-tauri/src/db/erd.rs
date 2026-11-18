//! The ER diagram of one schema, opened by the person: the tables they picked with their columns, the
//! foreign keys between them, and the unique keys of the referencing tables (so the diagram can tell
//! one-to-one from many-to-one). Tables only: views and materialized views declare no keys and are left out.
//! Catalog lookups only, a fixed handful per diagram, limited to the picked tables; no row of data is read.
//!
//! PostgreSQL also brings the tables of other schemas that a foreign key links to a picked table, in either
//! direction. MySQL brings the tables of other schemas a picked table references (not the other way: finding
//! those means reading every schema's keys), and none when the connection is limited to one database.
//! SQLite keys never leave their file.

use super::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErdColumn {
    name: String,
    #[serde(rename = "type")]
    ty: String,
    nullable: bool,
    primary: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErdTable {
    schema: String,
    name: String,
    /// table or foreign
    kind: String,
    columns: Vec<ErdColumn>,
    /// Unique keys other than the primary key, each its columns in key order.
    uniques: Vec<Vec<String>>,
}

/// One foreign key: `columns` of `schema.table` reference `ref_columns` of `ref_schema.ref_table`, pairwise.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErdKey {
    name: String,
    schema: String,
    table: String,
    columns: Vec<String>,
    ref_schema: String,
    ref_table: String,
    ref_columns: Vec<String>,
}

#[derive(Serialize)]
pub struct SchemaDiagram {
    tables: Vec<ErdTable>,
    keys: Vec<ErdKey>,
}

async fn open_sql(id: &str, database: Option<String>, schema: &str, state: &DbState) -> Result<(Conn, Arc<Open>), String> {
    let conn = conns::find(id)?;
    if matches!(conn.engine, Engine::Mongo | Engine::Redis) {
        return Err("Diagrams draw foreign keys, and MongoDB and Redis declare none.".into());
    }
    check_schema(&conn, schema)?;
    let open = state.get(&conn, &database.unwrap_or_default()).await.map_err(|e| err_text(&e))?;
    Ok((conn, open))
}

/// The diagram of `tables` (picked in the diagram's table picker) in `schema`; `None` reads every table.
#[tauri::command]
pub async fn schema_diagram(id: String, database: Option<String>, schema: String, tables: Option<Vec<String>>, state: State<'_, DbState>) -> Result<SchemaDiagram, String> {
    let (conn, open) = open_sql(&id, database, &schema, &state).await?;
    if tables.as_ref().is_some_and(Vec::is_empty) {
        return Ok(SchemaDiagram { tables: vec![], keys: vec![] });
    }
    // MySQL: a schema is a database, and a connection limited to one database reads no other
    let cross = !(conn.engine == Engine::Mysql && pinned(&conn).is_some());
    diagram(&open.pool, conn.engine, &schema, tables.as_deref(), cross).await.map_err(|e| err_text(&e))
}

/// Which tables of `schema` reference which (referencing, referenced), for the picker's Add linked tables.
/// One catalog read of the schema's foreign keys, made when the person asks for it.
#[tauri::command]
pub async fn schema_links(id: String, database: Option<String>, schema: String, state: State<'_, DbState>) -> Result<Vec<[String; 2]>, String> {
    let (conn, open) = open_sql(&id, database, &schema, &state).await?;
    links(&open.pool, conn.engine, &schema).await.map_err(|e| err_text(&e))
}

type Rows = Vec<Vec<Option<String>>>;

fn kind_of(raw: &str) -> &'static str {
    match raw {
        "f" => "foreign",
        _ => "table",
    }
}

/// `col in (…)` over the picked tables, `true` when every table is wanted. PostgreSQL and SQLite number their
/// placeholders from `first` (each list is bound once and may be named many times); MySQL's `?` take one bind each.
fn among(engine: Engine, col: &str, picked: Option<&[String]>, first: usize) -> String {
    let Some(t) = picked else { return "true".into() };
    let marks: Vec<String> = (first..first + t.len())
        .map(|i| match engine {
            Engine::Postgres => format!("${i}"),
            Engine::Sqlite => format!("?{i}"),
            _ => "?".into(),
        })
        .collect();
    format!("{col} in ({})", marks.join(", "))
}

/// `schema` and then the picked names: the binds of a query whose list starts at placeholder 2.
fn with_names<'a>(s: &'a str, picked: Option<&'a [String]>) -> Vec<&'a str> {
    let mut b = vec![s];
    b.extend(picked.into_iter().flatten().map(String::as_str));
    b
}

/// Column rows (schema, table, kind, column, type, nullable, primary), ordered by table, as tables.
fn tables_of(rows: &Rows) -> Vec<ErdTable> {
    let mut out: Vec<ErdTable> = vec![];
    for r in rows {
        let (s, t) = (col(r, 0), col(r, 1));
        if !matches!(out.last(), Some(l) if l.schema == s && l.name == t) {
            out.push(ErdTable { schema: s, name: t, kind: kind_of(&col(r, 2)).into(), columns: vec![], uniques: vec![] });
        }
        if let Some(l) = out.last_mut() {
            l.columns.push(ErdColumn { name: col(r, 3), ty: col(r, 4), nullable: truthy(&col(r, 5)), primary: truthy(&col(r, 6)) });
        }
    }
    out
}

/// Key rows (name, schema, table, ref schema, ref table, column, ref column), one per column pair in key order.
fn keys_of(rows: &Rows) -> Vec<ErdKey> {
    let mut out: Vec<ErdKey> = vec![];
    for r in rows {
        let (name, s, t) = (col(r, 0), col(r, 1), col(r, 2));
        if !matches!(out.last(), Some(k) if k.name == name && k.schema == s && k.table == t) {
            out.push(ErdKey { name, schema: s, table: t, columns: vec![], ref_schema: col(r, 3), ref_table: col(r, 4), ref_columns: vec![] });
        }
        if let Some(k) = out.last_mut() {
            k.columns.push(col(r, 5));
            // SQLite leaves it empty when the key references the primary key without naming it
            k.ref_columns.push(col(r, 6));
        }
    }
    out
}

/// Unique-key rows (schema, table, index, column), ordered by index and key position, onto their tables.
fn add_uniques(tables: &mut [ErdTable], rows: &Rows) {
    let mut keys: Vec<((String, String, String), Vec<String>)> = vec![];
    for r in rows {
        let id = (col(r, 0), col(r, 1), col(r, 2));
        match keys.last_mut() {
            Some((k, cols)) if *k == id => cols.push(col(r, 3)),
            _ => keys.push((id, vec![col(r, 3)])),
        }
    }
    for ((s, t, _), cols) in keys {
        if let Some(table) = tables.iter_mut().find(|x| x.schema == s && x.name == t) {
            table.uniques.push(cols);
        }
    }
}

pub(super) async fn diagram(pool: &Pool, engine: Engine, s: &str, picked: Option<&[String]>, cross: bool) -> Result<SchemaDiagram, sqlx::Error> {
    match engine {
        Engine::Postgres => postgres(pool, s, picked).await,
        Engine::Mysql => mysql(pool, s, picked, cross).await,
        Engine::Sqlite => sqlite(pool, s, picked).await,
        Engine::Mongo | Engine::Redis => Err(sqlx::Error::Configuration("MongoDB and Redis have no foreign keys".into())),
    }
}

pub(super) async fn links(pool: &Pool, engine: Engine, s: &str) -> Result<Vec<[String; 2]>, sqlx::Error> {
    let rows = match engine {
        Engine::Postgres => {
            catalog(
                pool,
                &format!("select distinct cs.relname::text, cr.relname::text {PG_KEY_FROM} where con.contype = 'f' and ns.nspname::text = $1 and nr.nspname::text = $1 and not cs.relispartition and not cr.relispartition"),
                &[s],
            )
            .await?
        }
        Engine::Mysql => {
            catalog(
                pool,
                "select distinct cast(TABLE_NAME as char), cast(REFERENCED_TABLE_NAME as char) from information_schema.KEY_COLUMN_USAGE \
                 where TABLE_SCHEMA = ? and REFERENCED_TABLE_SCHEMA = ? and REFERENCED_TABLE_NAME is not null",
                &[s, s],
            )
            .await?
        }
        Engine::Sqlite => {
            let master = format!("{}.sqlite_master", quote_ident(Engine::Sqlite, s));
            let names: Vec<String> = catalog(pool, &format!("select name from {master} m where m.type = 'table' and {SQLITE_OWN}"), &[]).await?.iter().map(|r| col(r, 0)).collect();
            let rows = catalog(pool, &format!("select distinct m.name, p.\"table\" from {master} m join pragma_foreign_key_list(m.name, ?1) p where m.type = 'table' and {SQLITE_OWN}"), &[s]).await?;
            // SQLite matches the referenced table's name without regard to case
            rows.into_iter()
                .filter_map(|r| names.iter().find(|n| n.eq_ignore_ascii_case(&col(&r, 1))).map(|n| vec![r[0].clone(), Some(n.clone())]))
                .collect()
        }
        Engine::Mongo | Engine::Redis => vec![],
    };
    Ok(rows.iter().map(|r| [col(r, 0), col(r, 1)]).collect())
}

/// Foreign keys and the two tables they join; partitions are left out (their parent stands for them).
const PG_KEY_FROM: &str = "from pg_constraint con \
     join pg_class cs on cs.oid = con.conrelid join pg_namespace ns on ns.oid = cs.relnamespace \
     join pg_class cr on cr.oid = con.confrelid join pg_namespace nr on nr.oid = cr.relnamespace";

async fn postgres(pool: &Pool, s: &str, picked: Option<&[String]>) -> Result<SchemaDiagram, sqlx::Error> {
    let binds = with_names(s, picked);
    // keys that leave a picked table, or reach one from another schema
    let key_where = format!(
        "con.contype = 'f' and not cs.relispartition and not cr.relispartition \
         and ((ns.nspname::text = $1 and {}) or (nr.nspname::text = $1 and ns.nspname::text <> $1 and {}))",
        among(Engine::Postgres, "cs.relname::text", picked, 2),
        among(Engine::Postgres, "cr.relname::text", picked, 2),
    );
    let keys = catalog(
        pool,
        &format!(
            "select con.conname::text, ns.nspname::text, cs.relname::text, nr.nspname::text, cr.relname::text, a.attname::text, ra.attname::text \
             {PG_KEY_FROM} \
             cross join lateral unnest(con.conkey, con.confkey) with ordinality u(k, rk, o) \
             join pg_attribute a on a.attrelid = con.conrelid and a.attnum = u.k \
             join pg_attribute ra on ra.attrelid = con.confrelid and ra.attnum = u.rk \
             where {key_where} \
             order by 2, 3, 1, u.o"
        ),
        &binds,
    )
    .await?;
    let cols = catalog(
        pool,
        &format!(
            "select n.nspname::text, c.relname::text, c.relkind::text, a.attname::text, format_type(a.atttypid, a.atttypmod), (not a.attnotnull)::text, \
             exists(select 1 from pg_index i where i.indrelid = c.oid and i.indisprimary and a.attnum = any(i.indkey))::text \
             from pg_class c join pg_namespace n on n.oid = c.relnamespace \
             join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped \
             where c.relkind in ('r', 'p', 'f') and not c.relispartition \
             and ((n.nspname::text = $1 and {}) \
               or c.oid in (select con.confrelid {PG_KEY_FROM} where {key_where} and nr.nspname::text <> $1 \
                            union select con.conrelid {PG_KEY_FROM} where {key_where} and ns.nspname::text <> $1)) \
             order by 1, 2, a.attnum",
            among(Engine::Postgres, "c.relname::text", picked, 2)
        ),
        &binds,
    )
    .await?;
    // unique keys of the referencing tables only: they alone decide a key's cardinality
    let uniques = catalog(
        pool,
        &format!(
            "select n.nspname::text, c.relname::text, ic.relname::text, a.attname::text \
             from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace \
             join pg_class ic on ic.oid = i.indexrelid \
             cross join lateral unnest(i.indkey::int2[]) with ordinality u(k, o) \
             join pg_attribute a on a.attrelid = c.oid and a.attnum = u.k \
             where i.indisunique and not i.indisprimary and i.indpred is null and 0 <> all(i.indkey::int2[]) \
             and c.oid in (select con.conrelid {PG_KEY_FROM} where {key_where}) \
             order by 1, 2, 3, u.o"
        ),
        &binds,
    )
    .await?;
    let mut tables = tables_of(&cols);
    add_uniques(&mut tables, &uniques);
    Ok(SchemaDiagram { tables, keys: keys_of(&keys) })
}

const MY_COLS: &str = "select cast(c.TABLE_SCHEMA as char), cast(c.TABLE_NAME as char), cast(t.TABLE_TYPE as char), cast(c.COLUMN_NAME as char), \
     cast(c.COLUMN_TYPE as char), cast(c.IS_NULLABLE = 'YES' as char), cast(c.COLUMN_KEY = 'PRI' as char) \
     from information_schema.COLUMNS c join information_schema.TABLES t on t.TABLE_SCHEMA = c.TABLE_SCHEMA and t.TABLE_NAME = c.TABLE_NAME";

async fn mysql(pool: &Pool, s: &str, picked: Option<&[String]>, cross: bool) -> Result<SchemaDiagram, sqlx::Error> {
    // every lookup names its schema and the picked tables: MySQL 5.7 opens each table's definition it has to consider
    let binds = with_names(s, picked);
    let in_cols = among(Engine::Mysql, "c.TABLE_NAME", picked, 0);
    let mut cols = catalog(
        pool,
        &format!("{MY_COLS} where c.TABLE_SCHEMA = ? and t.TABLE_SCHEMA = ? and t.TABLE_TYPE = 'BASE TABLE' and {in_cols} order by c.TABLE_NAME, c.ORDINAL_POSITION"),
        &[&[s][..], &binds].concat(),
    )
    .await?;
    let rows = catalog(
        pool,
        &format!(
            "select cast(k.CONSTRAINT_NAME as char), cast(k.TABLE_SCHEMA as char), cast(k.TABLE_NAME as char), cast(k.REFERENCED_TABLE_SCHEMA as char), \
             cast(k.REFERENCED_TABLE_NAME as char), cast(k.COLUMN_NAME as char), cast(k.REFERENCED_COLUMN_NAME as char) \
             from information_schema.KEY_COLUMN_USAGE k where k.TABLE_SCHEMA = ? and k.REFERENCED_TABLE_NAME is not null and {} \
             order by k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION",
            among(Engine::Mysql, "k.TABLE_NAME", picked, 0)
        ),
        &binds,
    )
    .await?;
    let mut keys = keys_of(&rows);
    if !cross {
        keys.retain(|k| k.ref_schema == s);
    }
    // the tables of other schemas the picked ones reference, one lookup each (usually none)
    let mut outside: Vec<(&str, &str)> = keys.iter().filter(|k| k.ref_schema != s).map(|k| (k.ref_schema.as_str(), k.ref_table.as_str())).collect();
    outside.sort();
    outside.dedup();
    for (rs, rt) in outside {
        let more = catalog(
            pool,
            &format!("{MY_COLS} where c.TABLE_SCHEMA = ? and t.TABLE_SCHEMA = ? and c.TABLE_NAME = ? and t.TABLE_NAME = ? order by c.ORDINAL_POSITION"),
            &[rs, rs, rt, rt],
        )
        .await?;
        cols.extend(more);
    }
    let uniques = catalog(
        pool,
        &format!(
            "select cast(TABLE_SCHEMA as char), cast(TABLE_NAME as char), cast(INDEX_NAME as char), cast(COLUMN_NAME as char) \
             from information_schema.STATISTICS where TABLE_SCHEMA = ? and NON_UNIQUE = 0 and INDEX_NAME <> 'PRIMARY' and COLUMN_NAME is not null and {} \
             order by TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX",
            among(Engine::Mysql, "TABLE_NAME", picked, 0)
        ),
        &binds,
    )
    .await?;
    let mut tables = tables_of(&cols);
    add_uniques(&mut tables, &uniques);
    Ok(SchemaDiagram { tables, keys })
}

const SQLITE_OWN: &str = "m.name not like 'sqlite\\_%' escape '\\'";

async fn sqlite(pool: &Pool, s: &str, picked: Option<&[String]>) -> Result<SchemaDiagram, sqlx::Error> {
    let master = format!("{}.sqlite_master", quote_ident(Engine::Sqlite, s));
    let binds = with_names(s, picked);
    let picked_only = format!("m.type = 'table' and {SQLITE_OWN} and {}", among(Engine::Sqlite, "m.name", picked, 2));
    // the 8th value is the column's place in the primary key, for keys that reference it without naming columns
    let cols = catalog(
        pool,
        &format!(
            "select ?1, m.name, m.type, p.name, lower(p.type), cast(p.\"notnull\" = 0 as text), cast(p.pk > 0 as text), p.pk \
             from {master} m join pragma_table_info(m.name, ?1) p where {picked_only} order by m.name, p.cid"
        ),
        &binds,
    )
    .await?;
    let rows = catalog(
        pool,
        &format!(
            "select 'fk_' || p.id, ?1, m.name, ?1, p.\"table\", p.\"from\", p.\"to\" \
             from {master} m join pragma_foreign_key_list(m.name, ?1) p where {picked_only} order by m.name, p.id, p.seq"
        ),
        &binds,
    )
    .await?;
    let uniques = catalog(
        pool,
        &format!(
            "select ?1, m.name, l.name, i.name \
             from {master} m join pragma_index_list(m.name, ?1) l join pragma_index_info(l.name, ?1) i \
             where {picked_only} and l.\"unique\" and l.origin <> 'pk' and i.name is not null order by m.name, l.name, i.seqno"
        ),
        &binds,
    )
    .await?;
    let mut tables = tables_of(&cols);
    let mut keys = keys_of(&rows);
    for k in &mut keys {
        // SQLite matches the referenced table's name without regard to case; an unpicked target stays as written
        let Some(target) = tables.iter().find(|t| t.name.eq_ignore_ascii_case(&k.ref_table)) else { continue };
        k.ref_table = target.name.clone();
        if k.ref_columns.iter().any(String::is_empty) {
            let mut pk: Vec<(i64, String)> =
                cols.iter().filter(|r| col(r, 1) == target.name).filter_map(|r| col(r, 7).parse::<i64>().ok().filter(|n| *n > 0).map(|n| (n, col(r, 3)))).collect();
            pk.sort();
            if pk.len() == k.columns.len() {
                k.ref_columns = pk.into_iter().map(|(_, n)| n).collect();
            }
        }
    }
    add_uniques(&mut tables, &uniques);
    Ok(SchemaDiagram { tables, keys })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn sqlite_diagram() {
        // one connection: each connection to :memory: is a database of its own
        let p = SqlitePoolOptions::new().max_connections(1).connect_with(SqliteConnectOptions::new().filename(":memory:")).await.unwrap();
        sqlx::raw_sql(
            "create table customers (id integer primary key, email text not null unique); \
             create table orders (id integer primary key, customer_id integer not null references Customers, note text); \
             create table profiles (customer_id integer not null unique references customers (id), bio text); \
             create table lines (order_id integer references orders (id), n integer, primary key (order_id, n)); \
             create view open_orders as select * from orders",
        )
        .execute(&p)
        .await
        .unwrap();
        let pool = Pool::Lite(p);
        let d = diagram(&pool, Engine::Sqlite, "main", None, true).await.unwrap();
        // views are left out
        let names: Vec<&str> = d.tables.iter().map(|t| t.name.as_str()).collect();
        assert_eq!(names, ["customers", "lines", "orders", "profiles"]);
        let orders = d.tables.iter().find(|t| t.name == "orders").unwrap();
        assert!(orders.columns[0].primary);
        assert!(!orders.columns[1].nullable && orders.columns[2].nullable);
        // a key that names neither the table's case nor the column still lands on customers.id
        let k = d.keys.iter().find(|k| k.table == "orders").unwrap();
        assert_eq!((k.ref_table.as_str(), k.columns.clone(), k.ref_columns.clone()), ("customers", vec!["customer_id".to_string()], vec!["id".to_string()]));
        let lines = d.tables.iter().find(|t| t.name == "lines").unwrap();
        assert!(lines.columns.iter().all(|c| c.primary));
        let profiles = d.tables.iter().find(|t| t.name == "profiles").unwrap();
        assert_eq!(profiles.uniques, vec![vec!["customer_id".to_string()]]);
        assert_eq!(d.keys.len(), 3);

        // picked tables only: their columns and the keys that leave them
        let picked = ["orders".to_string(), "customers".to_string()];
        let d = diagram(&pool, Engine::Sqlite, "main", Some(&picked), true).await.unwrap();
        assert_eq!(d.tables.iter().map(|t| t.name.as_str()).collect::<Vec<_>>(), ["customers", "orders"]);
        assert_eq!(d.keys.iter().map(|k| k.table.as_str()).collect::<Vec<_>>(), ["orders"]);

        let mut l = links(&pool, Engine::Sqlite, "main").await.unwrap();
        l.sort();
        assert_eq!(l, [["lines", "orders"], ["orders", "customers"], ["profiles", "customers"]].map(|p| p.map(String::from)));
    }
}
