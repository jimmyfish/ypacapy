# Graph Report - ypacapy  (2026-11-17)

## Corpus Check
- 47 files · ~97,684 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .css 6, (none) 4, .lock 1)

## Summary
- 887 nodes · 1893 edges · 59 communities (43 shown, 16 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `36099c11`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- State
- index.html (Query console preview)
- conns.rs
- Query Executor Types
- NPM Dependencies
- ResultGrid.tsx
- guard.rs
- Home.tsx
- TabsBar.tsx
- keychain.rs
- Sidebar.tsx
- Picker.tsx
- New Connection Preview
- Tauri App Config
- App.tsx
- DB Catalog and Execute
- run_error
- settings.rs
- TypeScript Config
- lib.rs
- Modals.tsx
- RunOutcome
- store.rs
- sql.ts
- themes.ts
- edit.ts
- Tauri Capabilities
- Agent Graph Workflow
- Applied
- apply_edits
- App Icon
- classify
- Cargo Crate
- GuardState
- Modals
- react
- Passphrase sub-dialogs (set, change, disable, unlock)
- AppearancePane
- QueryPane.tsx
- QueriesPane
- check
- RawExec
- ConnectModal
- TablePane.tsx
- fonts.ts

## God Nodes (most connected - your core abstractions)
1. `State` - 40 edges
2. `useStore` - 31 edges
3. `ResultGrid()` - 19 edges
4. `useCurrent()` - 18 edges
5. `ConnectModal()` - 18 edges
6. `LocalStore` - 17 edges
7. `Conn` - 16 edges
8. `GuardState` - 16 edges
9. `apply_edits()` - 16 edges
10. `react` - 16 edges

## Surprising Connections (you probably didn't know these)
- `settings.html (Settings design preview)` --conceptually_related_to--> `SettingsModal()`  [INFERRED]
  .hallmark/preview/settings.html → src/components/Modals.tsx
- `AppearancePane()` --implements--> `Settings Appearance pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `PassDialog()` --implements--> `Passphrase sub-dialogs (set, change, disable, unlock)`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `SecurityPane()` --implements--> `Settings Security pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `TablePane()` --implements--> `table.html (Table design preview)`  [INFERRED]
  src/components/TablePane.tsx → .hallmark/preview/table.html

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`

## Hyperedges (group relationships)
- **Settings dialog panes** — hallmark_preview_settings_appearance_pane, hallmark_preview_settings_queries_pane, hallmark_preview_settings_security_pane, hallmark_preview_settings_data_on_this_mac_pane [EXTRACTED 1.00]
- **Table tab views (rows under filter, columns, indexes and keys)** — hallmark_preview_table_where_filter, hallmark_preview_table_rows_view, hallmark_preview_table_columns_view, hallmark_preview_table_indexes_view [EXTRACTED 1.00]
- **Preview screen navigation (Home, Query, New connection via tabs strip)** — hallmark_preview_home, hallmark_preview_index, hallmark_preview_connect, hallmark_preview_home_connection_tabs_strip [EXTRACTED 1.00]
- **Query run state flow (run, error fix, reconnect, render)** — hallmark_preview_index_runquery, hallmark_preview_index_render, hallmark_preview_index_q2_fix_handler, hallmark_preview_index_pvshow, hallmark_preview_index_sql_error_hint, hallmark_preview_index_connection_lost_state [EXTRACTED 1.00]
- **Write guard and passphrase protection flow** — hallmark_preview_settings_write_guard_picker, hallmark_preview_settings_what_to_protect, hallmark_preview_settings_passphrase_dialogs, hallmark_preview_settings_security_pane [INFERRED 0.85]
- **Duplicated preview harness script (theme, fonts, URL carry) across screens** — hallmark_preview_connect_apply, hallmark_preview_home_apply, hallmark_preview_index_apply, hallmark_preview_connect_writeurl, hallmark_preview_home_writeurl, hallmark_preview_index_writeurl, hallmark_preview_index_ypathemes [INFERRED 0.95]

## Communities (59 total, 16 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.12
Nodes (26): errText(), flushWorkspace(), lastWritten, newQuery(), readWorkspace(), restored, saveTimers, uid() (+18 more)

### Community 1 - "State"
Cohesion: 0.07
Nodes (3): Edits, State, Approval

### Community 2 - "index.html (Query console preview)"
Cohesion: 0.06
Nodes (43): connect.html (New connection preview), apply() (theme/density), writeUrl(), home.html (Home / Connections preview), apply() (theme/density), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), writeUrl() (+35 more)

### Community 3 - "conns.rs"
Cohesion: 0.09
Nodes (41): clean_group(), Conn, conn(), ConnFile, ConnLock, delete_connection(), Engine, Mysql (+33 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.06
Nodes (13): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RunRequest, SchemaObjects (+5 more)

### Community 5 - "NPM Dependencies"
Cohesion: 0.07
Nodes (38): dependencies, lucide-react@0.460.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+30 more)

### Community 6 - "ResultGrid.tsx"
Cohesion: 0.09
Nodes (22): Cell(), CellEditor(), GridRow, jsonHtml(), MenuItem, ResultGrid(), SaveError, TYPE_ICON (+14 more)

### Community 7 - "guard.rs"
Cohesion: 0.07
Nodes (15): ALTER, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT, INSERT (+7 more)

### Community 8 - "Home.tsx"
Cohesion: 0.13
Nodes (13): address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack(), Home(), MenuButton() (+5 more)

### Community 10 - "keychain.rs"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 11 - "Sidebar.tsx"
Cohesion: 0.17
Nodes (15): icoC(), HistorySide(), MenuItem, Row(), RowMore(), SavedSide(), SchemaSide(), Sidebar() (+7 more)

### Community 12 - "Picker.tsx"
Cohesion: 0.19
Nodes (14): ConnTile(), EngineIcon(), ColorPicker(), ENGINE_LABELS, EnginePicker(), ENGINES, Picker(), PickerOption (+6 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.11
Nodes (16): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, test_connection Tauri command (+8 more)

### Community 14 - "Tauri App Config"
Cohesion: 0.10
Nodes (19): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+11 more)

### Community 15 - "App.tsx"
Cohesion: 0.20
Nodes (12): App(), AppStrip(), ConnWork(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), TablePane(), GuardPicker() (+4 more)

### Community 16 - "DB Catalog and Execute"
Cohesion: 0.23
Nodes (18): apply(), catalog(), col(), conn(), execute(), first(), on_pool!, Open (+10 more)

### Community 17 - "run_error"
Cohesion: 0.20
Nodes (13): capitalise(), connect(), host_of(), password_for(), pg_position(), Pool, Lite, My (+5 more)

### Community 18 - "settings.rs"
Cohesion: 0.20
Nodes (8): config_dir(), config_path(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 19 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "lib.rs"
Cohesion: 0.17
Nodes (5): build(), CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS

### Community 21 - "Modals.tsx"
Cohesion: 0.08
Nodes (20): ALL_KINDS, CONN_TABS, ConnTab, MONO_FONTS, MY_SSL, PORTS, Protection, SSL_ALIASES (+12 more)

### Community 22 - "RunOutcome"
Cohesion: 0.12
Nodes (13): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet (+5 more)

### Community 23 - "store.rs"
Cohesion: 0.14
Nodes (19): new_id(), now_ms(), FontList, list_fonts(), mono_names(), named_mono(), scan(), clear_history() (+11 more)

### Community 24 - "sql.ts"
Cohesion: 0.16
Nodes (18): fill(), GLYPHS, ld(), Mysql(), Postgres(), Sqlite(), stroke(), SqlEditor (+10 more)

### Community 25 - "themes.ts"
Cohesion: 0.17
Nodes (21): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 26 - "edit.ts"
Cohesion: 0.14
Nodes (22): useEditTarget(), kindOf(), AFTER_FROM, column(), editStatements(), ident(), isName(), kw() (+14 more)

### Community 27 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 28 - "Agent Graph Workflow"
Cohesion: 0.60
Nodes (3): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), CLAUDE.md (symlink to AGENTS.md)

### Community 29 - "Applied"
Cohesion: 0.40
Nodes (5): Applied, Done, Failed, Miss, TimedOut

### Community 30 - "apply_edits"
Cohesion: 0.28
Nodes (12): find(), apply_edits(), cancel_query(), close_connection(), DbState, err_text(), load_schema(), open_connection() (+4 more)

### Community 31 - "App Icon"
Cohesion: 0.67
Nodes (3): ypacapy App Icon, Blue Gradient Rounded Tile, Database Cylinder Glyph

### Community 32 - "classify"
Cohesion: 0.21
Nodes (11): Classified, classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+3 more)

### Community 36 - "GuardState"
Cohesion: 0.29
Nodes (7): disable_passphrase(), GuardState, Inner, lock_protect(), reset_passphrase(), unlock_protect(), verify()

### Community 37 - "Modals"
Cohesion: 0.39
Nodes (8): Settings Data on this Mac pane, DataPane(), GuardModal(), Modals(), PromptModal(), SaveQueryModal(), SettingsModal(), Shell()

### Community 38 - "react"
Cohesion: 0.29
Nodes (3): index.html (Vite app entry), react, Props

### Community 40 - "Passphrase sub-dialogs (set, change, disable, unlock)"
Cohesion: 0.25
Nodes (9): openSub() (settings preview), Passphrase sub-dialogs (set, change, disable, unlock), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview), Settings Security pane, What to protect (protected statement kinds), set_passphrase() (+1 more)

### Community 41 - "AppearancePane"
Cohesion: 0.39
Nodes (9): AppearancePane(), FontRow(), PassDialog(), PassphraseManager(), SchemeRow(), SecurityPane(), SecuritySection(), SetItem() (+1 more)

### Community 42 - "QueryPane.tsx"
Cohesion: 0.17
Nodes (16): CtxSelect(), Elapsed(), ErrorState(), QueryContext(), QueryPane(), QueryResults(), RunGroup(), RunMeta() (+8 more)

### Community 43 - "QueriesPane"
Cohesion: 0.50
Nodes (4): Settings Queries pane, QueriesPane(), UnitField(), DEFAULT_ROW_LIMIT

### Community 44 - "check"
Cohesion: 0.16
Nodes (10): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, authenticate(), authenticate_owner() (+2 more)

### Community 47 - "RawExec"
Cohesion: 0.19
Nodes (4): RawExec, RawItem, start_heartbeat(), run()

### Community 62 - "ConnectModal"
Cohesion: 0.22
Nodes (7): ConnectModal(), connUrl(), optNum(), optStr(), OptUnit(), parseUrl(), storedList()

### Community 63 - "TablePane.tsx"
Cohesion: 0.22
Nodes (3): ico, icoLg, ColKey

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **43 isolated node(s):** `Postgres`, `Mysql`, `Sqlite`, `None`, `Low` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 305 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `Passphrase sub-dialogs (set, change, disable, unlock)` to `AppearancePane`, `GuardState`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **What connects `Postgres`, `Mysql`, `Sqlite` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12258064516129032 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `AppearancePane` to `Passphrase sub-dialogs (set, change, disable, unlock)`, `store.ts`, `Modals.tsx`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._
- **Why does `disable_passphrase()` connect `GuardState` to `Passphrase sub-dialogs (set, change, disable, unlock)`, `conns.rs`, `guard.rs`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._