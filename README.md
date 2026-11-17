# ypacapy

A local-only database explorer for macOS. Connect to PostgreSQL, MySQL/MariaDB or SQLite, browse schemas, write SQL, and edit rows, with a write guard that asks before a statement changes anything.

The name is a palindrome of "capy", for capybara.

Built with [Tauri 2](https://v2.tauri.app/) (Rust) and React + TypeScript.

## Features

- **Three engines, one driver family.** PostgreSQL, MySQL/MariaDB and SQLite through `sqlx`. Column types come from each driver's own result metadata.
- **Quiet by design.** ypacapy runs only catalog lookups and limited reads on its own. Everything else is SQL you typed. Row counts in the tree are planner estimates (`pg_class.reltuples`, `information_schema.TABLES.TABLE_ROWS`), never `count(*)`. Nothing polls the server. The optional heartbeat is off by default.
- **Home.** Connections as coloured tiles, in named groups you can fold, rename or ungroup. `⌘F` finds a connection.
- **Schema tree.** Databases, schemas, tables, views, materialized views, foreign tables and functions. Each schema loads when you expand it and stays cached until Refresh.
- **SQL console.**
  - `⌘↵` runs the whole editor and `⇧⌘↵` runs only the selection.
  - Autocomplete for tables, aliases and columns. It reads the schema tree you already loaded and one catalog read per table.
  - Format (via `sql-formatter`) and `⌘/` to comment lines. Both stay on the native undo stack.
  - A run can be cancelled. Cancel and the statement timeout ask the server to stop (`pg_cancel_backend`, `KILL QUERY`).
  - Errors are shown as the database's own client prints them, with `LINE n:` and a caret.
- **Row limit.** Settings › Queries › Row limit is added to a query that has no `LIMIT` of its own. When a limit cannot be added, ypacapy keeps at most 10,000 rows of a result set.
- **Result grid.** Sort, frozen key columns, typed cells (numbers, timestamps, booleans, JSON, bytes), a cell inspector, and copy with `⌘C`. Export rows as CSV, JSON, Markdown table or plain text.
- **Inline editing.** A result that reads one table plainly, with its full primary key, can be edited in place. Changes wait until Save (`⌘S`). Save writes them in one transaction, one `UPDATE` or `DELETE` per row, each keyed by the primary key. If any statement changes more or fewer than one row, nothing is kept.
- **Table view.** A table tab shows its rows with a `WHERE` filter and paging, plus its columns, indexes and foreign keys from the catalog.
- **Tabs that come back.** Each connection's open tabs, including unsaved SQL, are restored the next time you open it. Tabs are coloured by connection.
- **History and saved queries.** History is kept per connection (the last 2,000 runs, searchable). Saved queries are kept in folders.
- **Themes and fonts.** ypacapy Light/Dark plus built-in schemes (Ayu, Atom One and others), compact mode, and separate UI, table and code fonts picked from the fonts installed on your Mac.
- **In-app updates.** Signed updates from GitHub Releases, shown in the title-strip update chip and the About dialog with the release notes.

## The write guard

Each connection has a **security level**. You set it in the connection's Options or from the tabs bar.

| Level  | What happens before a protected statement                                   |
| ------ | --------------------------------------------------------------------------- |
| None   | It runs.                                                                    |
| Low    | ypacapy asks you to confirm.                                                |
| Strict | ypacapy asks for the app passphrase, or Touch ID when the connection allows it. |

- **What to protect** picks the statement kinds a level asks about: `INSERT`, `UPDATE`, `DELETE`, `REPLACE` (MySQL), `ALTER`, `DROP`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`. `SELECT` never asks.
- Statements are classified from the parsed SQL (`sqlparser`), including statements nested in CTEs and `EXPLAIN ANALYZE`. If the dialect cannot parse the text, the tokenizer splits it at top-level semicolons and the leading keywords decide. Text that cannot be tokenized counts as unreadable, so ypacapy asks.
- A Strict connection can stay unlocked for its own time window after the passphrase. Unlocking one connection never unlocks another.
- Lowering a Strict connection needs the passphrase (or Touch ID, when that connection allows it).
- Strict needs a passphrase, set in Settings › Security. If you disable the passphrase, Strict connections become Low.
- Forgot the passphrase? The Mac's owner (Touch ID or the login password) can set a new one. The old one cannot be shown, because only its hash is stored.

## Where your data lives

Everything stays on your Mac.

| What                                            | Where                                                      |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Settings                                        | `~/.config/ypacapy/settings.toml`                          |
| Connections (no passwords)                      | `~/.config/ypacapy/connections.toml`                       |
| History, saved queries, open tabs               | `~/.config/ypacapy/ypacapy.db` (SQLite)                    |
| Connection passwords, passphrase hash (PBKDF2)  | macOS login keychain, service `ypacapy`, not synchronizable |

The config folder is created with mode `0700`. Files are written through a temp file and a rename. Keychain items are marked not synchronizable, so iCloud Keychain never copies them off the Mac. To see the folder, open Settings › Data on this Mac › Show in Finder.

## Install

Download the `.dmg` for your Mac (Apple silicon or Intel) from the [latest release](https://github.com/jimmyfish/ypacapy/releases/latest).

The app is ad-hoc signed (no Apple Developer ID). After the first install, clear the quarantine flag:

```sh
xattr -cr /Applications/ypacapy.app
```

Updates installed by the app itself do not need this step.

## Build from source

Requirements:

- macOS
- [Bun](https://bun.sh/)
- Rust (stable), via [rustup](https://rustup.rs/)
- Xcode Command Line Tools

```sh
bun install
bun tauri dev        # run with hot reload (Vite on http://localhost:1420)
bun tauri build      # release bundle in src-tauri/target/release/bundle
bun run typecheck    # TypeScript only
```

Dev builds (`bun tauri dev` and `bun tauri build --debug`) never check for updates, so a GitHub release never replaces them. They show their git state (commit, branch, tag, dirty) instead.

Rust tests that need outside resources are marked `#[ignore]`:

```sh
cd src-tauri
cargo test                 # unit tests
cargo test -- --ignored    # also the keychain test and the PostgreSQL tests (local server on localhost:5432 that lets $USER in)
```

## Keyboard shortcuts

| Keys    | Action                                                     |
| ------- | ---------------------------------------------------------- |
| `⌘T`    | New query tab                                              |
| `⌘W`    | Close tab (`⇧⌘W` closes the window)                        |
| `⌘↵`    | Run the whole editor (in a table tab: re-read the rows)    |
| `⇧⌘↵`   | Run the selection                                          |
| `⌘S`    | Save the query, or save the grid's pending edits           |
| `⌘/`    | Toggle `--` comments on the selected lines                 |
| `⌘\`    | Show or hide the sidebar                                   |
| `⌘F`    | Find a connection (Home)                                   |
| `⌘,`    | Settings                                                   |
| `⌘C`    | Copy the selected cell                                     |
| `↵` / `F2` | Edit the selected cell                                  |
| `⌘⌫`    | Delete or restore the selected row                         |

## Releasing

Releases are built by GitHub Actions from version tags.

1. Bump the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
2. Add a `## [x.y.z] - YYYY-MM-DD` section to `CHANGELOG.md`. Use `- **Lead.** detail` bullets, because the app shows each bold lead as one line of the release notes.
3. Commit, then tag and push: `git tag vx.y.z && git push origin vx.y.z`.
4. `.github/workflows/release.yml` creates a draft release with that CHANGELOG section as its notes. It builds `aarch64-apple-darwin` and `x86_64-apple-darwin`, and uploads the bundles and `latest.json`.
5. Publish the draft by hand. Until you do, installed copies keep seeing the previous release.

Change release notes in `CHANGELOG.md` before tagging. Notes edited on the draft reach the release page, but they do not reach `latest.json`, which the app reads.

The workflow needs two repository secrets: `TAURI_SIGNING_PRIVATE_KEY` (contents of `~/.tauri/ypacapy.key`) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. `.github/workflows/cache.yml` keeps a Rust dependency cache on `master` for release runs to restore.

## Project layout

```
src/                 React frontend
  components/        Home, Sidebar, QueryPane, SqlEditor, ResultGrid, TablePane, Modals, ...
  lib/               SQL helpers, autocomplete, edit statements, themes, updater
  store.ts           app state (zustand)
  types.ts           shared types, mirrored by the Rust structs
src-tauri/src/       Rust backend (Tauri commands)
  db.rs              connection pools, catalog reads, run_query, apply_edits, heartbeat
  guard.rs           statement classification, security levels, passphrase, Touch ID
  conns.rs           connections.toml
  store.rs           ypacapy.db: history, saved queries, workspaces
  keychain.rs        macOS keychain
  settings.rs        settings.toml
  fonts.rs           installed font discovery
.github/workflows/   release and cache pipelines
```

Contributors and coding agents: see [AGENTS.md](AGENTS.md) for how to use the graphify knowledge graph in `graphify-out/`.
