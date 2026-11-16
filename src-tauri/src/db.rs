//! The databases the person added: one sqlx pool per connection and database, opened on demand,
//! kept for the session. ypacapy only ever runs catalog lookups and limited reads on its own;
//! everything else is what the person typed. No polling: a pooled connection is tested when it is
//! acquired, and the optional heartbeat (Settings > Queries, off by default) is the only timer.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures_util::future::BoxFuture;
use futures_util::stream::BoxStream;
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use sqlx::mysql::{MySqlConnectOptions, MySqlDatabaseError, MySqlPool, MySqlPoolOptions, MySqlQueryResult, MySqlRow, MySqlSslMode};
use sqlx::postgres::{PgConnectOptions, PgDatabaseError, PgErrorPosition, PgPool, PgPoolOptions, PgQueryResult, PgRow, PgSslMode};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions, SqliteQueryResult, SqliteRow};
use sqlx::{Column, Either, Executor, Row, TypeInfo, ValueRef};
use tauri::{AppHandle, Manager, State};
use tokio_util::sync::CancellationToken;

use crate::conns::{self, Conn, Engine};
use crate::guard::{self, Approval, Ask, GuardState};
use crate::settings::SettingsState;
use crate::store::{HistoryEntry, LocalStore};

/// Rows kept from one result set when no row limit could be added to the query itself.
const HARD_CAP: usize = 10_000;

pub enum Pool {
    Pg(PgPool),
    My(MySqlPool),
    Lite(SqlitePool),
}

/// Runs the same block once per driver, with `$p` bound to that driver's pool (concrete types per arm).
macro_rules! on_pool {
    ($pool:expr, $p:ident => $body:expr) => {
        match $pool {
            Pool::Pg($p) => $body,
            Pool::My($p) => $body,
            Pool::Lite($p) => $body,
        }
    };
}

pub struct Open {
    pool: Pool,
    engine: Engine,
    /// "PostgreSQL 16.4"
    server: String,
}

#[derive(Default)]
pub struct DbState {
    /// (connection id, database; "" for the connection's own)
    open: tokio::sync::Mutex<HashMap<(String, String), Arc<Open>>>,
    runs: std::sync::Mutex<HashMap<String, CancellationToken>>,
}

// ---------- values: every cell is read as the text the database gives ----------

