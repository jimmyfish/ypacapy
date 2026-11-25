# TODO: Linux build (.deb and .rpm)

Status: not started. Scoped 2026-11-25.

The macOS-only code is already behind `cfg(target_os = "macos")`, so a Linux build compiles today, but
secrets, shortcuts, window chrome and copy are Mac-shaped. Estimate: 2-4 days plus testing on a real
Linux box. Suggested order: phase 1 gives a usable build, phase 2 polishes it.

## Phase 1: usable build

### Keychain (`src-tauri/src/keychain.rs`)
- [ ] Add `#[cfg(target_os = "linux")] mod imp` using the `keyring` crate (Secret Service over D-Bus).
      Same `set` / `get` / `delete` signatures; the PBKDF2 passphrase code above stays as is.
- [ ] Change the stub's gate to `#[cfg(not(any(target_os = "macos", target_os = "linux")))]`.
- [ ] Add `keyring` under `[target.'cfg(target_os = "linux")'.dependencies]` in `src-tauri/Cargo.toml`.
- [ ] No Secret Service daemon (gnome-keyring / KWallet missing, e.g. minimal WMs): show a clear error.
      Never fall back to storing secrets in a file.
- Keep macOS on `security-framework`. Do not move macOS to `keyring`: the current code is tested and
  sets `set_access_synchronized(Some(false))` so items never reach iCloud Keychain.

### Keyboard shortcuts
- [ ] Add one `isMod(e)` helper (`metaKey` on macOS, `ctrlKey` elsewhere) and use it in place of the
      22 `metaKey` checks in `src/` (App.tsx, Home.tsx, CollectionPane.tsx, KeyPane.tsx, ResultGrid.tsx,
      DiagramPane.tsx, ...).
- [ ] The native menu is macOS-only (`src-tauri/src/lib.rs`, `mod menu`), so close tab and close window
      need JS key handlers on Linux.

### Window chrome
- [ ] `titleBarStyle: "Overlay"` and `trafficLightPosition` in `src-tauri/tauri.conf.json` only apply on
      macOS; Linux gets native decorations. Keep native decorations (no custom window buttons).
- [ ] `.app-strip { padding-left: 84px }` (`src/App.css:16`) leaves an empty gap on Linux: set it to 0
      there.
- [ ] If Linux needs other config, use a `src-tauri/tauri.linux.conf.json` override.

### CI and packaging (`.github/workflows/release.yml`)
- [ ] Add a Linux job on `ubuntu-22.04`. Apt deps: `libwebkit2gtk-4.1-dev librsvg2-dev patchelf`.
      Build with `--bundles deb,rpm`.
- [ ] Run it serialized with the macOS jobs (or after them): every build merges its entry into the
      release's `latest.json`, and two at once overwrite each other.
- [ ] Updater: we are on `tauri-plugin-updater` 2.14.1. Older versions only updated AppImage; recent
      ones are believed to install .deb / .rpm through pkexec. Verify with a throwaway release.

## Phase 2: polish

### Passphrase reset (`src-tauri/src/guard.rs`)
- [ ] Touch ID already falls back to the passphrase on Linux (`touchid::available()` is false).
- [ ] `touchid::authenticate_owner` (used by "reset the passphrase", `guard.rs:586`) always errors on
      Linux, so a forgotten passphrase cannot be reset in-app. Options: polkit (`pkexec` / `pkcheck`),
      or reset by deleting the keyring item. Owner decides: passphrase scope changes need approval.

### Copy
- [ ] About 30 UI strings mention "Finder", "Keychain", "Touch ID" or "this Mac". Make them
      platform-aware. 47 `⌘` labels should read `Ctrl+` on Linux.

### Rendering on 1x screens (preview in `.hallmark` first, `src/` after owner approval)
- [ ] Half-pixel values tuned for 2x blur or round on 1x screens:
      - `src/styles.css:9`, `:140`: 2.5px optical offset on `.tab-add` / `.side-toggle`
      - `src/App.css:52`: `.ptab--project` active ring, `inset 0 0 0 1.5px`
      - `src/styles.css:669`: 1.5px border
      - `src/styles.css:222`: 1.5px underline
      Fix: one `@media (max-resolution: 1.5dppx)` block that snaps them to whole pixels; retina unchanged.
- [ ] Fonts: `system-ui` / `ui-monospace` (`src/tokens.css:6-7`, `:123`) resolve through fontconfig to
      DejaVu, Cantarell, Noto, ... and metrics change per distro (DejaVu runs wide). WebKitGTK may not
      know `ui-monospace` at all. Bundle a default pair (e.g. Inter + JetBrains Mono, both OFL) at the
      front of the stack; users can still pick their own in settings.
- [ ] `-webkit-font-smoothing: antialiased` (`src/base.css:4`) is ignored on Linux; text follows the
      user's fontconfig hinting and often looks heavier.

### Known WebKitGTK issues (not fixable in CSS)
- GNOME fractional scaling (1.25x / 1.5x) can render the whole window blurry.
- Some NVIDIA / Wayland setups show a blank window: `WEBKIT_DISABLE_DMABUF_RENDERER=1`.
- Big result grids may scroll slower than in WKWebView.

## Testing
- Brave DevTools device emulation at DPR 1 shows pixel snapping, not Linux font rendering.
- Real check: Ubuntu VM (UTM on the Mac) at 1x, plus a Fedora VM for the .rpm.

## Already fine on Linux
`~/.config/ypacapy` paths and `0o700` permissions (`paths.rs`), system font listing (`fonts.rs`,
`load_system_fonts`), all database drivers (rustls), Lucide SVG icons.
