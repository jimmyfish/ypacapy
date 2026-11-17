# Graph Report - ypacapy  (2026-11-17)

## Corpus Check
- 60 files · ~144,563 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 1106 nodes · 2417 edges · 66 communities (55 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a35beac7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types.ts
- types.ts
- index.html (Query console preview)
- conns.rs
- Query Executor Types
- package.json
- ResultGrid.tsx
- guard.rs
- TabsBar.tsx
- with
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
- cache.yml
- Modals.tsx
- RunOutcome
- fonts.rs
- QueryPane.tsx
- themes.ts
- edit.ts
- Tauri Capabilities
- ypacapy
- Applied
- build-window.mjs
- App Icon
- classify
- Cargo Crate
- GuardState
- Modals
- complete.ts
- window.YpaThemes (themes.js scheme API)
- updater.ts
- EngineIcon.tsx
- apply() (settings preview)
- Pool
- Approval
- runQuery
- AboutModal.tsx
- RawExec
- Sidebar.tsx
- SqlEditor.tsx
- lib.rs
- Schema tree sidebar
- store.ts
- AboutModal.tsx
- reload() (table preview)
- Write guard (Run it / Ask to confirm / Ask for passphrase)
- SecurityPane
- Approval
- Home.tsx
- useStore
- Engine
- Saved
- ResultSet
- Settings

## God Nodes (most connected - your core abstractions)
1. `State` - 41 edges
2. `useStore` - 32 edges
3. `react` - 20 edges
4. `ResultGrid()` - 19 edges
5. `icoC()` - 19 edges
6. `useCurrent()` - 18 edges
7. `ConnectModal()` - 18 edges
8. `apply_edits()` - 18 edges
9. `LocalStore` - 17 edges
10. `ico` - 17 edges

## Surprising Connections (you probably didn't know these)
- `TablePane()` --implements--> `table.html (Table design preview)`  [INFERRED]
  src/components/TablePane.tsx → .hallmark/preview/table.html
- `GuardPicker()` --implements--> `Write guard picker (Run it / Ask to confirm / Ask for passphrase)`  [INFERRED]
  src/components/TabsBar.tsx → .hallmark/preview/settings.html
- `AppearancePane()` --implements--> `Settings Appearance pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `PassDialog()` --implements--> `Passphrase sub-dialogs (set, change, disable, unlock)`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `SecurityPane()` --implements--> `Settings Security pane`  [INFERRED]
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

## Communities (66 total, 11 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.18
Nodes (14): api, Ask, ColumnBrief, Conn, DEFAULT_LEVEL, HistoryEntry, OpenInfo, RunOutcome (+6 more)

### Community 2 - "index.html (Query console preview)"
Cohesion: 0.21
Nodes (15): connect.html (New connection preview), home.html (Home / Connections preview), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), index.html (Query console preview), Query history sidebar, Lucide v0.460.0 inline SVG icon sprite, Saved queries sidebar (+7 more)

### Community 3 - "conns.rs"
Cohesion: 0.06
Nodes (55): clean_group(), Conn, conn(), ConnFile, ConnLock, delete_connection(), Engine, Mysql (+47 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.06
Nodes (13): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RunRequest, SchemaObjects (+5 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, lucide-react@0.460.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+36 more)

### Community 6 - "ResultGrid.tsx"
Cohesion: 0.09
Nodes (25): Cell(), CellEditor(), CellMenu(), GridEdit, GridRow, jsonHtml(), MenuButton(), MenuItem (+17 more)

### Community 7 - "guard.rs"
Cohesion: 0.06
Nodes (16): ALTER, Ask, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT (+8 more)

### Community 8 - "TabsBar.tsx"
Cohesion: 0.18
Nodes (11): GroupSelect(), MenuButton(), icoC(), LEVEL_ICON, LevelItems(), LevelSelect(), GuardPicker(), TabsBar() (+3 more)

### Community 9 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 10 - "keychain.rs"
Cohesion: 0.13
Nodes (17): check_passphrase(), clear_passphrase(), conn_account(), delete(), derive(), get(), get_string(), has_passphrase() (+9 more)

### Community 11 - "sql.ts"
Cohesion: 0.15
Nodes (16): tokens(), DIALECT, ENGINE_LABEL, ENGINE_NAME, esc(), formatSql(), highlightInline(), highlightSql() (+8 more)

### Community 12 - "Picker.tsx"
Cohesion: 0.17
Nodes (15): AppStrip(), ConnTile(), EngineIcon(), ico, icoLg, ColorPicker(), ENGINE_LABELS, EnginePicker() (+7 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.22
Nodes (8): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, validate() (connection name required)

### Community 14 - "Tauri App Config"
Cohesion: 0.08
Nodes (24): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+16 more)

### Community 15 - "App.tsx"
Cohesion: 0.16
Nodes (6): index.html (Vite app entry), react, App(), SIDEBAR_DEFAULT, stack(), useTypeTokens()

### Community 16 - "DB Catalog and Execute"
Cohesion: 0.27
Nodes (16): apply(), catalog(), conn(), done(), execute(), first(), on_pool!, Open (+8 more)

### Community 17 - ".get"
Cohesion: 0.21
Nodes (18): find(), cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState, err_text() (+10 more)

### Community 18 - "settings.rs"
Cohesion: 0.20
Nodes (9): config_dir(), config_path(), expand_tilde(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState (+1 more)

### Community 19 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "cache.yml"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 21 - "Modals.tsx"
Cohesion: 0.07
Nodes (33): Settings Data on this Mac pane, ALL_KINDS, AppearancePane(), CONN_TABS, ConnectModal(), ConnTab, connUrl(), DataPane() (+25 more)

### Community 22 - "RunOutcome"
Cohesion: 0.11
Nodes (14): apply_edits(), Cells, Collected, ColMeta, Exec, Cancelled, Done, plural() (+6 more)

### Community 23 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 24 - "QueryPane.tsx"
Cohesion: 0.18
Nodes (17): ConnWork(), CtxSelect(), Elapsed(), ErrorState(), QueryContext(), QueryPane(), QueryResults(), RunGroup() (+9 more)

### Community 25 - "themes.ts"
Cohesion: 0.16
Nodes (22): useTheme(), CONN_HEX_BY_ID, alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES (+14 more)

### Community 26 - "edit.ts"
Cohesion: 0.14
Nodes (20): ResultGrid(), kindOf(), AFTER_FROM, applied(), column(), editCount(), editStatements(), ident() (+12 more)

### Community 27 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 28 - "ypacapy"
Cohesion: 0.08
Nodes (23): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), [0.0.1] - 2026-11-17, Added, Changed, Changelog, [Unreleased], CLAUDE.md (symlink to AGENTS.md) (+15 more)

### Community 29 - "Applied"
Cohesion: 0.40
Nodes (5): Applied, Done, Failed, Miss, TimedOut

### Community 30 - "build-window.mjs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 31 - "App Icon"
Cohesion: 0.67
Nodes (3): ypacapy App Icon, Blue Gradient Rounded Tile, Database Cylinder Glyph

### Community 32 - "classify"
Cohesion: 0.21
Nodes (11): Classified, classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+3 more)

### Community 36 - "GuardState"
Cohesion: 0.20
Nodes (9): authenticate(), authenticate_owner(), check(), evaluate(), GuardState, Inner, lock_protect(), reset_passphrase() (+1 more)

### Community 37 - "Modals"
Cohesion: 0.29
Nodes (10): Settings Queries pane, GuardModal(), Modals(), PromptModal(), QueriesPane(), SaveQueryModal(), SettingsModal(), Shell() (+2 more)

### Community 38 - "complete.ts"
Cohesion: 0.13
Nodes (22): Base, CLAUSE, completeContext(), Ctx, findSchema(), findTable(), isName(), Item (+14 more)

### Community 39 - "window.YpaThemes (themes.js scheme API)"
Cohesion: 0.18
Nodes (9): apply() (theme/density), writeUrl(), apply() (theme/density), writeUrl(), apply() (theme/density), setFont(), voidHTTP design source (fonts/components), writeUrl() (+1 more)

### Community 40 - "updater.ts"
Cohesion: 0.22
Nodes (9): UpdateChip(), checkForUpdate(), hasPendingUpdate(), installUpdate(), message(), NOTE_PREFIX, restartToUpdate(), UpdateState (+1 more)

### Community 41 - "EngineIcon.tsx"
Cohesion: 0.54
Nodes (7): fill(), GLYPHS, ld(), Mysql(), Postgres(), Sqlite(), stroke()

### Community 42 - "apply() (settings preview)"
Cohesion: 0.29
Nodes (8): Settings Appearance pane, apply() (settings preview), setFont() (settings preview), writeUrl() (settings preview), apply() (table preview), writeUrl() (table preview), schemeSwatch(), schemeTokens()

### Community 43 - "Pool"
Cohesion: 0.18
Nodes (13): capitalise(), connect(), host_of(), password_for(), pg_position(), Pool, Lite, My (+5 more)

### Community 44 - "Approval"
Cohesion: 0.33
Nodes (5): Approval, Confirm, Passphrase, TouchId, approve_lowering()

### Community 45 - "runQuery"
Cohesion: 0.22
Nodes (8): test_connection Tauri command, Connection lost state, window.pvShow (query states), q2-fix handler (apply HINT column and rerun), render() (query tab/result state), runQuery(), show(), SQL error state with database HINT fix

### Community 46 - "AboutModal.tsx"
Cohesion: 0.18
Nodes (5): Notes(), Notes(), noteLines(), plain(), RELEASES_URL

### Community 47 - "RawExec"
Cohesion: 0.21
Nodes (3): RawExec, RawItem, start_heartbeat()

### Community 48 - "Sidebar.tsx"
Cohesion: 0.16
Nodes (16): HistorySide(), MenuItem, Row(), RowMore(), SavedSide(), SchemaSide(), Sidebar(), estimate() (+8 more)

### Community 49 - "SqlEditor.tsx"
Cohesion: 0.16
Nodes (6): Completer, ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON

### Community 50 - "lib.rs"
Cohesion: 0.13
Nodes (7): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS

### Community 51 - "Schema tree sidebar"
Cohesion: 0.29
Nodes (6): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu), Result grid with cell inspector, Schema tree sidebar, layout() (schema tree filter)

### Community 52 - "store.ts"
Cohesion: 0.16
Nodes (13): flushWorkspace(), lastWritten, Modal, newQuery(), readWorkspace(), restored, saveTimers, SettingsSection (+5 more)

### Community 53 - "AboutModal.tsx"
Cohesion: 0.21
Nodes (16): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+8 more)

### Community 54 - "reload() (table preview)"
Cohesion: 0.67
Nodes (3): reload() (table preview), render() (table preview), Table where-clause filter

### Community 56 - "SecurityPane"
Cohesion: 0.22
Nodes (11): openSub() (settings preview), Passphrase sub-dialogs (set, change, disable, unlock), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview), Settings Security pane, What to protect (protected statement kinds), disable_passphrase() (+3 more)

### Community 58 - "Home.tsx"
Cohesion: 0.17
Nodes (9): address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack(), Home(), MenuItem (+1 more)

### Community 59 - "useStore"
Cohesion: 0.60
Nodes (5): PassDialog(), PassphraseManager(), SecurityPane(), SecuritySection(), useStore

### Community 62 - "Engine"
Cohesion: 0.67
Nodes (3): UrlParts, Engine, SslMode

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **43 isolated node(s):** `Cancelled`, `Done`, `Ask`, `Cancelled`, `Done` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 374 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `SecurityPane` to `useStore`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **What connects `Cancelled`, `Done`, `Ask` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `useStore` to `SecurityPane`, `QueryPane.tsx`, `Modals.tsx`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Should `conns.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.06377151799687011 - nodes in this community are weakly interconnected._
- **Why does `disable_passphrase()` connect `SecurityPane` to `conns.rs`, `GuardState`, `guard.rs`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._