trait Cells {
    fn cells(&self) -> Vec<Option<String>>;
    /// The storage type of one value, for result columns without a declared type (SQLite expressions).
    fn value_type(&self, i: usize) -> Option<String>;
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

macro_rules! impl_cells {
    ($row:ty) => {
        impl Cells for $row {
            fn cells(&self) -> Vec<Option<String>> {
                (0..self.len())
                    .map(|i| {
                        let raw = self.try_get_raw(i).ok()?;
                        if raw.is_null() {
                            return None;
                        }
                        // text protocol (raw SQL) and text casts in catalog queries: the database's own rendering
                        if let Ok(s) = self.try_get_unchecked::<String, _>(i) {
                            return Some(s);
                        }
                        if let Ok(b) = self.try_get_unchecked::<Vec<u8>, _>(i) {
                            return Some(format!("0x{}", hex(&b)));
                        }
                        Some(String::new())
                    })
                    .collect()
            }
            fn value_type(&self, i: usize) -> Option<String> {
                let v = self.try_get_raw(i).ok()?;
                (!v.is_null()).then(|| v.type_info().name().to_lowercase())
            }
        }
    };
}
impl_cells!(PgRow);
impl_cells!(MySqlRow);
impl_cells!(SqliteRow);

/// Raw SQL on one connection, with the lifetimes spelled out: inferring them inside a Send future
/// trips the compiler's higher-ranked Executor bounds.
/// A raw run's items: a statement finished (rows affected) or a row.
type RawItem<D, R> = Result<Either<D, R>, sqlx::Error>;

trait RawExec: Send {
    type Row: Row + Cells + Send;
    type Done: Affected + Send;
    fn stream<'c>(&'c mut self, sql: &'c str) -> BoxStream<'c, RawItem<Self::Done, Self::Row>>;
    fn rows<'c>(&'c mut self, sql: &'c str) -> BoxFuture<'c, Result<Vec<Self::Row>, sqlx::Error>>;
    fn run<'c>(&'c mut self, sql: &'c str) -> BoxFuture<'c, Result<(), sqlx::Error>>;
}
macro_rules! impl_raw {
    ($conn:ty, $row:ty, $done:ty) => {
        impl RawExec for $conn {
            type Row = $row;
            type Done = $done;
            fn stream<'c>(&'c mut self, sql: &'c str) -> BoxStream<'c, RawItem<$done, $row>> {
                sqlx::raw_sql(sql).fetch_many(self)
            }
            // built on the stream: RawSql's own async fetch_all/execute on a connection are not Send-general
            fn rows<'c>(&'c mut self, sql: &'c str) -> BoxFuture<'c, Result<Vec<$row>, sqlx::Error>> {
                Box::pin(async move {
                    let mut s = self.stream(sql);
                    let mut out = vec![];
                    while let Some(x) = s.try_next().await? {
                        if let Either::Right(r) = x {
                            out.push(r);
                        }
                    }
                    Ok(out)
                })
            }
            fn run<'c>(&'c mut self, sql: &'c str) -> BoxFuture<'c, Result<(), sqlx::Error>> {
                Box::pin(async move {
                    let mut s = self.stream(sql);
                    while s.try_next().await?.is_some() {}
                    Ok(())
                })
            }
        }
    };
}
impl_raw!(sqlx::PgConnection, PgRow, PgQueryResult);
impl_raw!(sqlx::MySqlConnection, MySqlRow, MySqlQueryResult);
impl_raw!(sqlx::SqliteConnection, SqliteRow, SqliteQueryResult);

trait Affected {
    fn affected(&self) -> u64;
}
macro_rules! impl_affected {
    ($t:ty) => {
        impl Affected for $t {
            fn affected(&self) -> u64 {
                self.rows_affected()
            }
        }
    };
}
impl_affected!(PgQueryResult);
impl_affected!(MySqlQueryResult);
impl_affected!(SqliteQueryResult);

#[derive(Serialize, Clone, Debug)]
pub struct ColMeta {
    name: String,
    /// lower case, from the result set's own metadata
    #[serde(rename = "type")]
    ty: String,
}

#[derive(Serialize, Debug, Default)]
pub struct ResultSet {
    columns: Vec<ColMeta>,
    rows: Vec<Vec<Option<String>>>,
    truncated: bool,
}

impl ResultSet {
    fn from_row<R: Row + Cells>(row: &R) -> Self {
        let columns = row
            .columns()
            .iter()
            .enumerate()
            .map(|(i, c)| {
                let ty = c.type_info().name().to_lowercase();
                // SQLite expressions have no declared type: take the value's storage class
                let ty = if ty == "null" { row.value_type(i).unwrap_or(ty) } else { ty };
                ColMeta { name: c.name().to_string(), ty }
            })
            .collect();
        ResultSet { columns, ..Default::default() }
    }
}

// ---------- connecting ----------

async fn password_for(conn: &Conn) -> Result<Option<String>, String> {
    if conn.engine == Engine::Sqlite || conn.id.is_empty() {
        return Ok(None);
    }
    let account = crate::keychain::conn_account(&conn.id);
    tokio::task::spawn_blocking(move || crate::keychain::get_string(&account)).await.map_err(|e| e.to_string())?
}

fn host_of(conn: &Conn) -> String {
    conn.host.clone().filter(|h| !h.trim().is_empty()).unwrap_or_else(|| "localhost".into())
}

fn port_of(conn: &Conn) -> u16 {
    conn.port.unwrap_or(match conn.engine {
        Engine::Mysql => 3306,
        _ => 5432,
    })
}

async fn connect(conn: &Conn, database: &str, password: Option<String>, read_only: bool, max: u32) -> Result<Pool, sqlx::Error> {
    let db = Some(database).filter(|d| !d.is_empty()).or(conn.database.as_deref().filter(|d| !d.trim().is_empty()));
    let user = conn.user.clone().filter(|u| !u.trim().is_empty());
    let acquire = Duration::from_secs(15);
    Ok(match conn.engine {
        Engine::Postgres => {
            let mut o = PgConnectOptions::new()
                .host(&host_of(conn))
                .port(port_of(conn))
                .ssl_mode(PgSslMode::Prefer)
                .application_name("ypacapy");
            if let Some(u) = &user {
                o = o.username(u);
            }
            if let Some(d) = db {
                o = o.database(d);
            }
            if let Some(pw) = &password {
                o = o.password(pw);
            }
            if read_only {
                o = o.options([("default_transaction_read_only", "on")]);
            }
            Pool::Pg(PgPoolOptions::new().max_connections(max).test_before_acquire(true).acquire_timeout(acquire).connect_with(o).await?)
        }
        Engine::Mysql => {
            let mut o = MySqlConnectOptions::new().host(&host_of(conn)).port(port_of(conn)).ssl_mode(MySqlSslMode::Preferred);
            if let Some(u) = &user {
                o = o.username(u);
            }
            if let Some(d) = db {
                o = o.database(d);
            }
            if let Some(pw) = &password {
                o = o.password(pw);
            }
            let opts = MySqlPoolOptions::new().max_connections(max).test_before_acquire(true).acquire_timeout(acquire).after_connect(move |c, _| {
                Box::pin(async move {
                    if read_only {
                        c.execute("SET SESSION TRANSACTION READ ONLY").await?;
                    }
                    Ok(())
                })
            });
            Pool::My(opts.connect_with(o).await?)
        }
        Engine::Sqlite => {
            let file = conn.file.clone().unwrap_or_default();
            // opened in place, never created or copied
            let o = SqliteConnectOptions::new().filename(crate::paths::expand_tilde(file.trim())).create_if_missing(false).read_only(read_only);
            Pool::Lite(SqlitePoolOptions::new().max_connections(max).test_before_acquire(true).acquire_timeout(acquire).connect_with(o).await?)
        }
    })
}

/// Text rows of a catalog query; every selected value is cast to text in the SQL itself.
async fn catalog(pool: &Pool, sql: &str, binds: &[&str]) -> Result<Vec<Vec<Option<String>>>, sqlx::Error> {
    on_pool!(pool, p => {
        let mut q = sqlx::query(sql);
        for b in binds {
            q = q.bind(b.to_string());
        }
        let rows = q.fetch_all(p).await?;
        Ok(rows.iter().map(|r| r.cells()).collect())
    })
}

/// Raw SQL (text protocol), rows only.
async fn raw_rows(pool: &Pool, sql: &str) -> Result<Vec<Vec<Option<String>>>, sqlx::Error> {
    on_pool!(pool, p => {
        let rows = sqlx::raw_sql(sql).fetch_all(p).await?;
        Ok(rows.iter().map(|r| r.cells()).collect())
    })
}

fn first(rows: &[Vec<Option<String>>]) -> String {
    rows.first().and_then(|r| r.first().cloned().flatten()).unwrap_or_default()
}

async fn server_version(pool: &Pool, engine: Engine) -> Result<String, sqlx::Error> {
    Ok(match engine {
        Engine::Postgres => {
            let v = first(&raw_rows(pool, "select version()").await?);
            v.split_whitespace().take(2).collect::<Vec<_>>().join(" ")
        }
        Engine::Mysql => {
            let v = first(&raw_rows(pool, "select version()").await?);
            let num = v.split('-').next().unwrap_or(&v).to_string();
            if v.to_lowercase().contains("mariadb") {
                format!("MariaDB {num}")
            } else {
                format!("MySQL {num}")
            }
        }
        Engine::Sqlite => format!("SQLite {}", first(&raw_rows(pool, "select sqlite_version()").await?)),
    })
}

impl DbState {
    async fn get(&self, conn: &Conn, database: &str, settings: &SettingsState) -> Result<Arc<Open>, sqlx::Error> {
        let key = (conn.id.clone(), database.to_string());
        if let Some(o) = self.open.lock().await.get(&key) {
            return Ok(o.clone());
        }
        let password = password_for(conn).await.map_err(|e| sqlx::Error::Configuration(e.into()))?;
        let pool = connect(conn, database, password, settings.bool("readOnly", false), 4).await?;
        let server = server_version(&pool, conn.engine).await.unwrap_or_else(|_| conn.engine.label().to_string());
        let open = Arc::new(Open { pool, engine: conn.engine, server });
        let mut map = self.open.lock().await;
        // another call may have connected meanwhile: keep the first
        Ok(map.entry(key).or_insert(open).clone())
    }

