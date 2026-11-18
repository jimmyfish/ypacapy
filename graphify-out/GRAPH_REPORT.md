# Graph Report - ypacapy  (2026-11-18)

## Corpus Check
- 65 files · ~196,744 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 1339 nodes · 3033 edges · 74 communities (53 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 94 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e61cd66a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mongosh.ts
- types.ts
- index.html (Query console preview)
- conns.rs
- Query Executor Types
- package.json
- ResultGrid.tsx
- guard.rs
- Home.tsx
- with
- keychain.rs
- mongo.rs
- Picker.tsx
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
- fonts.rs
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
- updater.ts
- complete.ts
- window.YpaThemes (themes.js scheme API)
- mongo_shell.rs
- Modals
- apply() (settings preview)
- apply_edits
- check
- runQuery
- store.ts
- RawExec
- Sidebar.tsx
- ConnectModal
- lib.rs
- Schema tree sidebar
- AboutModal.tsx
- reload() (table preview)
- Write guard (Run it / Ask to confirm / Ask for passphrase)
- SecurityPane
- EngineIcon.tsx

## God Nodes (most connected - your core abstractions)
1. `State` - 42 edges
2. `useStore` - 34 edges
3. `ResultGrid()` - 24 edges
4. `icoC()` - 23 edges
5. `exec()` - 23 edges
6. `R` - 21 edges
7. `run()` - 21 edges
8. `react` - 21 edges
9. `ConnectModal()` - 20 edges
10. `useCurrent()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `settings.html (Settings design preview)` --conceptually_related_to--> `SettingsModal()`  [INFERRED]
  .hallmark/preview/settings.html → src/components/Modals.tsx
- `AppearancePane()` --implements--> `Settings Appearance pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `SecurityPane()` --implements--> `Settings Security pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
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

## Communities (74 total, 21 thin omitted)

### Community 0 - "mongosh.ts"
Cohesion: 0.83
Nodes (3): esc(), highlightMongo(), runs()

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (4): Edits, State, Approval, Settings

### Community 2 - "index.html (Query console preview)"
Cohesion: 0.21
Nodes (15): connect.html (New connection preview), home.html (Home / Connections preview), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), index.html (Query console preview), Query history sidebar, Lucide v0.460.0 inline SVG icon sprite, Saved queries sidebar (+7 more)

### Community 3 - "conns.rs"
Cohesion: 0.06
Nodes (61): clean_group(), Conn, conn(), ConnFile, ConnLock, delete_connection(), Engine, Mongo (+53 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.05
Nodes (15): Affected, ColumnBrief, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RunRequest (+7 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, lucide-react@0.460.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+36 more)

### Community 6 - "ResultGrid.tsx"
Cohesion: 0.09
Nodes (26): AnyFormat, Cell(), CellEditor(), CellMenu(), GridRow, jsonHtml(), MenuButton(), MenuItem (+18 more)

### Community 7 - "guard.rs"
Cohesion: 0.07
Nodes (16): ALTER, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT, INSERT (+8 more)

### Community 8 - "Home.tsx"
Cohesion: 0.10
Nodes (22): react, GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack() (+14 more)

### Community 9 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 10 - "keychain.rs"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 11 - "mongo.rs"
Cohesion: 0.06
Nodes (45): Args, client_options(), code_name(), collect(), collections(), CollInfo, conn(), connect() (+37 more)

### Community 12 - "Picker.tsx"
Cohesion: 0.18
Nodes (15): AppStrip(), ConnTile(), EngineIcon(), ColorPicker(), ENGINE_LABELS, EnginePicker(), ENGINES, Picker() (+7 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.22
Nodes (8): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, validate() (connection name required)

### Community 14 - "Tauri App Config"
Cohesion: 0.08
Nodes (24): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+16 more)

### Community 15 - "bson.ts"
Cohesion: 0.17
Nodes (25): BsonType, cellText(), cellValue(), docsToSet(), fieldsOf(), iso(), isObj(), key() (+17 more)

### Community 16 - "DB Catalog and Execute"
Cohesion: 0.17
Nodes (23): apply(), catalog(), conn(), connect(), done(), execute(), first(), on_pool! (+15 more)

### Community 17 - ".get"
Cohesion: 0.23
Nodes (16): cancel_query(), check_schema(), close_connection(), col(), DbState, err_text(), load_schema(), MOpen (+8 more)

### Community 18 - "settings.rs"
Cohesion: 0.18
Nodes (9): canonical(), config_dir(), config_path(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState (+1 more)

### Community 19 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "cache.yml"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 21 - "Modals.tsx"
Cohesion: 0.07
Nodes (24): ALL_KINDS, CONN_TABS, ConnTab, MONGO_ALL, MONGO_TLS, MONO_FONTS, MY_SSL, PORTS (+16 more)

### Community 22 - "RunOutcome"
Cohesion: 0.20
Nodes (7): Cells, Collected, ColMeta, Exec, Cancelled, Done, ResultSet

### Community 23 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 24 - "CollectionPane.tsx"
Cohesion: 0.23
Nodes (13): Box(), CollectionPane(), ErrorState(), QueryResults(), RunGroup(), RunMeta(), ColKey, ShellText() (+5 more)

### Community 25 - "themes.ts"
Cohesion: 0.18
Nodes (18): alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, fit(), Ghostty (+10 more)

### Community 26 - "edit.ts"
Cohesion: 0.10
Nodes (33): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), useEditTarget(), GridEdit, AFTER_FROM, column() (+25 more)

### Community 27 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 28 - "ypacapy"
Cohesion: 0.08
Nodes (23): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), [0.0.1] - 2026-11-18, Added, Added, Changelog, [Unreleased], CLAUDE.md (symlink to AGENTS.md) (+15 more)

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

### Community 37 - "updater.ts"
Cohesion: 0.11
Nodes (17): Notes(), Notes(), UpdateChip(), checkForUpdate(), hasPendingUpdate(), installUpdate(), mb(), message() (+9 more)

### Community 38 - "complete.ts"
Cohesion: 0.06
Nodes (43): Completer, ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON, kindOf(), Base (+35 more)

### Community 39 - "window.YpaThemes (themes.js scheme API)"
Cohesion: 0.18
Nodes (9): apply() (theme/density), writeUrl(), apply() (theme/density), writeUrl(), apply() (theme/density), setFont(), voidHTTP design source (fonts/components), writeUrl() (+1 more)

### Community 40 - "mongo_shell.rs"
Cohesion: 0.08
Nodes (37): Call, Command, command_kind(), date(), describe(), err(), errors_point_at_the_place(), guard_kinds() (+29 more)

### Community 41 - "Modals"
Cohesion: 0.23
Nodes (12): Settings Data on this Mac pane, Settings Queries pane, CollInfoModal(), DataPane(), GuardModal(), Modals(), PromptModal(), QueriesPane() (+4 more)

### Community 42 - "apply() (settings preview)"
Cohesion: 0.29
Nodes (8): Settings Appearance pane, apply() (settings preview), setFont() (settings preview), writeUrl() (settings preview), apply() (table preview), writeUrl() (table preview), schemeSwatch(), schemeTokens()

### Community 43 - "apply_edits"
Cohesion: 0.18
Nodes (12): apply_edits(), capitalise(), host_of(), pg_position(), plural(), port_of(), run_error(), RunOutcome (+4 more)

### Community 44 - "check"
Cohesion: 0.15
Nodes (12): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, authenticate(), authenticate_owner() (+4 more)

### Community 45 - "runQuery"
Cohesion: 0.22
Nodes (8): test_connection Tauri command, Connection lost state, window.pvShow (query states), q2-fix handler (apply HINT column and rerun), render() (query tab/result state), runQuery(), show(), SQL error state with database HINT fix

### Community 46 - "store.ts"
Cohesion: 0.10
Nodes (30): api, flushWorkspace(), KeptQuery, KeptTable, lastWritten, restored, saveTimers, SideView (+22 more)

### Community 47 - "RawExec"
Cohesion: 0.18
Nodes (5): heartbeat(), RawExec, RawItem, start_heartbeat(), run()

### Community 48 - "Sidebar.tsx"
Cohesion: 0.09
Nodes (28): index.html (Vite app entry), App(), ConnWork(), SIDEBAR_DEFAULT, stack(), useTheme(), useTypeTokens(), PassDialog() (+20 more)

### Community 49 - "ConnectModal"
Cohesion: 0.15
Nodes (18): AppearancePane(), ConnectModal(), connUrl(), FontRow(), kindsOf(), optNum(), optStr(), OptUnit() (+10 more)

### Community 50 - "lib.rs"
Cohesion: 0.15
Nodes (7): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS

### Community 51 - "Schema tree sidebar"
Cohesion: 0.29
Nodes (6): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu), Result grid with cell inspector, Schema tree sidebar, layout() (schema tree filter)

### Community 53 - "AboutModal.tsx"
Cohesion: 0.20
Nodes (16): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+8 more)

### Community 54 - "reload() (table preview)"
Cohesion: 0.67
Nodes (3): reload() (table preview), render() (table preview), Table where-clause filter

### Community 56 - "SecurityPane"
Cohesion: 0.29
Nodes (7): openSub() (settings preview), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview), Settings Security pane, What to protect (protected statement kinds), STATEMENTS

### Community 58 - "EngineIcon.tsx"
Cohesion: 0.50
Nodes (8): fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres(), Sqlite(), stroke()

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **53 isolated node(s):** `Cancelled`, `Done`, `Failed`, `Refused`, `Cancelled` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 445 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `GuardState` to `SecurityPane`, `Sidebar.tsx`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **What connects `Cancelled`, `Done`, `Failed` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06006006006006006 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `Sidebar.tsx` to `ConnectModal`, `GuardState`, `Modals.tsx`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Should `conns.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.057942057942057944 - nodes in this community are weakly interconnected._
- **Why does `Settings Data on this Mac pane` connect `Modals` to `index.html (Query console preview)`, `settings.rs`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._