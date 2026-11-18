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
    Mongo,
}

impl Engine {
    pub fn label(self) -> &'static str {
        match self {
            Engine::Postgres => "PostgreSQL",
            Engine::Mysql => "MySQL",
            Engine::Sqlite => "SQLite",
            Engine::Mongo => "MongoDB",
        }
    }
}

/// MongoDB TLS. Missing = on for an SRV record (Atlas requires it), off for a host and port.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum MongoTls {
    Off,
    On,
    /// on, without checking the server's certificate or host name
    Insecure,
}

/// A connection's security level, picked in its Options or the tabs bar. None runs every statement;
/// Low asks to confirm the statements in `protect`; Strict asks for the passphrase for them (or Touch ID
/// when the connection allows it) and needs a passphrase set. A connection that never had one is None,
/// the same as DEFAULT_LEVEL in src/types.ts.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "lowercase")]
pub enum SecurityLevel {
    #[default]
    None,
    Low,
    Strict,
}

/// connections.toml before security levels: the write guard. Read once by load(), never written.
#[derive(Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum LegacyGuard {
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
    /// Home groups connections under this name; missing = ungrouped
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
    #[serde(default)]
    pub level: SecurityLevel,
    /// Before security levels: the write guard and Protect with passphrase. load() turns them into
    /// `level` and drops them; never written.
    #[serde(default, skip_serializing)]
    pub guard: Option<LegacyGuard>,
    #[serde(default, skip_serializing)]
    pub pass_protect: bool,
    /// Low and Strict: the statements they ask about; missing = every kind
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub protect: Option<Vec<String>>,
    /// Strict: Touch ID may stand in for the passphrase
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub touch_id: bool,
    /// Strict: seconds this connection stays unlocked after the passphrase; missing or 0 asks every time
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
    /// MongoDB: the database the user is defined in; missing = admin
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth_source: Option<String>,
    /// MongoDB: host is a DNS seed list name (mongodb+srv), so there is no port
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub srv: bool,
    /// MongoDB TLS; the CA file is ssl_ca
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tls: Option<MongoTls>,
    /// MongoDB: a PEM file with the client certificate and its key, for X.509 sign-in
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tls_cert: Option<String>,
    /// MongoDB: the replica set name; missing = read from the server
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub replica_set: Option<String>,
    /// MongoDB read preference: primary, primaryPreferred, secondary, secondaryPreferred, nearest; missing = primary
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub read_pref: Option<String>,
    /// MongoDB: talk to this host only, not the rest of its replica set
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub direct: bool,
    /// MongoDB: seconds between the driver's hello to each host while connected; missing = 60. The driver
    /// cannot stop checking, so this only makes it rarer.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server_check: Option<u32>,
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
    /// What to protect, in STATEMENTS order (MONGO_KINDS for MongoDB); every kind when the list was never changed.
    pub fn protect_list(&self) -> Vec<&'static str> {
        let all: &[&'static str] = if self.engine == Engine::Mongo { &crate::guard::MONGO_KINDS } else { &crate::guard::STATEMENTS };
        all.iter().copied().filter(|k| self.protect.as_ref().is_none_or(|l| l.iter().any(|x| x == k))).collect()
    }
}

/// Whether going from `old` to `new` weakens a Strict connection: a lower level, dropping a statement,
/// letting Touch ID stand in, or staying unlocked longer. Only Strict is locked behind the passphrase.
fn lowers_protection(old: &Conn, new: &Conn) -> bool {
    if old.level != SecurityLevel::Strict {
        return false;
    }
    let kept = new.protect_list();
    new.level != SecurityLevel::Strict
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
    // files from before security levels: the write guard and Protect with passphrase become one level
    if all.iter().any(|c| c.guard.is_some() || c.pass_protect) {
        let has_pass = keychain::has_passphrase().unwrap_or(false);
        // the oldest files kept What to protect app-wide, in settings.toml
        let app_list = crate::settings::read_file().ok().and_then(|v| v.get("protect").and_then(|p| p.as_array()).map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect::<Vec<_>>()));
        for c in all.iter_mut().filter(|c| c.guard.is_some() || c.pass_protect) {
            to_level(c, has_pass, &app_list);
        }
        store(all.clone())?;
    }
    Ok(all)
}

/// One connection from before security levels: Ask for passphrase or Protect with passphrase becomes
/// Strict (Low without a passphrase, as it already acted), Ask to confirm becomes Low with every
/// statement (it asked before every write), Run it becomes None.
fn to_level(c: &mut Conn, has_pass: bool, app_list: &Option<Vec<String>>) {
    let verify = c.guard == Some(LegacyGuard::Verify);
    if verify && c.protect.is_none() {
        c.protect = app_list.clone();
    }
    c.level = if (c.pass_protect || verify) && has_pass {
        SecurityLevel::Strict
    } else if c.pass_protect || verify {
        SecurityLevel::Low
    } else if c.guard == Some(LegacyGuard::Confirm) {
        c.protect = None;
        SecurityLevel::Low
    } else {
        SecurityLevel::None
    };
    c.guard = None;
    c.pass_protect = false;
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
    conn.group = clean_group(conn.group.take());
    if conn.name.is_empty() {
        return Err("Give the connection a name so you can find it again".into());
    }
    if conn.engine == Engine::Sqlite && conn.file.as_deref().is_none_or(|f| f.trim().is_empty()) {
        return Err("Choose the database file".into());
    }
    let is_new = conn.id.is_empty();
    if is_new {
        conn.id = new_id();
        conn.created_at = Some(now_ms());
    }
    let has_pass = tokio::task::spawn_blocking(keychain::has_passphrase).await.map_err(|e| e.to_string())??;
    if conn.level == SecurityLevel::Strict && !has_pass {
        return Err("Strict needs a passphrase. Set one in Settings › Security.".into());
    }
    // weakening a Strict connection needs it opened with the passphrase first (unlock_protect)
    if !is_new && has_pass && !guard.protect_unlocked() {
        if let Ok(old) = find(&conn.id) {
            if lowers_protection(&old, &conn) {
                return Err("Strict is locked. Use Change and enter the passphrase to lower it.".into());
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
            Some(c) => *c = Conn { last_opened: c.last_opened, created_at: c.created_at, ..conn },
            None => all.push(conn),
        }
        Ok(())
    })?;
    Ok(saved)
}

