# Graph Report - ypacapy  (2026-11-18)

## Corpus Check
- 69 files · ~237,336 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 1493 nodes · 3493 edges · 76 communities (66 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 122 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba40ad56`
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
- TabsBar.tsx
- with
- keychain.rs
- mongo.rs
- types.ts
- New Connection Preview
- Tauri App Config
- bson.ts
- DB Catalog and Execute
- .get
- settings.rs
- TypeScript Config
- cache.yml
- Modals.tsx
- RunOutcome
- devDependencies
- CollectionPane.tsx
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
- AboutModal.tsx
- SqlEditor.tsx
- window.YpaThemes (themes.js scheme API)
- mongo_shell.rs
- Modals
- apply() (settings preview)
- UpdateChip.tsx
- check
- runQuery
- store.ts
- RawExec
- App.tsx
- fonts.rs
- updater.ts
- Schema tree sidebar
- redis_cli.rs
- SetItem
- reload() (table preview)
- Write guard (Run it / Ask to confirm / Ask for passphrase)
- connect
- lib.rs
- Picker.tsx
- run
- Cmd
- sql.ts
- @tauri-apps/api
- Home.tsx
- apply_edits
- EngineIcon.tsx
- react-dom
- Sidebar.tsx
- Pool
- conns.rs

## God Nodes (most connected - your core abstractions)
1. `State` - 46 edges
2. `useStore` - 36 edges
3. `run()` - 28 edges
4. `ResultGrid()` - 26 edges
5. `useCurrent()` - 24 edges
6. `icoC()` - 24 edges
7. `run()` - 24 edges
8. `exec()` - 23 edges
9. `react` - 22 edges
10. `R` - 21 edges

## Surprising Connections (you probably didn't know these)
- `TablePane()` --implements--> `table.html (Table design preview)`  [INFERRED]
  src/components/TablePane.tsx → .hallmark/preview/table.html
- `settings.html (Settings design preview)` --conceptually_related_to--> `SettingsModal()`  [INFERRED]
  .hallmark/preview/settings.html → src/components/Modals.tsx
- `GuardPicker()` --implements--> `Write guard picker (Run it / Ask to confirm / Ask for passphrase)`  [INFERRED]
  src/components/TabsBar.tsx → .hallmark/preview/settings.html
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

## Communities (76 total, 10 thin omitted)

### Community 0 - "QueryPane.tsx"
Cohesion: 0.14
Nodes (19): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), GridEdit, EditTarget, esc(), highlightMongo() (+11 more)

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (4): Edits, State, Saved, Settings

### Community 2 - "index.html (Query console preview)"
Cohesion: 0.21
Nodes (15): connect.html (New connection preview), home.html (Home / Connections preview), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), index.html (Query console preview), Query history sidebar, Lucide v0.460.0 inline SVG icon sprite, Saved queries sidebar (+7 more)

### Community 3 - "redis.rs"
Cohesion: 0.13
Nodes (26): b(), c(), cell(), col(), entries(), escaped(), items(), KeyPage (+18 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.06
Nodes (9): Affected, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, TableColumn, TableIndex, TableInfo (+1 more)

### Community 5 - "package.json"
Cohesion: 0.10
Nodes (25): dependencies, lucide-react@1.75.0, react@^18.3.1, sql-formatter@15.9.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-process@^2, @tauri-apps/plugin-updater@^2 (+17 more)

### Community 6 - "ResultGrid.tsx"
Cohesion: 0.09
Nodes (26): AnyFormat, Cell(), CellEditor(), CellMenu(), GridRow, jsonHtml(), MenuButton(), MenuItem (+18 more)

### Community 7 - "guard.rs"
Cohesion: 0.07
Nodes (16): ALTER, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT, INSERT (+8 more)

### Community 8 - "TabsBar.tsx"
Cohesion: 0.18
Nodes (11): react, GroupSelect(), MenuButton(), ico, icoC(), LEVEL_ICON, LevelItems(), LevelSelect() (+3 more)

### Community 9 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 10 - "keychain.rs"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 11 - "mongo.rs"
Cohesion: 0.06
Nodes (48): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+40 more)

### Community 12 - "types.ts"
Cohesion: 0.10
Nodes (25): KeyFolder, api, Approval, Ask, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL (+17 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.22
Nodes (8): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, validate() (connection name required)

### Community 14 - "Tauri App Config"
Cohesion: 0.08
Nodes (24): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+16 more)

### Community 15 - "bson.ts"
Cohesion: 0.17
Nodes (24): BsonType, cellText(), cellValue(), fieldsOf(), iso(), isObj(), key(), MONGO_EXT (+16 more)

### Community 16 - "DB Catalog and Execute"
Cohesion: 0.18
Nodes (19): catalog(), conn(), connect(), execute(), first(), on_pool!, Open, open() (+11 more)

### Community 17 - ".get"
Cohesion: 0.19
Nodes (18): cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState, err_text(), load_schema() (+10 more)

### Community 18 - "settings.rs"
Cohesion: 0.20
Nodes (8): config_dir(), config_path(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 19 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "cache.yml"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 21 - "Modals.tsx"
Cohesion: 0.06
Nodes (33): ALL_KINDS, CONN_TABS, ConnectModal(), ConnTab, connUrl(), kindsOf(), MONGO_ALL, MONGO_TLS (+25 more)

### Community 22 - "RunOutcome"
Cohesion: 0.18
Nodes (8): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet

### Community 23 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @tauri-apps/cli@^2.0.0, @types/react@^18.3.11, @types/react-dom@^18.3.1, typescript@^5.6.3, vite@^5.4.10, @vitejs/plugin-react@^4.3.2, @tauri-apps/cli (+7 more)

### Community 24 - "CollectionPane.tsx"
Cohesion: 0.23
Nodes (15): Box(), CollectionPane(), ErrorState(), QueryResults(), RunGroup(), RunMeta(), ColKey, ShellText() (+7 more)

### Community 25 - "themes.ts"
Cohesion: 0.17
Nodes (19): CONN_HEX_BY_ID, alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, fit() (+11 more)

### Community 26 - "edit.ts"
Cohesion: 0.16
Nodes (19): useEditTarget(), AFTER_FROM, column(), editStatements(), ident(), isName(), kw(), literal() (+11 more)

### Community 27 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 28 - "ypacapy"
Cohesion: 0.08
Nodes (24): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), [0.0.1] - 2026-11-18, Added, Added, Changed, Changelog, [Unreleased] (+16 more)

### Community 29 - "Applied"
Cohesion: 0.33
Nodes (6): Applied, Done, Failed, Miss, TimedOut, apply()

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
Cohesion: 0.14
Nodes (16): openSub() (settings preview), Passphrase sub-dialogs (set, change, disable, unlock), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview), authenticate(), authenticate_owner(), disable_passphrase() (+8 more)

### Community 37 - "AboutModal.tsx"
Cohesion: 0.23
Nodes (15): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+7 more)

### Community 38 - "SqlEditor.tsx"
Cohesion: 0.08
Nodes (31): Completer, ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON, Kind, Base (+23 more)

### Community 39 - "window.YpaThemes (themes.js scheme API)"
Cohesion: 0.18
Nodes (9): apply() (theme/density), writeUrl(), apply() (theme/density), writeUrl(), apply() (theme/density), setFont(), voidHTTP design source (fonts/components), writeUrl() (+1 more)

### Community 40 - "mongo_shell.rs"
Cohesion: 0.09
Nodes (35): command_kind(), date(), describe(), err(), errors_point_at_the_place(), guard_kinds(), int(), kind() (+27 more)

### Community 41 - "Modals"
Cohesion: 0.27
Nodes (12): Settings Data on this Mac pane, CollInfoModal(), DataPane(), Final(), GuardModal(), KeyInfoModal(), Modals(), PromptModal() (+4 more)

### Community 42 - "apply() (settings preview)"
Cohesion: 0.29
Nodes (8): Settings Appearance pane, apply() (settings preview), setFont() (settings preview), writeUrl() (settings preview), apply() (table preview), writeUrl() (table preview), schemeSwatch(), schemeTokens()

### Community 43 - "UpdateChip.tsx"
Cohesion: 0.18
Nodes (6): Notes(), UpdateChip(), mb(), releaseDate(), RELEASES_URL, Updates

### Community 44 - "check"
Cohesion: 0.18
Nodes (9): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, check(), check_kinds() (+1 more)

### Community 45 - "runQuery"
Cohesion: 0.22
Nodes (8): test_connection Tauri command, Connection lost state, window.pvShow (query states), q2-fix handler (apply HINT column and rerun), render() (query tab/result state), runQuery(), show(), SQL error state with database HINT fix

### Community 46 - "store.ts"
Cohesion: 0.11
Nodes (18): flushWorkspace(), KeptKey, KeptQuery, KeptTable, lastWritten, Modal, newQuery(), readWorkspace() (+10 more)

### Community 47 - "RawExec"
Cohesion: 0.19
Nodes (4): RawExec, RawItem, start_heartbeat(), run()

### Community 48 - "App.tsx"
Cohesion: 0.19
Nodes (14): App(), ConnWork(), SIDEBAR_DEFAULT, stack(), useTheme(), useTypeTokens(), icoLg, SavedSide() (+6 more)

### Community 49 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 50 - "updater.ts"
Cohesion: 0.23
Nodes (10): checkForUpdate(), hasPendingUpdate(), installUpdate(), message(), NOTE_PREFIX, noteLines(), plain(), REPO_URL (+2 more)

### Community 51 - "Schema tree sidebar"
Cohesion: 0.29
Nodes (6): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu), Result grid with cell inspector, Schema tree sidebar, layout() (schema tree filter)

### Community 52 - "redis_cli.rs"
Cohesion: 0.10
Nodes (24): is_final(), classifies_for_the_guard(), EXPIRE, FLUSH, HASHES, is_final(), KEYS_W, KINDS (+16 more)

### Community 53 - "SetItem"
Cohesion: 0.17
Nodes (16): Settings Queries pane, Settings Security pane, What to protect (protected statement kinds), AppearancePane(), FontRow(), PassDialog(), PassphraseManager(), QueriesPane() (+8 more)

### Community 54 - "reload() (table preview)"
Cohesion: 0.67
Nodes (3): reload() (table preview), render() (table preview), Table where-clause filter

### Community 56 - "connect"
Cohesion: 0.18
Nodes (11): against_a_server(), client(), connect(), db_of(), group(), open_one(), reads_the_database_number(), ROpen (+3 more)

### Community 57 - "lib.rs"
Cohesion: 0.15
Nodes (7): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS

### Community 58 - "Picker.tsx"
Cohesion: 0.20
Nodes (14): AppStrip(), ConnTile(), EngineIcon(), ColorPicker(), ENGINE_LABELS, EnginePicker(), ENGINES, Picker() (+6 more)

### Community 59 - "run"
Cohesion: 0.25
Nodes (10): DbState, err_text(), heartbeat(), KeyInfo, lost(), open_info(), redis_key(), redis_key_info() (+2 more)

### Community 60 - "Cmd"
Cohesion: 0.17
Nodes (14): query(), Step, Cancelled, Done, Failed, Cmd, Kind, kind() (+6 more)

### Community 61 - "sql.ts"
Cohesion: 0.17
Nodes (14): tokens(), DIALECT, ENGINE_LABEL, ENGINE_NAME, esc(), highlightInline(), highlightSql(), KEEP_LIST (+6 more)

### Community 62 - "@tauri-apps/api"
Cohesion: 0.40
Nodes (4): @tauri-apps/api@^2.0.0, @tauri-apps/api, FontList, systemFonts()

### Community 63 - "Home.tsx"
Cohesion: 0.12
Nodes (9): address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack(), Home(), MenuItem (+1 more)

### Community 64 - "apply_edits"
Cohesion: 0.21
Nodes (11): find(), apply_edits(), EditRequest, plural(), run_query(), RunOutcome, Ask, Cancelled (+3 more)

### Community 65 - "EngineIcon.tsx"
Cohesion: 0.44
Nodes (9): fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres(), Redis(), Sqlite() (+1 more)

### Community 66 - "react-dom"
Cohesion: 0.40
Nodes (3): index.html (Vite app entry), react-dom@^18.3.1, react-dom

### Community 74 - "Sidebar.tsx"
Cohesion: 0.12
Nodes (23): JsonLine(), KeyPane(), PARTS, prettyJson(), foldKeys(), HistorySide(), MenuItem, MONGO_SYSTEM (+15 more)

### Community 75 - "Pool"
Cohesion: 0.27
Nodes (10): capitalise(), host_of(), test(), password_for(), pg_position(), port_of(), test(), run_error() (+2 more)

### Community 77 - "conns.rs"
Cohesion: 0.06
Nodes (64): clean_group(), Conn, conn(), ConnFile, ConnLock, copy_name(), copy_names_skip_taken_ones(), delete_connection() (+56 more)

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **57 isolated node(s):** `Read`, `Unknown`, `Cancelled`, `Done`, `Failed` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 482 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `GuardState` to `SetItem`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `run()` (e.g. with `capitalise()` and `summary()`) actually correct?**
  _`run()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Read`, `Unknown`, `Cancelled` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `QueryPane.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `SetItem` to `Modals`, `GuardState`, `Modals.tsx`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06031746031746032 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._