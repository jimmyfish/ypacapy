# Graph Report - ypacapy  (2026-11-18)

## Corpus Check
- 74 files · ~271,389 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 1623 nodes · 3864 edges · 78 communities (62 shown, 16 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 151 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ca12429`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- QueryPane.tsx
- types.ts
- index.html (Query console preview)
- redis.rs
- Query Executor Types
- package.json
- ResultGrid.tsx
- guard.rs
- edit.ts
- with
- keychain.rs
- mongo.rs
- types.ts
- New Connection Preview
- Tauri App Config
- bson.ts
- table_catalog
- .get
- lib.rs
- TypeScript Config
- cache.yml
- Modals.tsx
- RunOutcome
- devDependencies
- CollectionPane.tsx
- themes.ts
- DiagramPane.tsx
- Tauri Capabilities
- ypacapy
- Applied
- build-window.mjs
- App Icon
- classify
- Cargo Crate
- GuardState
- AboutModal.tsx
- SqlEditor.tsx
- window.YpaThemes (themes.js scheme API)
- mongo_shell.rs
- Pool
- apply() (settings preview)
- UpdateChip
- check
- runQuery
- store.ts
- EngineIcon.tsx
- Home.tsx
- fonts.rs
- updater.ts
- Schema tree sidebar
- redis_cli.rs
- scripts
- settings.html (Settings design preview)
- DiagramTab
- ROpen
- erd.rs
- connect
- run
- Passphrase sub-dialogs (set, change, disable, unlock)
- Approval
- Settings
- Home.tsx
- App.tsx
- Sidebar.tsx
- conns.rs

## God Nodes (most connected - your core abstractions)
1. `State` - 50 edges
2. `useStore` - 37 edges
3. `icoC()` - 29 edges
4. `DiagramPane()` - 27 edges
5. `run()` - 27 edges
6. `useCurrent()` - 26 edges
7. `ResultGrid()` - 26 edges
8. `exec()` - 23 edges
9. `run()` - 23 edges
10. `react` - 23 edges

## Surprising Connections (you probably didn't know these)
- `settings.html (Settings design preview)` --conceptually_related_to--> `SettingsModal()`  [INFERRED]
  .hallmark/preview/settings.html → src/components/Modals.tsx
- `AppearancePane()` --implements--> `Settings Appearance pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `QueriesPane()` --implements--> `Settings Queries pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `SecurityPane()` --implements--> `Settings Security pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `PassDialog()` --implements--> `Passphrase sub-dialogs (set, change, disable, unlock)`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html

## Import Cycles
- 1-file cycle: `src-tauri/src/paths.rs -> src-tauri/src/paths.rs`
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`

## Hyperedges (group relationships)
- **Settings dialog panes** — hallmark_preview_settings_appearance_pane, hallmark_preview_settings_queries_pane, hallmark_preview_settings_security_pane, hallmark_preview_settings_data_on_this_mac_pane [EXTRACTED 1.00]
- **Table tab views (rows under filter, columns, indexes and keys)** — hallmark_preview_table_where_filter, hallmark_preview_table_rows_view, hallmark_preview_table_columns_view, hallmark_preview_table_indexes_view [EXTRACTED 1.00]
- **Preview screen navigation (Home, Query, New connection via tabs strip)** — hallmark_preview_home, hallmark_preview_index, hallmark_preview_connect, hallmark_preview_home_connection_tabs_strip [EXTRACTED 1.00]
- **Query run state flow (run, error fix, reconnect, render)** — hallmark_preview_index_runquery, hallmark_preview_index_render, hallmark_preview_index_q2_fix_handler, hallmark_preview_index_pvshow, hallmark_preview_index_sql_error_hint, hallmark_preview_index_connection_lost_state [EXTRACTED 1.00]
- **Write guard and passphrase protection flow** — hallmark_preview_settings_write_guard_picker, hallmark_preview_settings_what_to_protect, hallmark_preview_settings_passphrase_dialogs, hallmark_preview_settings_security_pane [INFERRED 0.85]
- **Duplicated preview harness script (theme, fonts, URL carry) across screens** — hallmark_preview_connect_apply, hallmark_preview_home_apply, hallmark_preview_index_apply, hallmark_preview_connect_writeurl, hallmark_preview_home_writeurl, hallmark_preview_index_writeurl, hallmark_preview_index_ypathemes [INFERRED 0.95]

## Communities (78 total, 16 thin omitted)

### Community 0 - "QueryPane.tsx"
Cohesion: 0.15
Nodes (19): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunMeta(), GridEdit, EditTarget (+11 more)

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (3): Edits, State, Saved

### Community 2 - "index.html (Query console preview)"
Cohesion: 0.29
Nodes (10): connect.html (New connection preview), home.html (Home / Connections preview), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), index.html (Query console preview), Query history sidebar, Lucide v0.460.0 inline SVG icon sprite, Saved queries sidebar (+2 more)

### Community 3 - "redis.rs"
Cohesion: 0.13
Nodes (26): b(), c(), cell(), col(), entries(), escaped(), items(), KeyPage (+18 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.05
Nodes (14): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RawExec, RawItem (+6 more)

### Community 5 - "package.json"
Cohesion: 0.12
Nodes (22): dependencies, lucide-react@1.75.0, react@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-process@^2 (+14 more)

### Community 6 - "ResultGrid.tsx"
Cohesion: 0.09
Nodes (32): AnyFormat, Cell(), CellEditor(), CellMenu(), ColKey, GridRow, jsonHtml(), MenuButton() (+24 more)

### Community 7 - "guard.rs"
Cohesion: 0.07
Nodes (16): ALTER, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT, INSERT (+8 more)

### Community 8 - "edit.ts"
Cohesion: 0.15
Nodes (21): useEditTarget(), sqlName(), AFTER_FROM, column(), editStatements(), ident(), isName(), kw() (+13 more)

### Community 9 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 10 - "keychain.rs"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 11 - "mongo.rs"
Cohesion: 0.05
Nodes (51): capitalise(), Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo (+43 more)

### Community 12 - "types.ts"
Cohesion: 0.10
Nodes (26): KeyFolder, api, Ask, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL, ErdColumn (+18 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.22
Nodes (8): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, validate() (connection name required)

### Community 14 - "Tauri App Config"
Cohesion: 0.08
Nodes (24): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+16 more)

### Community 15 - "bson.ts"
Cohesion: 0.23
Nodes (21): BsonType, cellText(), cellValue(), docsToSet(), fieldsOf(), iso(), isObj(), key() (+13 more)

### Community 16 - "table_catalog"
Cohesion: 0.31
Nodes (14): apply(), conn(), execute(), first(), on_pool!, Open, open(), postgres_catalog() (+6 more)

### Community 17 - ".get"
Cohesion: 0.14
Nodes (23): apply_edits(), cancel_query(), check_schema(), close_connection(), ColumnBrief, DbState, open_sql(), schema_diagram() (+15 more)

### Community 18 - "lib.rs"
Cohesion: 0.08
Nodes (19): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), run(), SETTINGS (+11 more)

### Community 19 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "cache.yml"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 21 - "Modals.tsx"
Cohesion: 0.06
Nodes (54): ALL_KINDS, AppearancePane(), CollInfoModal(), CONN_TABS, ConnectModal(), ConnTab, connUrl(), DataPane() (+46 more)

### Community 22 - "RunOutcome"
Cohesion: 0.12
Nodes (13): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet (+5 more)

### Community 23 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @tauri-apps/cli@^2.0.0, @types/react@^18.3.11, @types/react-dom@^18.3.1, typescript@^5.6.3, vite@^5.4.10, @vitejs/plugin-react@^4.3.2, @tauri-apps/cli (+7 more)

### Community 24 - "CollectionPane.tsx"
Cohesion: 0.25
Nodes (12): ConnWork(), Box(), CollectionPane(), ErrorState(), RunGroup(), mongoColl(), TablePane(), estimate() (+4 more)

### Community 25 - "themes.ts"
Cohesion: 0.17
Nodes (21): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 26 - "DiagramPane.tsx"
Cohesion: 0.05
Nodes (67): blobBase64(), Box, BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog(), DETAILS (+59 more)

### Community 27 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 28 - "ypacapy"
Cohesion: 0.08
Nodes (24): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), [0.0.1] - 2026-11-18, Added, Added, Changed, Changelog, [Unreleased] (+16 more)

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
Cohesion: 0.25
Nodes (10): classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target(), statement_end() (+2 more)

### Community 36 - "GuardState"
Cohesion: 0.24
Nodes (9): Passphrase sub-dialogs (set, change, disable, unlock), disable_passphrase(), GuardState, Inner, lock_protect(), reset_passphrase(), set_passphrase(), unlock_protect() (+1 more)

### Community 37 - "AboutModal.tsx"
Cohesion: 0.13
Nodes (23): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+15 more)

### Community 38 - "SqlEditor.tsx"
Cohesion: 0.06
Nodes (42): Completer, ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON, Kind, Base (+34 more)

### Community 39 - "window.YpaThemes (themes.js scheme API)"
Cohesion: 0.18
Nodes (9): apply() (theme/density), writeUrl(), apply() (theme/density), writeUrl(), apply() (theme/density), setFont(), voidHTTP design source (fonts/components), writeUrl() (+1 more)

### Community 40 - "mongo_shell.rs"
Cohesion: 0.09
Nodes (35): command_kind(), date(), describe(), err(), errors_point_at_the_place(), guard_kinds(), int(), kind() (+27 more)

### Community 41 - "Pool"
Cohesion: 0.22
Nodes (11): connect(), host_of(), password_for(), pg_position(), Pool, Lite, My, Pg (+3 more)

### Community 42 - "apply() (settings preview)"
Cohesion: 0.33
Nodes (7): apply() (settings preview), setFont() (settings preview), writeUrl() (settings preview), apply() (table preview), writeUrl() (table preview), schemeSwatch(), schemeTokens()

### Community 43 - "UpdateChip"
Cohesion: 0.43
Nodes (3): UpdateChip(), UpdateState, Updates

### Community 44 - "check"
Cohesion: 0.15
Nodes (12): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, authenticate(), authenticate_owner() (+4 more)

### Community 45 - "runQuery"
Cohesion: 0.22
Nodes (8): test_connection Tauri command, Connection lost state, window.pvShow (query states), q2-fix handler (apply HINT column and rerun), render() (query tab/result state), runQuery(), show(), SQL error state with database HINT fix

### Community 46 - "store.ts"
Cohesion: 0.12
Nodes (18): positionsOf(), flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten, Modal (+10 more)

### Community 47 - "EngineIcon.tsx"
Cohesion: 0.26
Nodes (13): fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres(), Redis(), Sqlite() (+5 more)

### Community 48 - "Home.tsx"
Cohesion: 0.16
Nodes (10): address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack(), Home(), MenuButton() (+2 more)

### Community 49 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 50 - "updater.ts"
Cohesion: 0.39
Nodes (6): checkForUpdate(), hasPendingUpdate(), installUpdate(), message(), NOTE_PREFIX, restartToUpdate()

### Community 51 - "Schema tree sidebar"
Cohesion: 0.29
Nodes (6): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu), Result grid with cell inspector, Schema tree sidebar, layout() (schema tree filter)

### Community 52 - "redis_cli.rs"
Cohesion: 0.08
Nodes (34): query(), is_final(), classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES, is_final() (+26 more)

### Community 53 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, tauri, typecheck

### Community 54 - "settings.html (Settings design preview)"
Cohesion: 0.16
Nodes (13): settings.html (Settings design preview), Settings Appearance pane, Settings Data on this Mac pane, Settings Queries pane, Result grid with cell inspector and on-screen sort, Write guard picker (Run it / Ask to confirm / Ask for passphrase), table.html (Table design preview), Table Columns view (+5 more)

### Community 55 - "DiagramTab"
Cohesion: 0.40
Nodes (3): DiagramTab, KeyTab, QueryTab

### Community 56 - "ROpen"
Cohesion: 0.19
Nodes (7): open_one(), ROpen, server_of(), Step, Cancelled, Done, Failed

### Community 57 - "erd.rs"
Cohesion: 0.23
Nodes (23): catalog(), col(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable (+15 more)

### Community 58 - "connect"
Cohesion: 0.36
Nodes (9): against_a_server(), client(), connect(), db_of(), group(), reads_the_database_number(), secs(), test() (+1 more)

### Community 59 - "run"
Cohesion: 0.25
Nodes (10): DbState, err_text(), heartbeat(), KeyInfo, lost(), open_info(), redis_key(), redis_key_info() (+2 more)

### Community 60 - "Passphrase sub-dialogs (set, change, disable, unlock)"
Cohesion: 0.29
Nodes (7): openSub() (settings preview), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview), Settings Security pane, What to protect (protected statement kinds), STATEMENTS

### Community 63 - "Home.tsx"
Cohesion: 0.13
Nodes (13): react, GroupSelect(), icoC(), LEVEL_ICON, LevelItems(), LevelSelect(), GuardPicker(), TabMenu() (+5 more)

### Community 65 - "App.tsx"
Cohesion: 0.08
Nodes (25): index.html (Vite app entry), react-dom@^18.3.1, react-dom, App(), AppStrip(), SIDEBAR_DEFAULT, stack(), useTypeTokens() (+17 more)

### Community 74 - "Sidebar.tsx"
Cohesion: 0.14
Nodes (25): JsonLine(), KeyPane(), PARTS, prettyJson(), foldKeys(), HistorySide(), MenuItem, MONGO_SYSTEM (+17 more)

### Community 77 - "conns.rs"
Cohesion: 0.06
Nodes (65): clean_group(), Conn, conn(), ConnFile, ConnLock, copy_name(), copy_names_skip_taken_ones(), delete_connection() (+57 more)

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **57 isolated node(s):** `Cancelled`, `Done`, `Failed`, `Refused`, `Ask` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 512 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `GuardState` to `Passphrase sub-dialogs (set, change, disable, unlock)`, `Modals.tsx`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `run()` (e.g. with `capitalise()` and `summary()`) actually correct?**
  _`run()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Cancelled`, `Done`, `Failed` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05547652916073969 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `Modals.tsx` to `GuardState`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Should `redis.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._