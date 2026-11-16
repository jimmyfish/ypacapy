//! System font discovery for the settings dialog. The webview cannot list
//! installed fonts itself, so Rust scans the OS font directories once.

use std::collections::BTreeSet;

use serde::Serialize;

#[derive(Serialize)]
pub struct FontList {
    /// Every installed family, sorted and de-duplicated.
    all: Vec<String>,
    /// Families with at least one monospaced face.
    mono: Vec<String>,
}

#[tauri::command]
pub async fn list_fonts() -> FontList {
    // Scanning reads every font file header; keep it off the main thread.
    tauri::async_runtime::spawn_blocking(scan)
        .await
        .unwrap_or_else(|_| FontList { all: vec![], mono: vec![] })
}

fn scan() -> FontList {
    let mut db = fontdb::Database::new();
    db.load_system_fonts();

    let mut all = BTreeSet::new();
    let mut mono = BTreeSet::new();
    for face in db.faces() {
        // The first entry is the English (US) name when the font has one.
        let Some((name, _)) = face.families.first() else { continue };
        // Hidden system faces (".SF NS", ".AppleSystemUIFont") are not selectable by name.
        if name.is_empty() || name.starts_with('.') {
            continue;
        }
        if face.monospaced || named_mono(name) {
            mono.insert(name.clone());
        }
        all.insert(name.clone());
    }
    FontList {
        all: all.into_iter().collect(),
        mono: mono.into_iter().collect(),
    }
}

/// Some monospaced fonts (ligature fonts, many Nerd Font builds) do not set the
/// fixed-pitch flag, so also trust a "Mono" word in the name ("Dank Mono",
/// "JetBrainsMono Nerd Font") without matching "Monotype".
fn named_mono(name: &str) -> bool {
    let lower = name.to_lowercase();
    if lower.contains("inconsolata") || lower.contains("consolas") {
        return true;
    }
    name.match_indices("Mono")
        .any(|(i, m)| !name[i + m.len()..].starts_with(|c: char| c.is_ascii_lowercase()))
}

#[cfg(test)]
mod tests {
    #[test]
    fn finds_installed_fonts() {
        let list = super::scan();
        assert!(!list.all.is_empty(), "no system fonts found");
        assert!(list.mono.iter().all(|m| list.all.contains(m)));
    }

    #[test]
    fn mono_names() {
        use super::named_mono;
        assert!(named_mono("Dank Mono"));
        assert!(named_mono("JetBrainsMono Nerd Font"));
        assert!(named_mono("Inconsolata"));
        assert!(!named_mono("Monotype Corsiva"));
        assert!(!named_mono("Helvetica Neue"));
    }
}
