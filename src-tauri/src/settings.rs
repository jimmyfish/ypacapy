//! settings.toml. The frontend owns the shape (camelCase keys, missing = default); Rust keeps a copy
//! for what it enforces itself: the statement timeout, the row limit, history and the heartbeat.
//! Passphrase protection is per connection (connections.toml); only the passphrase itself is app-wide.

use std::sync::RwLock;

use serde_json::{Map, Value};
use tauri::State;

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
        Err(e) => return Err(format!("Could not read {}: {e}", path.display())),
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

/// Saves settings.toml. Lowering Settings > Security > Default security level from Strict needs the passphrase,
/// as lowering a connection does (there is no connection here, so no Touch ID).
#[tauri::command]
pub async fn save_settings(state: State<'_, SettingsState>, settings: Value, approval: Option<crate::guard::Approval>) -> Result<(), String> {
    let settings = strip_nulls(settings);
    if !settings.is_object() {
        return Err("Settings must be a table".into());
    }
    let strict = |v: &Value| v.get("defaultLevel").and_then(|l| l.as_str()) == Some("strict");
    let old = state.0.read().map_err(|e| e.to_string())?.clone();
    let lowers = strict(&old) && !strict(&settings);
    if lowers && tokio::task::spawn_blocking(crate::keychain::has_passphrase).await.map_err(|e| e.to_string())?? {
        crate::guard::approve_default_lowering(approval).await?;
    }
    let text = toml::to_string_pretty(&settings).map_err(|e| format!("Could not write settings: {e}"))?;
    let path = config_dir()?.join("settings.toml");
    // a hand-edited file that does not parse is kept beside the new one, never silently replaced
    if path.exists() && read_file().is_err() {
        let _ = std::fs::copy(&path, path.with_extension("toml.unreadable"));
    }
    write_atomic(&path, &text)?;
    *state.0.write().map_err(|e| e.to_string())? = settings;
    Ok(())
}
