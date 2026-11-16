//! Where ypacapy keeps its files: `~/.config/ypacapy`, on macOS too (not Application Support),
//! so the one folder is easy to find, back up and remove.

use std::path::{Path, PathBuf};

pub fn config_dir() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .ok_or("cannot find the home folder")?;
    let dir = home.join(".config").join("ypacapy");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create {}: {e}", dir.display()))?;
        // connection details are private to the user even without passwords
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700));
        }
    }
    Ok(dir)
}

/// Writes through a temp file and a rename, so a crash never leaves half a file.
pub fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, contents).map_err(|e| format!("cannot write {}: {e}", tmp.display()))?;
    std::fs::rename(&tmp, path).map_err(|e| format!("cannot write {}: {e}", path.display()))
}

/// `~/x` to an absolute path; anything else as typed.
pub fn expand_tilde(p: &str) -> PathBuf {
    if let Some(rest) = p.strip_prefix("~/") {
        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }
    PathBuf::from(p)
}

#[tauri::command]
pub fn config_path() -> Result<String, String> {
    Ok(config_dir()?.to_string_lossy().into_owned())
}

/// Export: the frontend picks the path with the save dialog, Rust writes the text.
#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || std::fs::write(&path, contents).map_err(|e| format!("cannot write {path}: {e}")))
        .await
        .map_err(|e| e.to_string())?
}
