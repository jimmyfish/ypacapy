# TODO: Windows build (.msi / NSIS .exe)

Status: not started. Scoped 2026-11-25.

Code work is about 2-3 days. The bigger decision is code signing (owner's call, costs money). Shares
work with `linux-build.md`: the `isMod(e)` shortcut helper, `.app-strip` padding, platform-aware copy
and the 1x/fractional pixel snapping are the same tasks. Do them once for both.

## Phase 1: the app must start

### Home folder (`src-tauri/src/paths.rs`) - blocker
- [ ] `config_dir()` (`paths.rs:11`) reads `HOME`, which Windows does not set: startup fails with
      "cannot find the home folder". Fall back to `USERPROFILE` (or use the `dirs` crate's home dir),
      giving `C:\Users\<name>\.config\ypacapy`. Keeps the one-folder design.
- [ ] Same for `expand_tilde` (`paths.rs:38`).
- [ ] The `#[cfg(unix)]` `0o700` permissions do not run on Windows. The user profile is already
      per-user by ACL, so nothing to add unless the owner wants explicit ACLs.
- [ ] `write_atomic` uses `std::fs::rename`, which replaces on Windows but can fail with a sharing
      violation when antivirus or another process holds the file open. Consider a short retry.

### Path splitting in the frontend
- [ ] Paths are split on `/` only, so Windows paths (`\`) show whole instead of the file name:
      - `src/components/Modals.tsx:606`
      - `src/components/DiagramPane.tsx:128`
      - `src/components/Home.tsx:15`
      Split on both `/` and `\` (one shared helper).

## Phase 2: secrets and auth

### Keychain (`src-tauri/src/keychain.rs`)
- [ ] Add a `#[cfg(target_os = "windows")] mod imp` backed by Windows Credential Manager. Same
      `set` / `get` / `delete` signatures; the PBKDF2 passphrase code stays as is.
- [ ] Update the stub's gate to exclude windows as well (macos, linux, windows).
- [ ] Privacy check before choosing the crate: `keyring` is believed to write with
      `CRED_PERSIST_ENTERPRISE`, which roams with domain roaming profiles. On a domain-joined laptop
      secrets could leave the device, breaking the macOS promise (items never synced off the machine).
      Verify in the crate source. If true, call Win32 `CredWriteW` directly (`windows` crate) with
      `CRED_PERSIST_LOCAL_MACHINE`.
- Keep macOS on `security-framework` (see `linux-build.md`).

### Windows Hello (`src-tauri/src/guard.rs`, `mod touchid`)
- [ ] Windows has a real Touch ID equivalent: `UserConsentVerifier` (WinRT, `windows` crate). Implement
      `available()`, `authenticate()` and `authenticate_owner()` for Windows; Hello PIN is the
      fallback when there is no biometric.
- [ ] With `authenticate_owner` working, "reset the passphrase" (`guard.rs:586`) works in-app, unlike
      Linux. Owner approves any change to what the passphrase guards.
- [ ] UI copy: "Touch ID" becomes "Windows Hello" on Windows.

## Phase 3: shared UI work (see `linux-build.md`)
- [ ] `isMod(e)` helper: Ctrl instead of Cmd for the 22 `metaKey` checks; `Ctrl+` instead of the 47
      `⌘` labels. Close tab / close window need JS handlers (the native menu is macOS-only).
- [ ] Native window decorations; `.app-strip { padding-left: 84px }` (`src/App.css:16`) to 0.
      Use `src-tauri/tauri.windows.conf.json` for Windows-only config.
- [ ] Copy: "Finder" becomes "Explorer", "Keychain" becomes "Credential Manager", "this Mac" becomes
      "this PC".

### Rendering
- WebView2 is Chromium, same engine as Brave, so Brave previews are close to what ships.
- `system-ui` becomes Segoe UI. Chromium ignores `ui-monospace`; the mono stack falls through to
  Consolas, which is already listed (`src/tokens.css:7`, `:123`). Bundled fonts from the Linux TODO
  would make it match macOS more closely.
- [ ] 125% / 150% display scaling is the default on most Windows laptops, so the half-pixel snapping
      from `linux-build.md` (2.5px offsets, 1.5px borders and rings) matters more here. Target it with
      a resolution media query and preview in `.hallmark` first.

## Phase 4: signing and CI

### Code signing - owner decision
- [ ] Unsigned .msi / .exe gets SmartScreen's "Windows protected your PC" warning; managed company
      machines often block unsigned installers outright. There is no free ad-hoc option like macOS
      `signingIdentity: "-"`. Options:
      - Azure Trusted Signing (about $10/month)
      - OV/EV code-signing certificate (a few hundred dollars a year)
      - Ship unsigned and document the SmartScreen "More info > Run anyway" step

### CI (`.github/workflows/release.yml`)
- [ ] Add a `windows-latest` job building NSIS and/or MSI. `ring` and the bundled SQLite build fine
      with MSVC. Expect slower builds than macOS.
- [ ] Serialize it with the other platform jobs: each merges its entry into the release's
      `latest.json`.
- [ ] Updater supports NSIS and MSI out of the box. WebView2 ships with Windows 10/11; keep the
      default bootstrapper for older installs.

## Testing
- Windows 11 VM (UTM on the Mac runs the ARM build; also test an x64 machine) at 100%, 125% and 150%
  scaling.
- Test on a domain-joined machine if possible, for Credential Manager roaming and SmartScreen policy.

## Already fine on Windows
Database drivers (rustls, no OpenSSL), system font listing (`fonts.rs`), Lucide SVG icons, the
updater signature (minisign key is cross-platform).
