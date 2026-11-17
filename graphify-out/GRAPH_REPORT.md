# Graph Report - ypacapy  (2026-11-17)

## Corpus Check
- 43 files · ~66,836 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 787 nodes · 1611 edges · 55 communities (38 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1548293a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Modals.tsx
- State
- Hallmark Preview Screens
- conns.rs
- Query Executor Types
- NPM Dependencies
- Result Grid Icons
- SQL Parser Dependencies
- Async Pool Primitives
- App.tsx
- keychain.rs
- Sidebar Icons and Cells
- Query and Table Panes
- New Connection Preview
- Tauri App Config
- TabsBar.tsx
- DB Catalog and Execute
- Engine Connect Helpers
- .get
- TypeScript Config
- Native Menu
- Statement Classifier
- Passphrase sub-dialogs (set, change, disable, unlock)
- Font Discovery
- Write Guard State
- Passphrase Auth Commands
- Tauri Capabilities
- Agent Graph Workflow
- themes.ts
- run_query
- App Icon
- types.ts
- Cargo Crate
- Exec
- QueryPane.tsx
- store.ts
- Modals
- Home.tsx
- AppearancePane
- .stream
- Approval
- classify_stmt

## God Nodes (most connected - your core abstractions)
1. `State` - 35 edges
2. `useStore` - 30 edges
3. `SettingsState` - 17 edges
4. `useCurrent()` - 16 edges
5. `GuardState` - 15 edges
6. `compilerOptions` - 15 edges
7. `LocalStore` - 14 edges
8. `ConnectModal()` - 14 edges
9. `ResultGrid()` - 14 edges
10. `Pool` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AppearancePane()` --implements--> `Settings Appearance pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `QueriesPane()` --implements--> `Settings Queries pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `SecurityPane()` --implements--> `Settings Security pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `settings.html (Settings design preview)` --conceptually_related_to--> `SettingsModal()`  [INFERRED]
  .hallmark/preview/settings.html → src/components/Modals.tsx
- `TablePane()` --implements--> `table.html (Table design preview)`  [INFERRED]
  src/components/TablePane.tsx → .hallmark/preview/table.html

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`
- 2-file cycle: `src-tauri/src/guard.rs -> src-tauri/src/settings.rs -> src-tauri/src/guard.rs`

## Hyperedges (group relationships)
- **Settings dialog panes** — hallmark_preview_settings_appearance_pane, hallmark_preview_settings_queries_pane, hallmark_preview_settings_security_pane, hallmark_preview_settings_data_on_this_mac_pane [EXTRACTED 1.00]
- **Table tab views (rows under filter, columns, indexes and keys)** — hallmark_preview_table_where_filter, hallmark_preview_table_rows_view, hallmark_preview_table_columns_view, hallmark_preview_table_indexes_view [EXTRACTED 1.00]
- **Preview screen navigation (Home, Query, New connection via tabs strip)** — hallmark_preview_home, hallmark_preview_index, hallmark_preview_connect, hallmark_preview_home_connection_tabs_strip [EXTRACTED 1.00]
- **Query run state flow (run, error fix, reconnect, render)** — hallmark_preview_index_runquery, hallmark_preview_index_render, hallmark_preview_index_q2_fix_handler, hallmark_preview_index_pvshow, hallmark_preview_index_sql_error_hint, hallmark_preview_index_connection_lost_state [EXTRACTED 1.00]
- **Write guard and passphrase protection flow** — hallmark_preview_settings_write_guard_picker, hallmark_preview_settings_what_to_protect, hallmark_preview_settings_passphrase_dialogs, hallmark_preview_settings_security_pane [INFERRED 0.85]
- **Duplicated preview harness script (theme, fonts, URL carry) across screens** — hallmark_preview_connect_apply, hallmark_preview_home_apply, hallmark_preview_index_apply, hallmark_preview_connect_writeurl, hallmark_preview_home_writeurl, hallmark_preview_index_writeurl, hallmark_preview_index_ypathemes [INFERRED 0.95]

## Communities (55 total, 17 thin omitted)

### Community 0 - "Modals.tsx"
Cohesion: 0.09
Nodes (21): COLORS, CONN_TABS, ConnectModal(), ConnTab, connUrl(), GUARDS, MONO_FONTS, MY_SSL (+13 more)

### Community 1 - "State"
Cohesion: 0.08
Nodes (3): State, Saved, Settings

### Community 2 - "Hallmark Preview Screens"
Cohesion: 0.05
Nodes (45): connect.html (New connection preview), apply() (theme/density), writeUrl(), home.html (Home / Connections preview), apply() (theme/density), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), writeUrl() (+37 more)

### Community 3 - "conns.rs"
Cohesion: 0.07
Nodes (38): Conn, ConnFile, ConnLock, delete_connection(), Engine, Mysql, Postgres, Sqlite (+30 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.06
Nodes (10): Affected, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RunRequest, TableColumn, TableIndex (+2 more)

### Community 5 - "NPM Dependencies"
Cohesion: 0.07
Nodes (38): dependencies, lucide-react@0.460.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+30 more)

### Community 6 - "Result Grid Icons"
Cohesion: 0.10
Nodes (18): Cell(), GridRow, jsonHtml(), ResultGrid(), TYPE_ICON, boolOf(), csvCell(), Format (+10 more)

### Community 7 - "SQL Parser Dependencies"
Cohesion: 0.07
Nodes (13): ALTER, available(), CREATE, DELETE, DROP, GRANT, INSERT, passphrase_status() (+5 more)

### Community 8 - "Async Pool Primitives"
Cohesion: 0.24
Nodes (13): now_ms(), clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace() (+5 more)

### Community 9 - "App.tsx"
Cohesion: 0.15
Nodes (11): index.html (Vite app entry), App(), AppStrip(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), GuardPicker(), TabsBar() (+3 more)

### Community 10 - "keychain.rs"
Cohesion: 0.12
Nodes (17): set_passphrase(), check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase() (+9 more)

### Community 11 - "Sidebar Icons and Cells"
Cohesion: 0.12
Nodes (18): icoC(), MenuButton(), ENGINE_OF(), HistorySide(), MenuItem, Row(), RowMore(), SavedSide() (+10 more)

### Community 12 - "Query and Table Panes"
Cohesion: 0.19
Nodes (13): ConnWork(), CtxSelect(), Elapsed(), ErrorState(), QueryContext(), QueryPane(), QueryResults(), RunGroup() (+5 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.11
Nodes (16): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, test_connection Tauri command (+8 more)

### Community 14 - "Tauri App Config"
Cohesion: 0.10
Nodes (19): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+11 more)

### Community 15 - "TabsBar.tsx"
Cohesion: 0.14
Nodes (3): ico, icoLg, LEVELS

### Community 16 - "DB Catalog and Execute"
Cohesion: 0.23
Nodes (14): catalog(), conn(), execute(), first(), on_pool!, Open, open(), open_connection() (+6 more)

### Community 17 - "Engine Connect Helpers"
Cohesion: 0.20
Nodes (13): capitalise(), connect(), host_of(), password_for(), pg_position(), Pool, Lite, My (+5 more)

### Community 18 - ".get"
Cohesion: 0.36
Nodes (9): col(), err_text(), load_schema(), schema_objects(), SchemaObjects, table_catalog(), table_info(), TreeTable (+1 more)

### Community 19 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "Native Menu"
Cohesion: 0.11
Nodes (7): Cells, start_heartbeat(), build(), CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS

### Community 21 - "Statement Classifier"
Cohesion: 0.21
Nodes (11): Classified, classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+3 more)

### Community 23 - "Passphrase sub-dialogs (set, change, disable, unlock)"
Cohesion: 0.25
Nodes (9): openSub() (settings preview), Passphrase sub-dialogs (set, change, disable, unlock), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview), Settings Security pane, What to protect (protected statement kinds), PassDialog() (+1 more)

### Community 24 - "Font Discovery"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 25 - "Write Guard State"
Cohesion: 0.25
Nodes (6): Approval, Confirm, Passphrase, TouchId, Ask, check()

### Community 26 - "Passphrase Auth Commands"
Cohesion: 0.24
Nodes (8): authenticate(), disable_passphrase(), GuardState, Inner, lock_protect(), unlock_protect(), verify(), verify_for_lowering()

### Community 27 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 28 - "Agent Graph Workflow"
Cohesion: 0.60
Nodes (3): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), CLAUDE.md (symlink to AGENTS.md)

### Community 29 - "themes.ts"
Cohesion: 0.17
Nodes (21): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 30 - "run_query"
Cohesion: 0.21
Nodes (9): cancel_query(), close_connection(), DbState, run_query(), RunOutcome, Ask, Cancelled, Done (+1 more)

### Community 31 - "App Icon"
Cohesion: 0.67
Nodes (3): ypacapy App Icon, Blue Gradient Rounded Tile, Database Cylinder Glyph

### Community 32 - "types.ts"
Cohesion: 0.15
Nodes (15): api, Ask, HistoryEntry, OpenInfo, ResultSet, RunOutcome, RunState, SchemaNode (+7 more)

### Community 40 - "Exec"
Cohesion: 0.29
Nodes (8): Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet, sqlite_runs()

### Community 42 - "QueryPane.tsx"
Cohesion: 0.15
Nodes (16): react, Props, SqlEditor, DIALECT, ENGINE_LABEL, ENGINE_NAME, esc(), formatSql() (+8 more)

### Community 43 - "store.ts"
Cohesion: 0.14
Nodes (14): flushWorkspace(), lastWritten, Modal, newQuery(), readWorkspace(), restored, saveTimers, SettingsSection (+6 more)

### Community 44 - "Modals"
Cohesion: 0.27
Nodes (11): Settings Data on this Mac pane, DataPane(), GuardModal(), LowerGuardModal(), Modals(), PromptModal(), QueriesPane(), SaveQueryModal() (+3 more)

### Community 45 - "Home.tsx"
Cohesion: 0.27
Nodes (5): ConnTile(), address(), Home(), errText(), Conn

### Community 46 - "AppearancePane"
Cohesion: 0.33
Nodes (9): AppearancePane(), FontRow(), PassphraseSection(), SchemeRow(), SecurityPane(), SetItem(), Select(), FontList (+1 more)

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **36 isolated node(s):** `Confirm`, `Passphrase`, `TouchId`, `Mysql`, `Postgres` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 283 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `Passphrase sub-dialogs (set, change, disable, unlock)` to `Passphrase Auth Commands`, `keychain.rs`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **What connects `Confirm`, `Passphrase`, `TouchId` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modals.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08994708994708994 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `Passphrase sub-dialogs (set, change, disable, unlock)` to `Modals.tsx`, `Home.tsx`, `AppearancePane`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.07977207977207977 - nodes in this community are weakly interconnected._
- **Why does `GuardLevel` connect `conns.rs` to `Hallmark Preview Screens`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._