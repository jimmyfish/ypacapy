# Graph Report - ypacapy  (2026-11-17)

## Corpus Check
- 50 files · ~107,012 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .css 6, (none) 4, .lock 1)

## Summary
- 931 nodes · 2043 edges · 65 communities (45 shown, 20 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92f5a732`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- types.ts
- index.html (Query console preview)
- conns.rs
- Query Executor Types
- NPM Dependencies
- ResultGrid.tsx
- guard.rs
- TabsBar.tsx
- types.ts
- keychain.rs
- sql.ts
- Picker.tsx
- New Connection Preview
- Tauri App Config
- App.tsx
- DB Catalog and Execute
- .get
- settings.rs
- TypeScript Config
- lib.rs
- Modals.tsx
- RunOutcome
- store.rs
- QueryPane.tsx
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
- complete.ts
- openSub() (settings preview)
- AppearancePane
- Approval
- Pool
- check
- RawExec
- Sidebar.tsx
- SqlEditor.tsx
- Saved
- SecurityPane
- Home.tsx
- Settings
- QueriesPane

## God Nodes (most connected - your core abstractions)
1. `State` - 41 edges
2. `useStore` - 31 edges
3. `ResultGrid()` - 19 edges
4. `icoC()` - 19 edges
5. `useCurrent()` - 18 edges
6. `ConnectModal()` - 18 edges
7. `react` - 18 edges
8. `LocalStore` - 17 edges
9. `useDismiss()` - 16 edges
10. `Conn` - 16 edges

## Surprising Connections (you probably didn't know these)
- `ResultGrid()` --implements--> `Result grid with cell inspector and on-screen sort`  [INFERRED]
  src/components/ResultGrid.tsx → .hallmark/preview/settings.html
- `TablePane()` --implements--> `table.html (Table design preview)`  [INFERRED]
  src/components/TablePane.tsx → .hallmark/preview/table.html
- `settings.html (Settings design preview)` --conceptually_related_to--> `SettingsModal()`  [INFERRED]
  .hallmark/preview/settings.html → src/components/Modals.tsx
- `AppearancePane()` --implements--> `Settings Appearance pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `PassDialog()` --implements--> `Passphrase sub-dialogs (set, change, disable, unlock)`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`

## Hyperedges (group relationships)
- **Settings dialog panes** — hallmark_preview_settings_appearance_pane, hallmark_preview_settings_queries_pane, hallmark_preview_settings_security_pane, hallmark_preview_settings_data_on_this_mac_pane [EXTRACTED 1.00]
- **Table tab views (rows under filter, columns, indexes and keys)** — hallmark_preview_table_where_filter, hallmark_preview_table_rows_view, hallmark_preview_table_columns_view, hallmark_preview_table_indexes_view [EXTRACTED 1.00]
- **Preview screen navigation (Home, Query, New connection via tabs strip)** — hallmark_preview_home, hallmark_preview_index, hallmark_preview_connect, hallmark_preview_home_connection_tabs_strip [EXTRACTED 1.00]
- **Query run state flow (run, error fix, reconnect, render)** — hallmark_preview_index_runquery, hallmark_preview_index_render, hallmark_preview_index_q2_fix_handler, hallmark_preview_index_pvshow, hallmark_preview_index_sql_error_hint, hallmark_preview_index_connection_lost_state [EXTRACTED 1.00]
- **Write guard and passphrase protection flow** — hallmark_preview_settings_write_guard_picker, hallmark_preview_settings_what_to_protect, hallmark_preview_settings_passphrase_dialogs, hallmark_preview_settings_security_pane [INFERRED 0.85]
- **Duplicated preview harness script (theme, fonts, URL carry) across screens** — hallmark_preview_connect_apply, hallmark_preview_home_apply, hallmark_preview_index_apply, hallmark_preview_connect_writeurl, hallmark_preview_home_writeurl, hallmark_preview_index_writeurl, hallmark_preview_index_ypathemes [INFERRED 0.95]

## Communities (65 total, 20 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.16
Nodes (13): flushWorkspace(), lastWritten, Modal, newQuery(), readWorkspace(), restored, saveTimers, SettingsSection (+5 more)

### Community 2 - "index.html (Query console preview)"
Cohesion: 0.06
Nodes (43): connect.html (New connection preview), apply() (theme/density), writeUrl(), home.html (Home / Connections preview), apply() (theme/density), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), writeUrl() (+35 more)

### Community 3 - "conns.rs"
Cohesion: 0.09
Nodes (42): clean_group(), Conn, conn(), ConnFile, ConnLock, delete_connection(), Engine, Mysql (+34 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.06
Nodes (11): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RunRequest, TableColumn (+3 more)

### Community 5 - "NPM Dependencies"
Cohesion: 0.07
Nodes (38): dependencies, lucide-react@0.460.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+30 more)

### Community 6 - "ResultGrid.tsx"
Cohesion: 0.10
Nodes (22): Cell(), CellEditor(), ColKey, GridRow, jsonHtml(), MenuItem, SaveError, TYPE_ICON (+14 more)

### Community 7 - "guard.rs"
Cohesion: 0.07
Nodes (15): ALTER, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT, INSERT (+7 more)

### Community 8 - "TabsBar.tsx"
Cohesion: 0.16
Nodes (10): react, GroupSelect(), ico, icoC(), icoLg, LEVEL_ICON, LevelItems(), LevelSelect() (+2 more)

### Community 9 - "types.ts"
Cohesion: 0.16
Nodes (16): api, Ask, ColumnBrief, Conn, DEFAULT_LEVEL, HistoryEntry, OpenInfo, RunOutcome (+8 more)

### Community 10 - "keychain.rs"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 11 - "sql.ts"
Cohesion: 0.19
Nodes (13): tokens(), DIALECT, ENGINE_NAME, esc(), highlightInline(), highlightSql(), KEEP_LIST, KEEP_WANT (+5 more)

### Community 12 - "Picker.tsx"
Cohesion: 0.14
Nodes (22): AppStrip(), ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mysql(), Postgres() (+14 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.11
Nodes (16): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, test_connection Tauri command (+8 more)

### Community 14 - "Tauri App Config"
Cohesion: 0.10
Nodes (19): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+11 more)

### Community 15 - "App.tsx"
Cohesion: 0.17
Nodes (13): index.html (Vite app entry), App(), ConnWork(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), SavedSide(), Sidebar() (+5 more)

### Community 16 - "DB Catalog and Execute"
Cohesion: 0.29
Nodes (15): apply(), catalog(), conn(), execute(), first(), on_pool!, Open, open() (+7 more)

### Community 17 - ".get"
Cohesion: 0.23
Nodes (15): check_schema(), col(), ColumnBrief, err_text(), load_schema(), open_connection(), OpenInfo, outside() (+7 more)

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
Nodes (20): ALL_KINDS, CONN_TABS, ConnectModal(), ConnTab, connUrl(), MONO_FONTS, MY_SSL, optNum() (+12 more)

### Community 22 - "RunOutcome"
Cohesion: 0.18
Nodes (8): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet

### Community 23 - "store.rs"
Cohesion: 0.14
Nodes (19): new_id(), now_ms(), FontList, list_fonts(), mono_names(), named_mono(), scan(), clear_history() (+11 more)

### Community 24 - "QueryPane.tsx"
Cohesion: 0.18
Nodes (15): CtxSelect(), Elapsed(), ErrorState(), QueryContext(), QueryPane(), QueryResults(), RunGroup(), RunMeta() (+7 more)

### Community 25 - "themes.ts"
Cohesion: 0.17
Nodes (21): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 26 - "edit.ts"
Cohesion: 0.13
Nodes (25): useEditTarget(), CellMenu(), MenuButton(), ResultGrid(), errText(), AFTER_FROM, applied(), column() (+17 more)

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
Cohesion: 0.22
Nodes (11): apply_edits(), cancel_query(), close_connection(), DbState, plural(), run_query(), RunOutcome, Ask (+3 more)

### Community 31 - "App Icon"
Cohesion: 0.67
Nodes (3): ypacapy App Icon, Blue Gradient Rounded Tile, Database Cylinder Glyph

### Community 32 - "classify"
Cohesion: 0.21
Nodes (11): Classified, classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+3 more)

### Community 36 - "GuardState"
Cohesion: 0.19
Nodes (12): Passphrase sub-dialogs (set, change, disable, unlock), authenticate(), authenticate_owner(), disable_passphrase(), evaluate(), GuardState, Inner, lock_protect() (+4 more)

### Community 37 - "Modals"
Cohesion: 0.39
Nodes (8): Settings Data on this Mac pane, DataPane(), GuardModal(), Modals(), PromptModal(), SaveQueryModal(), SettingsModal(), Shell()

### Community 38 - "complete.ts"
Cohesion: 0.11
Nodes (25): UrlParts, Base, CLAUSE, completeContext(), Ctx, findSchema(), findTable(), isName() (+17 more)

### Community 40 - "openSub() (settings preview)"
Cohesion: 0.50
Nodes (4): openSub() (settings preview), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview)

### Community 41 - "AppearancePane"
Cohesion: 0.33
Nodes (8): AppearancePane(), FontRow(), SchemeRow(), SecuritySection(), SetItem(), Select(), FontList, systemFonts()

### Community 43 - "Pool"
Cohesion: 0.20
Nodes (13): capitalise(), connect(), host_of(), password_for(), pg_position(), Pool, Lite, My (+5 more)

### Community 44 - "check"
Cohesion: 0.20
Nodes (7): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, check()

### Community 47 - "RawExec"
Cohesion: 0.19
Nodes (4): RawExec, RawItem, start_heartbeat(), run()

### Community 48 - "Sidebar.tsx"
Cohesion: 0.18
Nodes (12): HistorySide(), MenuItem, Row(), RowMore(), SchemaSide(), estimate(), clock(), clockOf (+4 more)

### Community 49 - "SqlEditor.tsx"
Cohesion: 0.15
Nodes (7): Completer, ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON, Kind

### Community 56 - "SecurityPane"
Cohesion: 0.33
Nodes (6): Settings Security pane, What to protect (protected statement kinds), PassDialog(), PassphraseManager(), SecurityPane(), STATEMENTS

### Community 58 - "Home.tsx"
Cohesion: 0.17
Nodes (10): address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack(), Home(), MenuButton() (+2 more)

### Community 63 - "QueriesPane"
Cohesion: 0.50
Nodes (4): Settings Queries pane, QueriesPane(), UnitField(), DEFAULT_ROW_LIMIT

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **43 isolated node(s):** `Cancelled`, `Done`, `Done`, `Failed`, `Miss` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 307 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `GuardState` to `openSub() (settings preview)`, `SecurityPane`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **What connects `Cancelled`, `Done`, `Done` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `SecurityPane` to `AppearancePane`, `edit.ts`, `GuardState`, `Modals.tsx`?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._
- **Should `index.html (Query console preview)` be split into smaller, more focused modules?**
  _Cohesion score 0.0563265306122449 - nodes in this community are weakly interconnected._
- **Why does `disable_passphrase()` connect `GuardState` to `conns.rs`, `guard.rs`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._