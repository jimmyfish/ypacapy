//! connections.toml: every connection on this Mac, without passwords (those are in the keychain).

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::keychain;
use crate::paths::{config_dir, write_atomic};

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

/// The write guard of one connection, picked in the tabs bar: Run or Confirm.
/// Verify is what the guard asks for when passphrase protection applies (Ask.level), and what
/// connections.toml held before passphrase protection moved out of the guard: load() turns a stored
/// Verify into Confirm with `pass_protect` on.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "lowercase")]
pub enum GuardLevel {
    /// a connection that never had its guard set runs, the same as DEFAULT_GUARD in src/types.ts
    #[default]
    Run,
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
    /// 1..8, the tile colour (src/lib/connColors.ts)
    #[serde(default = "one")]
    pub color: u8,
    #[serde(default)]
    pub guard: GuardLevel,
    /// Protect with passphrase: the statements in `protect` ask for the app passphrase, whatever the
    /// guard. Has no effect while no passphrase is set.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub pass_protect: bool,
    /// What to protect, for this connection; missing = every kind
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub protect: Option<Vec<String>>,
    /// With passphrase protection on: Touch ID may stand in for the passphrase
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub touch_id: bool,
    /// With passphrase protection on: seconds this connection stays unlocked after the passphrase;
    /// missing or 0 asks every time
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unlock_window: Option<u32>,
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
    /// ms since the epoch; missing on connections saved before it was recorded
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,
}

fn one() -> u8 {
    1
}

impl Conn {
    /// What to protect, in STATEMENTS order; every kind when the list was never changed.
    pub fn protect_list(&self) -> Vec<&'static str> {
        crate::guard::STATEMENTS.iter().copied().filter(|k| self.protect.as_ref().is_none_or(|l| l.iter().any(|x| x == k))).collect()
    }
}

/// Whether going from `old` to `new` weakens passphrase protection: switching it off, dropping a kind,
/// letting Touch ID stand in, or staying unlocked longer.
fn lowers_protection(old: &Conn, new: &Conn) -> bool {
    if !old.pass_protect {
        return false;
    }
    let kept = new.protect_list();
    !new.pass_protect
        || old.protect_list().iter().any(|k| !kept.contains(k))
        || (new.touch_id && !old.touch_id)
        || new.unlock_window.unwrap_or(0) > old.unlock_window.unwrap_or(0)
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
        Err(e) => return Err(format!("Could not read {}: {e}", p.display())),
    };
    let f: ConnFile = toml::from_str(&text).map_err(|e| format!("{} is not valid: {e}", p.display()))?;
    let mut all = f.connections;
    // files from before passphrase protection moved out of the guard: Ask for passphrase becomes
    // Ask to confirm with passphrase protection on, keeping the app-wide What to protect it used
    if all.iter().any(|c| c.guard == GuardLevel::Verify) {
        let legacy = crate::settings::read_file().ok().and_then(|v| v.get("protect").and_then(|p| p.as_array()).map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect::<Vec<_>>()));
        // without a passphrase Ask for passphrase already acted as Ask to confirm
        let has_pass = keychain::has_passphrase().unwrap_or(false);
        for c in all.iter_mut().filter(|c| c.guard == GuardLevel::Verify) {
            c.guard = GuardLevel::Confirm;
            c.pass_protect = has_pass;
            c.protect = legacy.clone();
        }
        store(all.clone())?;
    }
    Ok(all)
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
pub async fn save_connection(mut conn: Conn, password: Option<String>, lock: State<'_, ConnLock>, guard: State<'_, crate::guard::GuardState>) -> Result<Conn, String> {
    conn.name = conn.name.trim().to_string();
    if conn.name.is_empty() {
        return Err("Give the connection a name so you can find it again".into());
    }
    if conn.engine == Engine::Sqlite && conn.file.as_deref().is_none_or(|f| f.trim().is_empty()) {
        return Err("Choose the database file".into());
    }
    if conn.guard == GuardLevel::Verify {
        return Err("Pick Run it or Ask to confirm for the write guard.".into());
    }
    let is_new = conn.id.is_empty();
    if is_new {
        conn.id = new_id();
        conn.created_at = Some(now_ms());
    }
    let has_pass = tokio::task::spawn_blocking(keychain::has_passphrase).await.map_err(|e| e.to_string())??;
    if !has_pass {
        conn.pass_protect = false;
    }
    // weakening passphrase protection needs What to protect opened with the passphrase first (unlock_protect)
    if !is_new && has_pass && !guard.protect_unlocked() {
        if let Ok(old) = find(&conn.id) {
            if lowers_protection(&old, &conn) {
                return Err("Passphrase protection is locked. Enter the passphrase to change it.".into());
            }
        }
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
            Some(c) => *c = Conn { guard: c.guard, last_opened: c.last_opened, created_at: c.created_at, ..conn },
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

/// Changes a connection's write guard: Run it or Ask to confirm. Passphrase protection is separate
/// (save_connection), so this never needs the passphrase.
#[tauri::command]
pub async fn set_guard(id: String, level: GuardLevel, lock: State<'_, ConnLock>) -> Result<(), String> {
    if level == GuardLevel::Verify {
        return Err("Pick Run it or Ask to confirm for the write guard.".into());
    }
    update(&lock, |all| {
        if let Some(c) = all.iter_mut().find(|c| c.id == id) {
            c.guard = level;
        }
        Ok(())
    })?;
    Ok(())
}

/// The passphrase was disabled: every connection's passphrase protection turns off (its guard stays).
pub fn clear_pass_protect() -> Result<(), String> {
    let mut all = load()?;
    if all.iter().any(|c| c.pass_protect) {
        for c in all.iter_mut() {
            c.pass_protect = false;
        }
        store(all)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conn(pass_protect: bool, protect: Option<&[&str]>) -> Conn {
        let toml = format!("id = \"x\"\nname = \"x\"\nengine = \"sqlite\"\npassProtect = {pass_protect}\n");
        let mut c: Conn = toml::from_str(&toml).unwrap();
        c.protect = protect.map(|l| l.iter().map(|s| s.to_string()).collect());
        c
    }

    #[test]
    fn protect_list_defaults_to_every_kind_in_order() {
        assert_eq!(conn(true, None).protect_list(), crate::guard::STATEMENTS.to_vec());
        assert_eq!(conn(true, Some(&["DROP", "DELETE", "NOPE"])).protect_list(), vec!["DELETE", "DROP"]);
    }

    #[test]
    fn lowering_is_switching_off_or_dropping_a_kind() {
        let on_all = conn(true, None);
        assert!(lowers_protection(&on_all, &conn(false, None)));
        assert!(lowers_protection(&on_all, &conn(true, Some(&["DROP"]))));
        assert!(!lowers_protection(&conn(true, Some(&["DROP"])), &conn(true, Some(&["DROP", "DELETE"]))));
        assert!(!lowers_protection(&conn(false, None), &conn(true, None)));
        assert!(!lowers_protection(&conn(false, Some(&["DROP"])), &conn(false, None)));
    }

    #[test]
    fn lowering_is_also_touch_id_on_or_a_longer_unlock() {
        let strict = conn(true, None);
        let touch = Conn { touch_id: true, ..conn(true, None) };
        let longer = Conn { unlock_window: Some(300), ..conn(true, None) };
        assert!(lowers_protection(&strict, &touch));
        assert!(lowers_protection(&strict, &longer));
        assert!(!lowers_protection(&touch, &strict));
        assert!(!lowers_protection(&longer, &strict));
    }
}
