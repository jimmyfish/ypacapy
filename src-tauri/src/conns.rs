//! connections.toml: every connection on this Mac, without passwords (those are in the keychain).

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::keychain;
use crate::paths::{config_dir, write_atomic};
use crate::settings::SettingsState;

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Engine {
    Postgres,
    Mysql,
    Sqlite,
}

impl Engine {
    pub fn label(self) -> &'static str {
        match self {
            Engine::Postgres => "PostgreSQL",
            Engine::Mysql => "MySQL",
            Engine::Sqlite => "SQLite",
        }
    }
}

/// The write guard of one connection, picked in the tabs bar.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "lowercase")]
pub enum GuardLevel {
    Run,
    #[default]
    Confirm,
    Verify,
}

/// SSL for PostgreSQL and MySQL, named as libpq names it. Missing = prefer.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "kebab-case")]
pub enum SslMode {
    Disable,
    #[default]
    Prefer,
    Require,
    VerifyCa,
    VerifyFull,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Conn {
    pub id: String,
    pub name: String,
    pub engine: Engine,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub database: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
    /// SQLite: the database file, opened in place
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
    /// 1..6, the tile colour
    #[serde(default = "one")]
    pub color: u8,
    #[serde(default)]
    pub guard: GuardLevel,
    /// Options tab. Each one missing = the value in Settings.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub row_limit: Option<u32>,
    /// seconds
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub statement_timeout: Option<u32>,
    /// SSL tab (PostgreSQL and MySQL)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ssl_mode: Option<SslMode>,
    /// CA certificate file, for verify-ca and verify-full
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ssl_ca: Option<String>,
    /// Advanced tab. PostgreSQL application_name; missing = "ypacapy"
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub app_name: Option<String>,
    /// seconds to wait for a connection; missing = 15
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub connect_timeout: Option<u32>,
    /// missing = Settings > Queries > Connection heartbeat
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub heartbeat: Option<bool>,
    /// ms since the epoch
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_opened: Option<i64>,
}

fn one() -> u8 {
    1
}

#[derive(Serialize, Deserialize, Default)]
struct ConnFile {
    #[serde(default, rename = "connection")]
    connections: Vec<Conn>,
}

/// Serialises read-modify-write of connections.toml.
#[derive(Default)]
pub struct ConnLock(Mutex<()>);

fn path() -> Result<std::path::PathBuf, String> {
    Ok(config_dir()?.join("connections.toml"))
}

pub fn load() -> Result<Vec<Conn>, String> {
    let p = path()?;
    let text = match std::fs::read_to_string(&p) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(e) => return Err(format!("cannot read {}: {e}", p.display())),
    };
    let f: ConnFile = toml::from_str(&text).map_err(|e| format!("{} is not valid: {e}", p.display()))?;
    Ok(f.connections)
}

fn store(conns: Vec<Conn>) -> Result<(), String> {
    let text = toml::to_string_pretty(&ConnFile { connections: conns }).map_err(|e| e.to_string())?;
    write_atomic(&path()?, &format!("# ypacapy connections. Passwords are in the macOS login keychain, never here.\n\n{text}"))
}

pub fn find(id: &str) -> Result<Conn, String> {
    load()?.into_iter().find(|c| c.id == id).ok_or_else(|| "This connection no longer exists.".to_string())
}

fn update(lock: &ConnLock, f: impl FnOnce(&mut Vec<Conn>) -> Result<(), String>) -> Result<Vec<Conn>, String> {
    let _g = lock.0.lock().map_err(|e| e.to_string())?;
    let mut all = load()?;
    f(&mut all)?;
    store(all.clone())?;
    Ok(all)
}

pub fn now_ms() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

pub fn new_id() -> String {
    let mut b = [0u8; 8];
    let _ = getrandom::fill(&mut b);
    b.iter().map(|x| format!("{x:02x}")).collect()
}

#[tauri::command]
pub fn list_connections() -> Result<Vec<Conn>, String> {
    load()
}

/// Adds or updates a connection. `password`: Some(non-empty) is stored in the keychain; Some("") on a
/// new connection means none; None keeps what the keychain has.
#[tauri::command]
pub async fn save_connection(mut conn: Conn, password: Option<String>, lock: State<'_, ConnLock>) -> Result<Conn, String> {
    conn.name = conn.name.trim().to_string();
    if conn.name.is_empty() {
        return Err("Give the connection a name so you can find it again".into());
    }
    if conn.engine == Engine::Sqlite && conn.file.as_deref().is_none_or(|f| f.trim().is_empty()) {
        return Err("Choose the database file".into());
    }
    let is_new = conn.id.is_empty();
    if is_new {
        conn.id = new_id();
    }
    if let Some(pw) = password {
        let account = keychain::conn_account(&conn.id);
        tokio::task::spawn_blocking(move || if pw.is_empty() { keychain::delete(&account) } else { keychain::set(&account, pw.as_bytes()) })
            .await
            .map_err(|e| e.to_string())??;
    }
    let saved = conn.clone();
    update(&lock, move |all| {
        match all.iter_mut().find(|c| c.id == conn.id) {
            // the guard level is changed only through set_guard
            Some(c) => *c = Conn { guard: c.guard, last_opened: c.last_opened, ..conn },
            None => all.push(conn),
        }
        Ok(())
    })?;
    Ok(saved)
}

#[tauri::command]
pub async fn delete_connection(id: String, lock: State<'_, ConnLock>) -> Result<(), String> {
    let account = keychain::conn_account(&id);
    tokio::task::spawn_blocking(move || keychain::delete(&account)).await.map_err(|e| e.to_string())??;
    update(&lock, |all| {
        all.retain(|c| c.id != id);
        Ok(())
    })?;
    Ok(())
}

#[tauri::command]
pub fn touch_connection(id: String, lock: State<'_, ConnLock>) -> Result<(), String> {
    update(&lock, |all| {
        if let Some(c) = all.iter_mut().find(|c| c.id == id) {
            c.last_opened = Some(now_ms());
        }
        Ok(())
    })?;
    Ok(())
}

/// Changes a connection's write guard. Lowering it from Ask for passphrase needs the passphrase first.
#[tauri::command]
pub async fn set_guard(
    id: String,
    level: GuardLevel,
    passphrase: Option<String>,
    touch_id: Option<bool>,
    lock: State<'_, ConnLock>,
    settings: State<'_, SettingsState>,
) -> Result<(), String> {
    let cur = find(&id)?;
    if cur.guard == GuardLevel::Verify && level != GuardLevel::Verify {
        crate::guard::verify_for_lowering(passphrase, touch_id.unwrap_or(false), &settings).await?;
    }
    update(&lock, |all| {
        if let Some(c) = all.iter_mut().find(|c| c.id == id) {
            c.guard = level;
        }
        Ok(())
    })?;
    Ok(())
}

/// The passphrase was disabled: Ask for passphrase falls back to Ask to confirm.
pub fn lower_verify_to_confirm() -> Result<(), String> {
    let mut all = load()?;
    if all.iter().any(|c| c.guard == GuardLevel::Verify) {
        for c in all.iter_mut().filter(|c| c.guard == GuardLevel::Verify) {
            c.guard = GuardLevel::Confirm;
        }
        store(all)?;
    }
    Ok(())
}
