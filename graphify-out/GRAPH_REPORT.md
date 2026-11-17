# Graph Report - ypacapy  (2026-11-17)

## Corpus Check
- 47 files · ~77,534 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .css 6, (none) 4, .lock 1)

## Summary
- 861 nodes · 1813 edges · 60 communities (38 shown, 22 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `34b03e25`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- State
- Hallmark Preview Screens
- conns.rs
- Query Executor Types
- NPM Dependencies
- ResultGrid.tsx
- guard.rs
- TabsBar.tsx
- edit.ts
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
- Native Menu
- Modals.tsx
- Exec
- store.rs
- sql.ts
- themes.ts
- types.ts
- Tauri Capabilities
- Agent Graph Workflow
- Applied
- run_query
- App Icon
- classify
- Cargo Crate
- GuardState
- react
- Passphrase sub-dialogs (set, change, disable, unlock)
- QueryTab
- QueryPane.tsx
- classify_stmt
- Approval
- GuardLevel
- Settings
- Approval
- schema_objects

## God Nodes (most connected - your core abstractions)
1. `State` - 38 edges
2. `useStore` - 31 edges
3. `ResultGrid()` - 19 edges
4. `ConnectModal()` - 17 edges
5. `useCurrent()` - 17 edges
6. `GuardState` - 16 edges
7. `LocalStore` - 15 edges
8. `compilerOptions` - 15 edges
9. `react` - 15 edges
10. `Pool` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AppearancePane()` --implements--> `Settings Appearance pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `SecurityPane()` --implements--> `Settings Security pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `settings.html (Settings design preview)` --conceptually_related_to--> `SettingsModal()`  [INFERRED]
  .hallmark/preview/settings.html → src/components/Modals.tsx
- `PassDialog()` --implements--> `Passphrase sub-dialogs (set, change, disable, unlock)`  [INFERRED]
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

## Communities (60 total, 22 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.16
Nodes (13): flushWorkspace(), lastWritten, Modal, newQuery(), readWorkspace(), restored, saveTimers, SettingsSection (+5 more)

### Community 1 - "State"
Cohesion: 0.08
Nodes (3): Edits, State, Saved

### Community 2 - "Hallmark Preview Screens"
Cohesion: 0.06
Nodes (43): connect.html (New connection preview), apply() (theme/density), writeUrl(), home.html (Home / Connections preview), apply() (theme/density), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), writeUrl() (+35 more)

### Community 3 - "conns.rs"
Cohesion: 0.11
Nodes (33): clear_pass_protect(), Conn, conn(), ConnFile, ConnLock, delete_connection(), Engine, Mysql (+25 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.06
Nodes (9): Affected, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, TableColumn, TableIndex, TableInfo (+1 more)

### Community 5 - "NPM Dependencies"
Cohesion: 0.07
Nodes (38): dependencies, lucide-react@0.460.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+30 more)

### Community 6 - "ResultGrid.tsx"
Cohesion: 0.08
Nodes (27): Cell(), CellEditor(), CellMenu(), ColKey, GridRow, jsonHtml(), MenuButton(), MenuItem (+19 more)

### Community 7 - "guard.rs"
Cohesion: 0.07
Nodes (14): ALTER, Ask, available(), CREATE, DELETE, DROP, GRANT, INSERT (+6 more)

### Community 8 - "TabsBar.tsx"
Cohesion: 0.14
Nodes (4): ico, icoLg, LEVELS, ENGINE_LABEL

### Community 9 - "edit.ts"
Cohesion: 0.17
Nodes (19): useEditTarget(), AFTER_FROM, column(), editStatements(), ident(), isName(), kw(), literal() (+11 more)

### Community 10 - "keychain.rs"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 11 - "Sidebar.tsx"
Cohesion: 0.14
Nodes (10): ENGINE_OF(), HistorySide(), MenuItem, RowMore(), useDismiss(), clock(), clockOf, dayLabel() (+2 more)

### Community 12 - "Picker.tsx"
Cohesion: 0.14
Nodes (21): ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mysql(), Postgres(), Sqlite() (+13 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.11
Nodes (16): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, test_connection Tauri command (+8 more)

### Community 14 - "Tauri App Config"
Cohesion: 0.10
Nodes (19): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+11 more)

### Community 15 - "App.tsx"
Cohesion: 0.14
Nodes (21): App(), AppStrip(), ConnWork(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), address(), Home() (+13 more)

### Community 16 - "DB Catalog and Execute"
Cohesion: 0.27
Nodes (15): apply(), catalog(), conn(), execute(), first(), on_pool!, Open, open() (+7 more)

### Community 17 - "run_error"
Cohesion: 0.20
Nodes (13): capitalise(), connect(), host_of(), password_for(), pg_position(), Pool, Lite, My (+5 more)

### Community 18 - "settings.rs"
Cohesion: 0.20
Nodes (8): config_dir(), config_path(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 19 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "Native Menu"
Cohesion: 0.08
Nodes (9): Cells, RawExec, RawItem, start_heartbeat(), build(), CLOSE_TAB, CLOSE_WINDOW, on_event() (+1 more)

### Community 21 - "Modals.tsx"
Cohesion: 0.06
Nodes (47): Settings Data on this Mac pane, Settings Queries pane, ALL_KINDS, AppearancePane(), CONN_TABS, ConnectModal(), ConnTab, connUrl() (+39 more)

### Community 22 - "Exec"
Cohesion: 0.33
Nodes (7): Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet

### Community 23 - "store.rs"
Cohesion: 0.14
Nodes (19): new_id(), now_ms(), FontList, list_fonts(), mono_names(), named_mono(), scan(), clear_history() (+11 more)

### Community 24 - "sql.ts"
Cohesion: 0.21
Nodes (12): Props, SqlEditor, DIALECT, ENGINE_NAME, esc(), formatSql(), highlightInline(), highlightSql() (+4 more)

### Community 25 - "themes.ts"
Cohesion: 0.18
Nodes (20): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), FAMILIES, findScheme(), fit() (+12 more)

### Community 26 - "types.ts"
Cohesion: 0.15
Nodes (14): api, Conn, DEFAULT_GUARD, HistoryEntry, OpenInfo, RunOutcome, RunState, SchemaNode (+6 more)

### Community 27 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 28 - "Agent Graph Workflow"
Cohesion: 0.60
Nodes (3): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), CLAUDE.md (symlink to AGENTS.md)

### Community 29 - "Applied"
Cohesion: 0.40
Nodes (5): Applied, Done, Failed, Miss, TimedOut

### Community 30 - "run_query"
Cohesion: 0.17
Nodes (13): apply_edits(), cancel_query(), close_connection(), DbState, EditRequest, plural(), run_query(), RunOutcome (+5 more)

### Community 31 - "App Icon"
Cohesion: 0.67
Nodes (3): ypacapy App Icon, Blue Gradient Rounded Tile, Database Cylinder Glyph

### Community 32 - "classify"
Cohesion: 0.21
Nodes (11): Classified, classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+3 more)

### Community 36 - "GuardState"
Cohesion: 0.18
Nodes (10): authenticate(), authenticate_owner(), check(), disable_passphrase(), evaluate(), GuardState, Inner, lock_protect() (+2 more)

### Community 40 - "Passphrase sub-dialogs (set, change, disable, unlock)"
Cohesion: 0.22
Nodes (10): openSub() (settings preview), Passphrase sub-dialogs (set, change, disable, unlock), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview), Settings Security pane, What to protect (protected statement kinds), set_passphrase() (+2 more)

### Community 42 - "QueryPane.tsx"
Cohesion: 0.19
Nodes (15): CtxSelect(), Elapsed(), ErrorState(), QueryContext(), QueryResults(), RunGroup(), RunMeta(), GridEdit (+7 more)

### Community 44 - "Approval"
Cohesion: 0.50
Nodes (4): Approval, Confirm, Passphrase, TouchId

### Community 49 - "schema_objects"
Cohesion: 0.31
Nodes (10): col(), err_text(), load_schema(), quote_ident(), schema_objects(), SchemaObjects, table_catalog(), table_info() (+2 more)

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **40 isolated node(s):** `Done`, `Ask`, `Error`, `Cancelled`, `Done` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 300 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `Passphrase sub-dialogs (set, change, disable, unlock)` to `GuardState`, `Modals.tsx`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **What connects `Done`, `Ask`, `Error` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.07977207977207977 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `Modals.tsx` to `Passphrase sub-dialogs (set, change, disable, unlock)`, `QueryPane.tsx`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Should `Hallmark Preview Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.0563265306122449 - nodes in this community are weakly interconnected._
- **Why does `GuardLevel` connect `conns.rs` to `Hallmark Preview Screens`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._