    async fn drop_conn(&self, id: &str) {
        let gone: Vec<Arc<Open>> = {
            let mut map = self.open.lock().await;
            let keys: Vec<_> = map.keys().filter(|(c, _)| c == id).cloned().collect();
            keys.into_iter().filter_map(|k| map.remove(&k)).collect()
        };
        for o in gone {
            on_pool!(&o.pool, p => p.close().await);
        }
    }
}

fn err_text(e: &sqlx::Error) -> String {
    match e {
        sqlx::Error::Database(d) => d.message().to_string(),
        sqlx::Error::Configuration(c) => c.to_string(),
        e => e.to_string(),
    }
}

// ---------- commands: connections ----------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestResult {
    server: String,
    ms: u64,
}

/// New connection > Test: one connection, the server's version, closed again.
#[tauri::command]
pub async fn test_connection(conn: Conn, password: Option<String>) -> Result<TestResult, String> {
    let password = match password.filter(|p| !p.is_empty()) {
        Some(p) => Some(p),
        None => password_for(&conn).await?,
    };
    let t = Instant::now();
    let pool = connect(&conn, "", password, true, 1).await.map_err(|e| err_text(&e))?;
    let server = server_version(&pool, conn.engine).await.map_err(|e| err_text(&e));
    let ms = t.elapsed().as_millis() as u64;
    on_pool!(&pool, p => p.close().await);
    Ok(TestResult { server: server?, ms })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenInfo {
    server: String,
    /// PostgreSQL and MySQL: the databases on the server; empty for SQLite
    databases: Vec<String>,
    database: String,
    /// PostgreSQL: schemas of the database; MySQL: its databases (a schema there); SQLite: main
    schemas: Vec<String>,
    default_schema: String,
}

/// Opens (or reuses) the pool for a connection and database and lists what the context picker shows.
#[tauri::command]
pub async fn open_connection(id: String, database: Option<String>, state: State<'_, DbState>, settings: State<'_, SettingsState>) -> Result<OpenInfo, String> {
    let conn = conns::find(&id)?;
    let database = database.unwrap_or_default();
    let open = state.get(&conn, &database, &settings).await.map_err(|e| err_text(&e))?;
    let pool = &open.pool;
    let r = async {
        Ok::<_, sqlx::Error>(match conn.engine {
            Engine::Postgres => {
                let databases = catalog(pool, "select datname::text from pg_database where datallowconn and not datistemplate order by datname", &[]).await?;
                let cur = raw_rows(pool, "select current_database()::text, coalesce(current_schema()::text, 'public')").await?;
                let def = cur.first().and_then(|r| r.get(1).cloned().flatten()).unwrap_or_else(|| "public".into());
                let cur = first(&cur);
                let schemas = catalog(
                    pool,
                    "select nspname::text from pg_namespace where nspname !~ '^pg_' and nspname <> 'information_schema' order by nspname",
                    &[],
                )
                .await?;
                OpenInfo {
                    server: open.server.clone(),
                    databases: databases.into_iter().filter_map(|r| r.into_iter().next().flatten()).collect(),
                    database: cur,
                    schemas: schemas.into_iter().filter_map(|r| r.into_iter().next().flatten()).collect(),
                    default_schema: def,
                }
            }
            Engine::Mysql => {
                let dbs: Vec<String> = catalog(pool, "select cast(SCHEMA_NAME as char) from information_schema.SCHEMATA order by SCHEMA_NAME", &[])
                    .await?
                    .into_iter()
                    .filter_map(|r| r.into_iter().next().flatten())
                    .collect();
                let cur = first(&raw_rows(pool, "select cast(coalesce(database(), '') as char)").await?);
                OpenInfo { server: open.server.clone(), databases: dbs.clone(), database: cur.clone(), schemas: dbs, default_schema: cur }
            }
            Engine::Sqlite => OpenInfo { server: open.server.clone(), databases: vec![], database: String::new(), schemas: vec!["main".into()], default_schema: "main".into() },
        })
    }
    .await;
    r.map_err(|e| err_text(&e))
}

/// Closes every pool of a connection (closing its tab, or Reconnect before opening again).
#[tauri::command]
pub async fn close_connection(id: String, state: State<'_, DbState>) -> Result<(), String> {
    state.drop_conn(&id).await;
    Ok(())
}

// ---------- commands: catalog ----------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeTable {
    name: String,
    /// table, view, matview, foreign
    kind: String,
    /// Planner statistics (pg_class.reltuples, information_schema.TABLES.TABLE_ROWS); never counted
    estimate: Option<i64>,
}

#[derive(Serialize)]
pub struct SchemaObjects {
    tables: Vec<TreeTable>,
    functions: Vec<String>,
}

fn quote_ident(engine: Engine, s: &str) -> String {
    match engine {
        Engine::Mysql => format!("`{}`", s.replace('`', "``")),
        _ => format!("\"{}\"", s.replace('"', "\"\"")),
    }
}

/// One schema of the tree, loaded when it is expanded.
#[tauri::command]
pub async fn load_schema(id: String, database: Option<String>, schema: String, state: State<'_, DbState>, settings: State<'_, SettingsState>) -> Result<SchemaObjects, String> {
    let conn = conns::find(&id)?;
    let open = state.get(&conn, &database.unwrap_or_default(), &settings).await.map_err(|e| err_text(&e))?;
    schema_objects(&open.pool, conn.engine, &schema).await
}

