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
        std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
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
    std::fs::write(&tmp, contents).map_err(|e| format!("Could not write {}: {e}", tmp.display()))?;
    std::fs::rename(&tmp, path).map_err(|e| format!("Could not write {}: {e}", path.display()))
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
    tokio::task::spawn_blocking(move || std::fs::write(&path, contents).map_err(|e| format!("Could not write {path}: {e}")))
        .await
        .map_err(|e| e.to_string())?
}

/// Export: an image the frontend drew (PNG or JPG, base64), written where the save dialog said.
#[tauri::command]
pub async fn write_binary_file(path: String, base64: String) -> Result<(), String> {
    let bytes = decode_base64(&base64).ok_or("The image data is not valid base64")?;
    tokio::task::spawn_blocking(move || std::fs::write(&path, bytes).map_err(|e| format!("Could not write {path}: {e}")))
        .await
        .map_err(|e| e.to_string())?
}

/// Standard base64 (RFC 4648, padding optional); None on any other character.
fn decode_base64(s: &str) -> Option<Vec<u8>> {
    fn val(c: u8) -> Option<u32> {
        match c {
            b'A'..=b'Z' => Some(u32::from(c - b'A')),
            b'a'..=b'z' => Some(u32::from(c - b'a') + 26),
            b'0'..=b'9' => Some(u32::from(c - b'0') + 52),
            b'+' => Some(62),
            b'/' => Some(63),
            _ => None,
        }
    }
    let s = s.trim_end_matches('=').as_bytes();
    let mut out = Vec::with_capacity(s.len() * 3 / 4);
    let (mut acc, mut bits) = (0u32, 0u32);
    for &c in s {
        acc = (acc << 6) | val(c)?;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((acc >> bits) as u8);
            acc &= (1 << bits) - 1;
        }
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::decode_base64;

    #[test]
    fn base64() {
        assert_eq!(decode_base64("aGVsbG8=").unwrap(), b"hello");
        assert_eq!(decode_base64("aGVsbG8gd29ybGQ").unwrap(), b"hello world");
        assert_eq!(decode_base64("").unwrap(), b"");
        assert_eq!(decode_base64("/+8A").unwrap(), [0xff, 0xef, 0x00]);
        assert!(decode_base64("a b").is_none());
    }
}
