//! ypacapy.db: query history and saved queries, in SQLite next to settings.toml.

use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use sqlx::Row;
use tauri::State;
use tokio::sync::OnceCell;

use crate::conns::{new_id, now_ms, Engine};

/// History keeps this many runs; older ones are removed as new ones come in.
const HISTORY_MAX: i64 = 2000;

#[derive(Default)]
pub struct LocalStore(OnceCell<SqlitePool>);

const SCHEMA: &str = "
create table if not exists history (
  id integer primary key,
  conn_id text not null,
  conn_name text not null,
  engine text not null,
  database text not null default '',
  sql text not null,
  started_at integer not null,
  ms integer not null default 0,
  rows integer,
  status text not null,
  error text
);
create index if not exists history_started on history (started_at desc);
create table if not exists saved (
  id text primary key,
  folder text not null default '',
  name text not null,
  sql text not null,
  conn_id text,
  created_at integer not null,
  updated_at integer not null
);
";

impl LocalStore {
    async fn pool(&self) -> Result<&SqlitePool, String> {
        self.0
            .get_or_try_init(|| async {
                let path = crate::paths::config_dir()?.join("ypacapy.db");
                let opts = SqliteConnectOptions::new().filename(&path).create_if_missing(true);
                let pool = SqlitePoolOptions::new().max_connections(2).connect_with(opts).await.map_err(|e| format!("cannot open {}: {e}", path.display()))?;
                sqlx::raw_sql(SCHEMA).execute(&pool).await.map_err(|e| e.to_string())?;
                Ok::<_, String>(pool)
            })
            .await
    }

    pub async fn add_history(&self, h: HistoryEntry) -> Result<(), String> {
        let p = self.pool().await?;
        sqlx::query("insert into history (conn_id, conn_name, engine, database, sql, started_at, ms, rows, status, error) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(h.conn_id)
            .bind(h.conn_name)
            .bind(serde_json::to_value(h.engine).ok().and_then(|v| v.as_str().map(str::to_string)).unwrap_or_default())
            .bind(h.database)
            .bind(h.sql)
            .bind(h.started_at)
            .bind(h.ms)
            .bind(h.rows)
            .bind(h.status)
            .bind(h.error)
            .execute(p)
            .await
            .map_err(|e| e.to_string())?;
        sqlx::query("delete from history where id <= (select id from history order by id desc limit 1 offset ?)")
            .bind(HISTORY_MAX)
            .execute(p)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: i64,
    pub conn_id: String,
    pub conn_name: String,
    pub engine: Engine,
    pub database: String,
    pub sql: String,
    pub started_at: i64,
    pub ms: i64,
    pub rows: Option<i64>,
    pub status: String,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn list_history(search: Option<String>, limit: Option<i64>, store: State<'_, LocalStore>) -> Result<Vec<HistoryEntry>, String> {
    let p = store.pool().await?;
    let like = format!("%{}%", search.unwrap_or_default().replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_"));
    let rows = sqlx::query(
        "select id, conn_id, conn_name, engine, database, sql, started_at, ms, rows, status, error from history \
         where sql like ? escape '\\' order by started_at desc limit ?",
    )
    .bind(like)
    .bind(limit.unwrap_or(300))
    .fetch_all(p)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows
        .iter()
        .filter_map(|r| {
            Some(HistoryEntry {
                id: r.get(0),
                conn_id: r.get(1),
                conn_name: r.get(2),
                engine: serde_json::from_value(serde_json::Value::String(r.get::<String, _>(3))).ok()?,
                database: r.get(4),
                sql: r.get(5),
                started_at: r.get(6),
                ms: r.get(7),
                rows: r.get(8),
                status: r.get(9),
                error: r.get(10),
            })
        })
        .collect())
}

#[tauri::command]
pub async fn clear_history(store: State<'_, LocalStore>) -> Result<(), String> {
    let p = store.pool().await?;
    sqlx::query("delete from history").execute(p).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Saved {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub folder: String,
    pub name: String,
    pub sql: String,
    #[serde(default)]
    pub conn_id: Option<String>,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
}

#[tauri::command]
pub async fn list_saved(store: State<'_, LocalStore>) -> Result<Vec<Saved>, String> {
    let p = store.pool().await?;
    let rows = sqlx::query("select id, folder, name, sql, conn_id, created_at, updated_at from saved order by folder, name")
        .fetch_all(p)
        .await
        .map_err(|e| e.to_string())?;
    Ok(rows
        .iter()
        .map(|r| Saved { id: r.get(0), folder: r.get(1), name: r.get(2), sql: r.get(3), conn_id: r.get(4), created_at: r.get(5), updated_at: r.get(6) })
        .collect())
}

/// Adds a saved query (empty id) or updates one.
#[tauri::command]
pub async fn save_query(mut q: Saved, store: State<'_, LocalStore>) -> Result<Saved, String> {
    let p = store.pool().await?;
    q.name = q.name.trim().to_string();
    if q.name.is_empty() {
        return Err("Give the query a name".into());
    }
    q.folder = q.folder.trim().to_string();
    let now = now_ms();
    if q.id.is_empty() {
        q.id = new_id();
        q.created_at = now;
    }
    q.updated_at = now;
    sqlx::query(
        "insert into saved (id, folder, name, sql, conn_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?) \
         on conflict (id) do update set folder = excluded.folder, name = excluded.name, sql = excluded.sql, conn_id = excluded.conn_id, updated_at = excluded.updated_at",
    )
    .bind(&q.id)
    .bind(&q.folder)
    .bind(&q.name)
    .bind(&q.sql)
    .bind(&q.conn_id)
    .bind(q.created_at)
    .bind(q.updated_at)
    .execute(p)
    .await
    .map_err(|e| e.to_string())?;
    Ok(q)
}

#[tauri::command]
pub async fn delete_saved(id: String, store: State<'_, LocalStore>) -> Result<(), String> {
    let p = store.pool().await?;
    sqlx::query("delete from saved where id = ?").bind(id).execute(p).await.map_err(|e| e.to_string())?;
    Ok(())
}
