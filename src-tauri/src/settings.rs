//! settings.toml. The frontend owns the shape (camelCase keys, missing = default); Rust keeps a copy
//! for what it enforces itself: the write guard's protect list, the statement timeout, the row limit,
//! history and the heartbeat.

use std::sync::RwLock;

use serde_json::{Map, Value};
use tauri::State;

use crate::guard::{GuardState, STATEMENTS};
use crate::paths::{config_dir, write_atomic};

#[derive(Default)]
pub struct SettingsState(pub RwLock<Value>);

impl SettingsState {
    fn get(&self, key: &str) -> Option<Value> {
        self.0.read().ok()?.get(key).cloned()
    }
    pub fn bool(&self, key: &str, default: bool) -> bool {
        self.get(key).and_then(|v| v.as_bool()).unwrap_or(default)
    }
    pub fn u64(&self, key: &str, default: u64) -> u64 {
        self.get(key).and_then(|v| v.as_u64()).unwrap_or(default)
    }
    /// Statement kinds the write guard asks about; every kind when the list was never changed.
    pub fn protect(&self) -> Vec<String> {
        protect_of(&self.0.read().map(|v| v.clone()).unwrap_or(Value::Null))
    }
}

fn protect_of(v: &Value) -> Vec<String> {
    match v.get("protect").and_then(|p| p.as_array()) {
        Some(list) => STATEMENTS
            .iter()
            .filter(|k| list.iter().any(|x| x.as_str() == Some(**k)))
            .map(|k| k.to_string())
            .collect(),
        None => STATEMENTS.iter().map(|k| k.to_string()).collect(),
    }
}

/// TOML has no null: drop them (a missing key is the default anyway).
fn strip_nulls(v: Value) -> Value {
    match v {
        Value::Object(m) => Value::Object(m.into_iter().filter(|(_, v)| !v.is_null()).map(|(k, v)| (k, strip_nulls(v))).collect::<Map<_, _>>()),
        Value::Array(a) => Value::Array(a.into_iter().filter(|v| !v.is_null()).map(strip_nulls).collect()),
        v => v,
    }
}

pub fn read_file() -> Result<Value, String> {
    let path = config_dir()?.join("settings.toml");
    let text = match std::fs::read_to_string(&path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Value::Object(Map::new())),
        Err(e) => return Err(format!("cannot read {}: {e}", path.display())),
    };
    let doc: toml::Table = toml::from_str(&text).map_err(|e| format!("{} is not valid TOML: {e}", path.display()))?;
    serde_json::to_value(doc).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_settings(state: State<SettingsState>) -> Result<Value, String> {
    let v = read_file()?;
    *state.0.write().map_err(|e| e.to_string())? = v.clone();
    Ok(v)
}

#[tauri::command]
pub fn save_settings(state: State<SettingsState>, guard: State<GuardState>, settings: Value) -> Result<(), String> {
    let settings = strip_nulls(settings);
    if !settings.is_object() {
        return Err("settings must be a table".into());
    }
    // What to protect is locked behind the passphrase: a change needs unlock_protect first
    if protect_of(&settings) != state.protect() && crate::keychain::has_passphrase()? && !guard.protect_unlocked() {
        return Err("What to protect is locked. Enter the passphrase to change it.".into());
    }
    let text = toml::to_string_pretty(&settings).map_err(|e| format!("cannot write settings: {e}"))?;
    let path = config_dir()?.join("settings.toml");
    // a hand-edited file that does not parse is kept beside the new one, never silently replaced
    if path.exists() && read_file().is_err() {
        let _ = std::fs::copy(&path, path.with_extension("toml.unreadable"));
    }
    write_atomic(&path, &text)?;
    *state.0.write().map_err(|e| e.to_string())? = settings;
    Ok(())
}