async fn schema_objects(pool: &Pool, engine: Engine, s: &str) -> Result<SchemaObjects, String> {
    let (tables, functions) = match engine {
        Engine::Postgres => (
            catalog(
                pool,
                "select c.relname::text, c.relkind::text, case when c.reltuples < 0 then null else c.reltuples::bigint::text end \
                 from pg_class c join pg_namespace n on n.oid = c.relnamespace \
                 where n.nspname::text = $1 and c.relkind in ('r', 'p', 'v', 'm', 'f') and not c.relispartition order by c.relname",
                &[s],
            )
            .await,
            catalog(pool, "select distinct p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname::text = $1 order by 1", &[s]).await,
        ),
        Engine::Mysql => (
            catalog(
                pool,
                "select cast(TABLE_NAME as char), cast(TABLE_TYPE as char), cast(TABLE_ROWS as char) from information_schema.TABLES where TABLE_SCHEMA = ? order by TABLE_NAME",
                &[s],
            )
            .await,
            catalog(pool, "select cast(ROUTINE_NAME as char) from information_schema.ROUTINES where ROUTINE_SCHEMA = ? order by ROUTINE_NAME", &[s]).await,
        ),
        Engine::Sqlite => (
            catalog(
                pool,
                &format!("select name, type, null from {}.sqlite_master where type in ('table', 'view') and name not like 'sqlite\\_%' escape '\\' order by name", quote_ident(Engine::Sqlite, s)),
                &[],
            )
            .await,
            Ok(vec![]),
        ),
    };
    let tables = tables
        .map_err(|e| err_text(&e))?
        .into_iter()
        .map(|r| {
            let kind = match r.get(1).cloned().flatten().unwrap_or_default().as_str() {
                "v" | "VIEW" | "SYSTEM VIEW" | "view" => "view",
                "m" => "matview",
                "f" => "foreign",
                _ => "table",
            };
            TreeTable {
                name: r.first().cloned().flatten().unwrap_or_default(),
                kind: kind.into(),
                estimate: if kind == "table" || kind == "matview" { r.get(2).cloned().flatten().and_then(|v| v.parse().ok()) } else { None },
            }
        })
        .collect();
    let functions = functions.map_err(|e| err_text(&e))?.into_iter().filter_map(|r| r.into_iter().next().flatten()).collect();
    Ok(SchemaObjects { tables, functions })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableColumn {
    name: String,
    #[serde(rename = "type")]
    ty: String,
    nullable: bool,
    default: Option<String>,
    primary: bool,
    references: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableIndex {
    name: String,
    columns: String,
    method: String,
    unique: bool,
    primary: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableKey {
    name: String,
    column: String,
    references: String,
    on_delete: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    columns: Vec<TableColumn>,
    indexes: Vec<TableIndex>,
    foreign_keys: Vec<TableKey>,
}

fn col(r: &[Option<String>], i: usize) -> String {
    r.get(i).cloned().flatten().unwrap_or_default()
}

fn truthy(s: &str) -> bool {
    matches!(s.to_lowercase().as_str(), "true" | "t" | "1" | "yes")
}

/// A table's columns, indexes and foreign keys, from the catalog.
#[tauri::command]
pub async fn table_info(
    id: String,
    database: Option<String>,
    schema: String,
    table: String,
    state: State<'_, DbState>,
    settings: State<'_, SettingsState>,
) -> Result<TableInfo, String> {
    let conn = conns::find(&id)?;
    let open = state.get(&conn, &database.unwrap_or_default(), &settings).await.map_err(|e| err_text(&e))?;
    table_catalog(&open.pool, conn.engine, &schema, &table).await
}

async fn table_catalog(pool: &Pool, engine: Engine, s: &str, t: &str) -> Result<TableInfo, String> {
    let r = async {
        Ok::<_, sqlx::Error>(match engine {
            Engine::Postgres => {
                const REL: &str = "(quote_ident($1) || '.' || quote_ident($2))::regclass";
                let cols = catalog(
                    pool,
                    &format!(
                        "select a.attname::text, format_type(a.atttypid, a.atttypmod), (not a.attnotnull)::text, pg_get_expr(d.adbin, d.adrelid) \
                         from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum \
                         where a.attrelid = {REL} and a.attnum > 0 and not a.attisdropped order by a.attnum"
                    ),
                    &[s, t],
                )
                .await?;
                let idx = catalog(
                    pool,
                    &format!(
                        "select ic.relname::text, \
                         array_to_string(array(select pg_get_indexdef(i.indexrelid, k, true) || case when i.indoption[k - 1] & 1 = 1 then ' desc' else '' end \
                           from generate_series(1, i.indnatts) k order by k), ', '), \
                         am.amname::text, i.indisunique::text, i.indisprimary::text \
                         from pg_index i join pg_class ic on ic.oid = i.indexrelid join pg_am am on am.oid = ic.relam \
                         where i.indrelid = {REL} order by i.indisprimary desc, ic.relname"
                    ),
                    &[s, t],
                )
                .await?;
                let fks = catalog(
                    pool,
                    &format!(
                        "select con.conname::text, \
                         array_to_string(array(select a.attname::text from unnest(con.conkey) with ordinality u(n, o) join pg_attribute a on a.attrelid = con.conrelid and a.attnum = u.n order by u.o), ', '), \
                         con.confrelid::regclass::text || '.' || array_to_string(array(select a.attname::text from unnest(con.confkey) with ordinality u(n, o) join pg_attribute a on a.attrelid = con.confrelid and a.attnum = u.n order by u.o), ', '), \
                         case con.confdeltype when 'a' then 'no action' when 'r' then 'restrict' when 'c' then 'cascade' when 'n' then 'set null' when 'd' then 'set default' else '' end \
                         from pg_constraint con where con.contype = 'f' and con.conrelid = {REL} order by con.conname"
                    ),
                    &[s, t],
                )
                .await?;
                (cols.iter().map(|r| (col(r, 0), col(r, 1), truthy(&col(r, 2)), r.get(3).cloned().flatten())).collect::<Vec<_>>(), idx.iter().map(|r| (col(r, 0), col(r, 1), col(r, 2), truthy(&col(r, 3)), truthy(&col(r, 4)))).collect::<Vec<_>>(), fks.iter().map(|r| (col(r, 0), col(r, 1), col(r, 2), col(r, 3))).collect::<Vec<_>>())
            }
            Engine::Mysql => {
                let cols = catalog(
                    pool,
                    "select cast(COLUMN_NAME as char), cast(COLUMN_TYPE as char), cast(IS_NULLABLE as char), cast(COLUMN_DEFAULT as char) \
                     from information_schema.COLUMNS where TABLE_SCHEMA = ? and TABLE_NAME = ? order by ORDINAL_POSITION",
                    &[s, t],
                )
                .await?;
                let idx = catalog(
                    pool,
                    "select cast(INDEX_NAME as char), cast(group_concat(COLUMN_NAME order by SEQ_IN_INDEX separator ', ') as char), cast(INDEX_TYPE as char), cast(NON_UNIQUE as char) \
                     from information_schema.STATISTICS where TABLE_SCHEMA = ? and TABLE_NAME = ? group by INDEX_NAME, INDEX_TYPE, NON_UNIQUE \
                     order by INDEX_NAME = 'PRIMARY' desc, INDEX_NAME",
                    &[s, t],
                )
                .await?;
                let fks = catalog(
                    pool,
                    "select cast(k.CONSTRAINT_NAME as char), cast(group_concat(k.COLUMN_NAME order by k.ORDINAL_POSITION separator ', ') as char), \
                     cast(concat(k.REFERENCED_TABLE_NAME, '.', group_concat(k.REFERENCED_COLUMN_NAME order by k.ORDINAL_POSITION separator ', ')) as char), cast(lower(r.DELETE_RULE) as char) \
                     from information_schema.KEY_COLUMN_USAGE k join information_schema.REFERENTIAL_CONSTRAINTS r \
                     on r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA and r.CONSTRAINT_NAME = k.CONSTRAINT_NAME and r.TABLE_NAME = k.TABLE_NAME \
                     where k.TABLE_SCHEMA = ? and k.TABLE_NAME = ? and k.REFERENCED_TABLE_NAME is not null \
                     group by k.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME, r.DELETE_RULE order by 1",
                    &[s, t],
                )
                .await?;
                (
                    cols.iter().map(|r| (col(r, 0), col(r, 1), col(r, 2) == "YES", r.get(3).cloned().flatten())).collect(),
                    idx.iter().map(|r| (col(r, 0), col(r, 1), col(r, 2).to_lowercase(), col(r, 3) == "0", col(r, 0) == "PRIMARY")).collect(),
                    fks.iter().map(|r| (col(r, 0), col(r, 1), col(r, 2), col(r, 3))).collect(),
                )
            }
            Engine::Sqlite => {
                let cols = catalog(pool, "select name, type, \"notnull\", dflt_value, pk from pragma_table_info(?, ?) order by cid", &[t, s]).await?;
                let list = catalog(pool, "select name, \"unique\", origin from pragma_index_list(?, ?) order by name", &[t, s]).await?;
                let mut idx = vec![];
                for r in &list {
                    let name = col(r, 0);
                    let c = catalog(pool, "select group_concat(name, ', ') from (select name from pragma_index_info(?, ?) order by seqno)", &[&name, s]).await?;
                    idx.push((name, first(&c), "btree".to_string(), truthy(&col(r, 1)), col(r, 2) == "pk"));
                }
                // a rowid primary key has no index of its own: list it like the others
                let pk: Vec<String> = {
                    let mut p: Vec<(i64, String)> = cols.iter().filter_map(|r| col(r, 4).parse::<i64>().ok().filter(|n| *n > 0).map(|n| (n, col(r, 0)))).collect();
                    p.sort();
                    p.into_iter().map(|(_, n)| n).collect()
                };
                if !pk.is_empty() && !idx.iter().any(|i| i.4) {
                    idx.insert(0, ("primary key".into(), pk.join(", "), "rowid".into(), true, true));
                }
                let fk_rows = catalog(pool, "select id, \"from\", \"table\", \"to\", on_delete from pragma_foreign_key_list(?, ?) order by id, seq", &[t, s]).await?;
                let mut fks: Vec<(String, String, String, String)> = vec![];
                for r in &fk_rows {
                    let id = col(r, 0);
                    match fks.iter_mut().find(|f| f.0 == format!("fk_{id}")) {
                        Some(f) => {
                            f.1 = format!("{}, {}", f.1, col(r, 1));
                            f.2 = format!("{}, {}", f.2, col(r, 3));
                        }
                        None => fks.push((format!("fk_{id}"), col(r, 1), format!("{}.{}", col(r, 2), col(r, 3)), col(r, 4).to_lowercase())),
                    }
                }
                (cols.iter().map(|r| (col(r, 0), col(r, 1).to_lowercase(), col(r, 2) == "0", r.get(3).cloned().flatten())).collect(), idx, fks)
            }
        })
    }
    .await;
    let (cols, idx, fks) = r.map_err(|e| err_text(&e))?;
    let pk_cols: Vec<String> = idx.iter().filter(|i| i.4).flat_map(|i| i.1.split(", ").map(str::to_string).collect::<Vec<_>>()).collect();
    let columns = cols
        .into_iter()
        .map(|(name, ty, nullable, default)| TableColumn {
            primary: pk_cols.contains(&name),
            references: fks.iter().find(|f| f.1 == name).map(|f| f.2.clone()),
            name,
            ty,
            nullable,
            default,
        })
        .collect();
    Ok(TableInfo {
        columns,
        indexes: idx.into_iter().map(|(name, columns, method, unique, primary)| TableIndex { name, columns, method, unique, primary }).collect(),
        foreign_keys: fks.into_iter().map(|(name, column, references, on_delete)| TableKey { name, column, references, on_delete }).collect(),
    })
}

// ---------- commands: running SQL ----------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunRequest {
    run_id: String,
    conn_id: String,
    database: Option<String>,
    /// PostgreSQL: the schema picked in the query line (search_path for this run)
    schema: Option<String>,
    sql: String,
    /// add Settings > Queries > Row limit to a query without a limit of its own
    add_limit: bool,
    approval: Option<Approval>,
    /// record the run in history (the console does; table reads do not)
    history: bool,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RunOutcome {
    #[serde(rename_all = "camelCase")]
    Done {
        sets: Vec<ResultSet>,
        messages: Vec<String>,
        ms: u64,
        /// the row limit ypacapy added, if it did
        limit: Option<usize>,
        affected: Option<u64>,
        /// CREATE, ALTER or DROP ran: the schema tree reloads
        ddl: bool,
        last_is_query: bool,
        server: String,
    },
    /// The write guard asks first; call again with an approval.
    Ask(Ask),
    #[serde(rename_all = "camelCase")]
    Error {
        title: String,
        /// the database's own words, as its own client prints them
        says: Option<String>,
        message: String,
        hint: Option<String>,
        /// the connection is gone: Reconnect
        lost: bool,
        ms: u64,
    },
    #[serde(rename_all = "camelCase")]
    Cancelled { ms: u64, timeout: bool },
}

struct Collected {
    sets: Vec<ResultSet>,
    messages: Vec<String>,
    affected: Option<u64>,
}

enum Exec {
    Done(Collected),
    Cancelled { timeout: bool },
}

fn plural(n: usize, one: &str) -> String {
    format!("{n} {one}{}", if n == 1 { "" } else { "s" })
}

/// Runs the SQL on one pooled connection. Cancel and the statement timeout drop the run, close that
/// connection and ask the server to stop the statement (PostgreSQL pg_cancel_backend, MySQL KILL QUERY).
async fn execute(open: &Open, schema: Option<&str>, sql: &str, cap: usize, token: CancellationToken, timeout_s: u64) -> Result<Exec, sqlx::Error> {
    let setup = match open.engine {
        Engine::Postgres => Some(match schema.filter(|s| !s.is_empty()) {
            Some(s) => format!("set search_path to {}; select pg_backend_pid()::text", quote_ident(Engine::Postgres, s)),
            None => "select pg_backend_pid()::text".to_string(),
        }),
        Engine::Mysql => Some("select cast(connection_id() as char)".to_string()),
        // TODO: SQLite has no server to ask; a cancelled run stops at the worker's next row step
        // (sqlite3_interrupt through the raw handle would stop a long single step too).
        Engine::Sqlite => None,
    };
    let (res, pid) = on_pool!(&open.pool, p => {
        let mut pc = p.acquire().await?;
        let pid = match &setup {
            Some(s) => pc.rows(s).await?.first().and_then(|r| r.cells().into_iter().next().flatten()),
            None => None,
        };
        let outcome = {
            let fut = async {
                let mut stream = pc.stream(sql);
                let mut c = Collected { sets: vec![], messages: vec![], affected: None };
                let mut cur: Option<ResultSet> = None;
                let mut cut = false;
                while let Some(item) = stream.try_next().await? {
                    match item {
                        Either::Left(done) => match cur.take() {
                            Some(set) => {
                                c.messages.push(format!("{} returned", plural(set.rows.len(), "row")));
                                c.sets.push(set);
                            }
                            None => {
                                let n = done.affected();
                                c.affected = Some(c.affected.unwrap_or(0) + n);
                                c.messages.push(format!("{} affected", plural(n as usize, "row")));
                            }
                        },
                        Either::Right(row) => {
                            let set = cur.get_or_insert_with(|| ResultSet::from_row(&row));
                            if set.rows.len() >= cap {
                                set.truncated = true;
                                cut = true;
                                break;
                            }
                            set.rows.push(row.cells());
                        }
                    }
                }
                drop(stream);
                if let Some(set) = cur.take() {
                    c.messages.push(format!("{} returned{}", plural(set.rows.len(), "row"), if set.truncated { ", more were left unread" } else { "" }));
                    c.sets.push(set);
                }
                Ok::<_, sqlx::Error>((c, cut))
            };
            tokio::pin!(fut);
            let sleep = async {
                if timeout_s > 0 {
                    tokio::time::sleep(Duration::from_secs(timeout_s)).await
                } else {
                    std::future::pending::<()>().await
                }
            };
            tokio::select! {
                r = &mut fut => Ok(r),
                _ = token.cancelled() => Err(false),
                _ = sleep => Err(true),
            }
        };
        match outcome {
            Ok(Ok((c, cut))) => {
                // rows left unread on the wire: do not hand this connection to the next run
                if cut {
                    pc.close_on_drop();
                }
                (Ok(Exec::Done(c)), None)
            }
            Ok(Err(e)) => (Err(e), None),
            Err(timeout) => {
                pc.close_on_drop();
                (Ok(Exec::Cancelled { timeout }), pid)
            }
        }
    });
    if let Some(pid) = pid.and_then(|p| p.trim().parse::<i64>().ok()) {
        let stop = match open.engine {
            Engine::Postgres => format!("select pg_cancel_backend({pid})"),
            _ => format!("kill query {pid}"),
        };
        let _ = raw_rows(&open.pool, &stop).await;
    }
    res
}

fn capitalise(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
        None => String::new(),
    }
}

/// psql's LINE n: … and the caret under the position the server reported (1-based, in characters).
fn pg_position(sql: &str, pos: usize) -> (usize, String) {
    let before: String = sql.chars().take(pos.saturating_sub(1)).collect();
    let line_no = before.matches('\n').count() + 1;
    let col = before.rsplit('\n').next().map(|l| l.chars().count()).unwrap_or(0);
    let line = sql.lines().nth(line_no - 1).unwrap_or("");
    let lead = format!("LINE {line_no}: ");
    (line_no, format!("{lead}{line}\n{}^", " ".repeat(lead.len() + col)))
}

fn run_error(e: &sqlx::Error, engine: Engine, sql: &str, conn: &Conn, ms: u64) -> RunOutcome {
    let lost = matches!(e, sqlx::Error::Io(_) | sqlx::Error::Tls(_) | sqlx::Error::Protocol(_) | sqlx::Error::PoolTimedOut | sqlx::Error::PoolClosed | sqlx::Error::WorkerCrashed);
    if lost {
        let where_ = match engine {
            Engine::Sqlite => conn.file.clone().unwrap_or_default(),
            _ => format!("{}:{}", host_of(conn), port_of(conn)),
        };
        return RunOutcome::Error {
            title: format!("Lost the connection to {}", conn.name),
            says: None,
            message: err_text(e),
            hint: Some(format!("{where_} stopped answering while the query ran.")),
            lost: true,
            ms,
        };
    }
    let sqlx::Error::Database(db) = e else {
        return RunOutcome::Error { title: "The query did not run".into(), says: None, message: err_text(e), hint: None, lost: false, ms };
    };
    let mut hint = None;
    let says = match engine {
        Engine::Postgres => db.try_downcast_ref::<PgDatabaseError>().map(|pg| {
            let sev = format!("{:?}", pg.severity()).to_uppercase();
            let mut out = format!("{sev}:  {}", pg.message());
            if let Some(PgErrorPosition::Original(pos)) = pg.position() {
                let (line, text) = pg_position(sql, pos);
                out += &format!("\n{text}");
                hint = Some(format!("PostgreSQL stopped at line {line}."));
            }
            if let Some(d) = pg.detail() {
                out += &format!("\nDETAIL:  {d}");
            }
            if let Some(h) = pg.hint() {
                out += &format!("\nHINT:  {h}");
            }
            out
        }),
        Engine::Mysql => db.try_downcast_ref::<MySqlDatabaseError>().map(|my| format!("ERROR {} ({}): {}", my.number(), my.code().unwrap_or("HY000"), my.message())),
        Engine::Sqlite => Some(format!("Error: {}", db.message())),
    };
    RunOutcome::Error { title: capitalise(db.message().lines().next().unwrap_or("")), says, message: db.message().to_string(), hint, lost: false, ms }
}

#[tauri::command]
pub async fn run_query(
    req: RunRequest,
    state: State<'_, DbState>,
    settings: State<'_, SettingsState>,
    guard_state: State<'_, GuardState>,
    store: State<'_, LocalStore>,
) -> Result<RunOutcome, String> {
    let conn = conns::find(&req.conn_id)?;
    let c = guard::classify(&req.sql, conn.engine);
    if let Some(ask) = guard::check(&c, conn.guard, req.approval, &settings, &guard_state).await? {
        return Ok(RunOutcome::Ask(ask));
    }
    let row_limit = settings.u64("rowLimit", 500) as usize;
    let (sql, limit) = if req.add_limit && c.limitable && row_limit > 0 {
        (format!("{}\nlimit {row_limit}", &req.sql[..c.end]), Some(row_limit))
    } else {
        (req.sql.clone(), None)
    };
    let cap = limit.unwrap_or(HARD_CAP);
    let token = CancellationToken::new();
    if let Ok(mut runs) = state.runs.lock() {
        runs.insert(req.run_id.clone(), token.clone());
    }
    let started_at = conns::now_ms();
    let t = Instant::now();
    let database = req.database.clone().unwrap_or_default();
    let res = match state.get(&conn, &database, &settings).await {
        Ok(open) => execute(&open, req.schema.as_deref(), &sql, cap, token, settings.u64("statementTimeout", 30)).await.map(|e| (e, open.server.clone())),
        Err(e) => Err(e),
    };
    if let Ok(mut runs) = state.runs.lock() {
        runs.remove(&req.run_id);
    }
    let ms = t.elapsed().as_millis() as u64;
    let outcome = match res {
        Ok((Exec::Done(col), server)) => RunOutcome::Done {
            messages: col.messages,
            affected: col.affected,
            sets: col.sets,
            ms,
            limit,
            ddl: c.ddl(),
            last_is_query: c.last_is_query,
            server,
        },
        Ok((Exec::Cancelled { timeout }, _)) => RunOutcome::Cancelled { ms, timeout },
        Err(e) => {
            let out = run_error(&e, conn.engine, &sql, &conn, ms);
            if let RunOutcome::Error { lost: true, .. } = out {
                state.drop_conn(&conn.id).await;
            }
            out
        }
    };
    if req.history && settings.bool("keepHistory", true) {
        let (status, rows, error) = match &outcome {
            RunOutcome::Done { sets, affected, .. } => ("ok", sets.last().map(|s| s.rows.len() as i64).or(affected.map(|a| a as i64)), None),
            RunOutcome::Error { title, .. } => ("error", None, Some(title.clone())),
            _ => ("cancelled", None, None),
        };
        let _ = store
            .add_history(HistoryEntry {
                id: 0,
                conn_id: conn.id.clone(),
                conn_name: conn.name.clone(),
                engine: conn.engine,
                database,
                sql: req.sql.clone(),
                started_at,
                ms: ms as i64,
                rows,
                status: status.into(),
                error,
            })
            .await;
    }
    Ok(outcome)
}

#[tauri::command]
pub fn cancel_query(run_id: String, state: State<'_, DbState>) {
    if let Some(t) = state.runs.lock().ok().and_then(|r| r.get(&run_id).cloned()) {
        t.cancel();
    }
}

// ---------- heartbeat ----------

/// Settings > Queries > Connection heartbeat (off by default): every interval, `select 1` on each idle
/// pooled connection of every open PostgreSQL and MySQL connection, for servers that drop idle sessions.
/// Connections busy with a run are not touched (they are not idle). SQLite is never pinged.
pub fn start_heartbeat(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            let every = app.state::<SettingsState>().u64("heartbeatEvery", 30).max(5);
            tokio::time::sleep(Duration::from_secs(every)).await;
            if !app.state::<SettingsState>().bool("heartbeat", false) {
                continue;
            }
            let opens: Vec<Arc<Open>> = app.state::<DbState>().open.lock().await.values().cloned().collect();
            for o in opens {
                match &o.pool {
                    Pool::Pg(p) => {
                        let mut held = vec![];
                        while let Some(c) = p.try_acquire() {
                            held.push(c);
                        }
                        for c in held.iter_mut() {
                            let _ = c.run("select 1").await;
                        }
                    }
                    Pool::My(p) => {
                        let mut held = vec![];
                        while let Some(c) = p.try_acquire() {
                            held.push(c);
                        }
                        for c in held.iter_mut() {
                            let _ = c.run("select 1").await;
                        }
                    }
                    Pool::Lite(_) => {}
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conn(engine: Engine) -> Conn {
        Conn {
            id: String::new(),
            name: "test".into(),
            engine,
            host: Some("localhost".into()),
            port: None,
            database: Some("postgres".into()),
            user: std::env::var("USER").ok(),
            file: std::env::var("YPACAPY_TEST_SQLITE").ok(),
            color: 1,
            guard: Default::default(),
            last_opened: None,
        }
    }

    async fn open(engine: Engine) -> Open {
        let c = conn(engine);
        let pool = connect(&c, "", None, false, 2).await.expect("connect");
        let server = server_version(&pool, engine).await.unwrap();
        Open { pool, engine, server }
    }

    fn done(e: Exec) -> Collected {
        match e {
            Exec::Done(c) => c,
            Exec::Cancelled { .. } => panic!("cancelled"),
        }
    }

    /// Needs a local PostgreSQL on localhost:5432 that lets $USER in: `cargo test -- --ignored`.
    /// Only selects and session-scoped temp tables.
    #[tokio::test]
    #[ignore]
    async fn postgres_runs() {
        let o = open(Engine::Postgres).await;
        assert!(o.server.starts_with("PostgreSQL"), "{}", o.server);
        let sql = "select 1::int8 as id, 't'::bool as ok, null::text as nothing, now() as at, '{\"a\":1}'::jsonb as j; select 2";
        let c = done(execute(&o, None, sql, 100, CancellationToken::new(), 10).await.unwrap());
        assert_eq!(c.sets.len(), 2);
        let s = &c.sets[0];
        let types: Vec<&str> = s.columns.iter().map(|c| c.ty.as_str()).collect();
        assert_eq!(types, ["int8", "bool", "text", "timestamptz", "jsonb"]);
        assert_eq!(s.rows[0][0].as_deref(), Some("1"));
        assert_eq!(s.rows[0][1].as_deref(), Some("t"));
        assert_eq!(s.rows[0][2], None);
        assert_eq!(s.rows[0][4].as_deref(), Some("{\"a\": 1}"));

        // writes in a temp table report rows affected
        let c = done(execute(&o, None, "create temp table t (a int); insert into t select generate_series(1, 5)", 100, CancellationToken::new(), 10).await.unwrap());
        assert_eq!(c.affected, Some(5));

        // cut at the cap
        let c = done(execute(&o, None, "select generate_series(1, 50)", 10, CancellationToken::new(), 10).await.unwrap());
        assert!(c.sets[0].truncated);
        assert_eq!(c.sets[0].rows.len(), 10);

        // the database's own error, with psql's caret
        let sql = "select totl from pg_class";
        let e = execute(&o, None, sql, 10, CancellationToken::new(), 10).await.err().unwrap();
        let RunOutcome::Error { says, title, lost, .. } = run_error(&e, Engine::Postgres, sql, &conn(Engine::Postgres), 1) else { panic!() };
        assert!(!lost);
        assert!(title.starts_with("Column \"totl\" does not exist"), "{title}");
        assert!(says.unwrap().contains("LINE 1: select totl from pg_class\n               ^"));

        // the statement timeout stops a long statement
        let t = Instant::now();
        let r = execute(&o, None, "select pg_sleep(30)", 10, CancellationToken::new(), 1).await.unwrap();
        assert!(matches!(r, Exec::Cancelled { timeout: true }));
        assert!(t.elapsed() < Duration::from_secs(5));

        // catalog
        let rows = catalog(&o.pool, "select n.nspname::text from pg_namespace n where n.nspname::text = $1", &["public"]).await.unwrap();
        assert_eq!(first(&rows), "public");
    }

    /// The catalog queries against session temp tables (one pooled connection, so they see them).
    #[tokio::test]
    #[ignore]
    async fn postgres_catalog() {
        let c = conn(Engine::Postgres);
        let pool = connect(&c, "", None, false, 1).await.expect("connect");
        raw_rows(
            &pool,
            "create temp table cust (id int8 primary key, email text not null); \
             create temp table ord (id int8 primary key, customer_id int8 not null references cust (id) on delete restrict, status text default 'pending', at timestamptz); \
             create index ord_status_at on ord (status, at desc); analyze ord",
        )
        .await
        .unwrap();
        let schema = first(&raw_rows(&pool, "select nspname::text from pg_namespace where oid = pg_my_temp_schema()").await.unwrap());
        let objs = schema_objects(&pool, Engine::Postgres, &schema).await.unwrap();
        let names: Vec<&str> = objs.tables.iter().map(|t| t.name.as_str()).collect();
        assert_eq!(names, ["cust", "ord"]);
        assert_eq!(objs.tables[1].estimate, Some(0));
        let info = table_catalog(&pool, Engine::Postgres, &schema, "ord").await.unwrap();
        let cols: Vec<(&str, &str, bool)> = info.columns.iter().map(|c| (c.name.as_str(), c.ty.as_str(), c.nullable)).collect();
        assert_eq!(cols[0], ("id", "bigint", false));
        assert!(info.columns[0].primary);
        assert_eq!(info.columns[1].references.as_deref(), Some("cust.id"));
        assert_eq!(info.columns[2].default.as_deref(), Some("'pending'::text"));
        assert_eq!(info.indexes.iter().map(|i| (i.name.as_str(), i.columns.as_str())).collect::<Vec<_>>(), [("ord_pkey", "id"), ("ord_status_at", "status, at desc")]);
        assert_eq!(info.foreign_keys[0].on_delete, "restrict");
        assert_eq!(info.foreign_keys[0].column, "customer_id");
    }

    #[tokio::test]
    async fn sqlite_runs() {
        let dir = std::env::temp_dir().join(format!("ypacapy-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("t.sqlite");
        let _ = std::fs::remove_file(&file);
        {
            let o = SqliteConnectOptions::new().filename(&file).create_if_missing(true);
            let p = SqlitePool::connect_with(o).await.unwrap();
            sqlx::raw_sql("create table t (id integer primary key, name text, price real, blob blob, ok boolean); insert into t values (1, 'a', 1.5, x'00ff', 1), (2, null, 2, null, 0)")
                .execute(&p)
                .await
                .unwrap();
            p.close().await;
        }
        let mut c = conn(Engine::Sqlite);
        c.file = Some(file.to_string_lossy().into_owned());
        let pool = connect(&c, "", None, false, 1).await.unwrap();
        let o = Open { pool, engine: Engine::Sqlite, server: String::new() };
        let r = done(execute(&o, None, "select id, name, price, blob, ok, 1 + 1 as two from t", 100, CancellationToken::new(), 10).await.unwrap());
        let s = &r.sets[0];
        assert_eq!(s.rows.len(), 2);
        assert_eq!(s.rows[0][0].as_deref(), Some("1"));
        assert_eq!(s.rows[0][2].as_deref(), Some("1.5"));
        assert_eq!(s.rows[0][3].as_deref(), Some("0x00ff"));
        assert_eq!(s.rows[1][1], None);
        assert_eq!(s.columns[5].ty, "integer");
        let r = done(execute(&o, None, "update t set name = 'b' where id = 2", 100, CancellationToken::new(), 10).await.unwrap());
        assert_eq!(r.affected, Some(1));
        raw_rows(&o.pool, "create table c (id integer primary key); create table o (id integer primary key, c_id integer references c (id) on delete cascade, s text); create index o_s on o (s desc)").await.unwrap();
        let objs = schema_objects(&o.pool, Engine::Sqlite, "main").await.unwrap();
        assert_eq!(objs.tables.iter().map(|t| t.name.as_str()).collect::<Vec<_>>(), ["c", "o", "t"]);
        let info = table_catalog(&o.pool, Engine::Sqlite, "main", "o").await.unwrap();
        assert!(info.columns[0].primary);
        assert_eq!(info.columns[1].references.as_deref(), Some("c.id"));
        assert_eq!(info.foreign_keys[0].on_delete, "cascade");
        assert!(info.indexes.iter().any(|i| i.name == "o_s" && i.columns == "s"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