#[tauri::command]
pub async fn delete_connection(id: String, lock: State<'_, ConnLock>, store: State<'_, crate::store::LocalStore>) -> Result<(), String> {
    let account = keychain::conn_account(&id);
    tokio::task::spawn_blocking(move || keychain::delete(&account)).await.map_err(|e| e.to_string())??;
    update(&lock, |all| {
        all.retain(|c| c.id != id);
        Ok(())
    })?;
    // its query history goes with it; saved queries stay
    store.forget_history(&id).await
}

/// A group name as stored: trimmed, and None when that leaves nothing.
fn clean_group(g: Option<String>) -> Option<String> {
    g.map(|g| g.trim().to_string()).filter(|g| !g.is_empty())
}

/// Moves connections into a group, or out of every group with None. Renaming or ungrouping a group
/// is this with all of its connections.
#[tauri::command]
pub fn set_group(ids: Vec<String>, group: Option<String>, lock: State<'_, ConnLock>) -> Result<(), String> {
    let group = clean_group(group);
    update(&lock, |all| {
        for c in all.iter_mut().filter(|c| ids.contains(&c.id)) {
            c.group = group.clone();
        }
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

/// Changes a connection's security level (the tabs bar). Strict needs a passphrase set; lowering it from
/// Strict needs the passphrase, or Touch ID when the connection allows it.
#[tauri::command]
pub async fn set_level(id: String, level: SecurityLevel, approval: Option<crate::guard::Approval>, lock: State<'_, ConnLock>) -> Result<(), String> {
    let cur = find(&id)?;
    if cur.level == level {
        return Ok(());
    }
    let has_pass = tokio::task::spawn_blocking(keychain::has_passphrase).await.map_err(|e| e.to_string())??;
    if level == SecurityLevel::Strict && !has_pass {
        return Err("Strict needs a passphrase. Set one in Settings › Security.".into());
    }
    if cur.level == SecurityLevel::Strict && has_pass {
        crate::guard::approve_lowering(&cur, approval).await?;
    }
    update(&lock, |all| {
        if let Some(c) = all.iter_mut().find(|c| c.id == id) {
            c.level = level;
        }
        Ok(())
    })?;
    Ok(())
}

/// The passphrase was disabled: Strict connections become Low, so they still ask before the same statements.
pub fn strict_to_low() -> Result<(), String> {
    let mut all = load()?;
    if all.iter().any(|c| c.level == SecurityLevel::Strict) {
        for c in all.iter_mut().filter(|c| c.level == SecurityLevel::Strict) {
            c.level = SecurityLevel::Low;
        }
        store(all)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conn(strict: bool, protect: Option<&[&str]>) -> Conn {
        let level = if strict { "strict" } else { "low" };
        let toml = format!("id = \"x\"\nname = \"x\"\nengine = \"sqlite\"\nlevel = \"{level}\"\n");
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
    fn old_guards_become_levels_never_weaker() {
        let old = |extra: &str| -> Conn { toml::from_str(&format!("id = \"x\"\nname = \"x\"\nengine = \"sqlite\"\n{extra}")).unwrap() };
        let level = |extra: &str, has_pass: bool| {
            let mut c = old(extra);
            to_level(&mut c, has_pass, &None);
            (c.level, c.protect, c.guard, c.pass_protect)
        };
        assert_eq!(level("guard = \"run\"\n", true).0, SecurityLevel::None);
        assert_eq!(level("guard = \"confirm\"\nprotect = [\"DROP\"]\n", true), (SecurityLevel::Low, None, None, false));
        assert_eq!(level("guard = \"run\"\npassProtect = true\nprotect = [\"DROP\"]\n", true).0, SecurityLevel::Strict);
        assert_eq!(level("guard = \"run\"\npassProtect = true\n", false).0, SecurityLevel::Low);
        assert_eq!(level("guard = \"verify\"\n", true).0, SecurityLevel::Strict);
        // written back without the old keys
        let mut c = old("guard = \"confirm\"\npassProtect = true\n");
        to_level(&mut c, true, &None);
        let text = toml::to_string(&c).unwrap();
        assert!(text.contains("level = \"strict\"") && !text.contains("guard") && !text.contains("passProtect"));
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

    #[test]
    fn group_is_trimmed_and_blank_is_none() {
        assert_eq!(clean_group(Some("  prod ".into())), Some("prod".into()));
        assert_eq!(clean_group(Some("   ".into())), None);
        assert_eq!(clean_group(None), None);
        // stored only when set
        let mut c = conn(false, None);
        assert!(!toml::to_string(&c).unwrap().contains("group"));
        c.group = Some("prod".into());
        assert!(toml::to_string(&c).unwrap().contains("group = \"prod\""));
    }
}
