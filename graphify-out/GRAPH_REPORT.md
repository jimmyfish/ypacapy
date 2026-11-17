# Graph Report - ypacapy  (2026-11-17)

## Corpus Check
- 55 files · ~117,288 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 1025 nodes · 2194 edges · 58 communities (54 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a19d060`
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
- Agent Graph Workflow
- Applied
- updates.ts
- App Icon
- classify
- Cargo Crate
- GuardState
- Modals
- complete.ts
- window.YpaThemes (themes.js scheme API)
- updater.ts
- AppearancePane
- apply() (settings preview)
- Pool
- check
- runQuery
- devDependencies
- RawExec
- Sidebar.tsx
- SqlEditor.tsx
- vite.config.ts
- Schema tree sidebar
- scripts
- Engine
- reload() (table preview)
- Write guard (Run it / Ask to confirm / Ask for passphrase)
- SecurityPane
- Home.tsx

## God Nodes (most connected - your core abstractions)
1. `State` - 41 edges
2. `useStore` - 31 edges
3. `icoC()` - 19 edges
4. `ResultGrid()` - 19 edges
5. `react` - 18 edges
6. `apply_edits()` - 18 edges
7. `ConnectModal()` - 18 edges
8. `useCurrent()` - 18 edges
9. `run_query()` - 17 edges
10. `LocalStore` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Passphrase sub-dialogs (set, change, disable, unlock)` --conceptually_related_to--> `set_passphrase()`  [INFERRED]
  .hallmark/preview/settings.html → src-tauri/src/guard.rs
- `Passphrase sub-dialogs (set, change, disable, unlock)` --conceptually_related_to--> `disable_passphrase()`  [INFERRED]
  .hallmark/preview/settings.html → src-tauri/src/guard.rs
- `settings.html (Settings design preview)` --conceptually_related_to--> `SettingsModal()`  [INFERRED]
  .hallmark/preview/settings.html → src/components/Modals.tsx
- `AppearancePane()` --implements--> `Settings Appearance pane`  [INFERRED]
  src/components/Modals.tsx → .hallmark/preview/settings.html
- `ResultGrid()` --implements--> `Result grid with cell inspector and on-screen sort`  [INFERRED]
  src/components/ResultGrid.tsx → .hallmark/preview/settings.html

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`

## Hyperedges (group relationships)
- **Settings dialog panes** — hallmark_preview_settings_appearance_pane, hallmark_preview_settings_queries_pane, hallmark_preview_settings_security_pane, hallmark_preview_settings_data_on_this_mac_pane [EXTRACTED 1.00]
- **Table tab views (rows under filter, columns, indexes and keys)** — hallmark_preview_table_where_filter, hallmark_preview_table_rows_view, hallmark_preview_table_columns_view, hallmark_preview_table_indexes_view [EXTRACTED 1.00]
- **Preview screen navigation (Home, Query, New connection via tabs strip)** — hallmark_preview_home, hallmark_preview_index, hallmark_preview_connect, hallmark_preview_home_connection_tabs_strip [EXTRACTED 1.00]
- **Query run state flow (run, error fix, reconnect, render)** — hallmark_preview_index_runquery, hallmark_preview_index_render, hallmark_preview_index_q2_fix_handler, hallmark_preview_index_pvshow, hallmark_preview_index_sql_error_hint, hallmark_preview_index_connection_lost_state [EXTRACTED 1.00]
- **Write guard and passphrase protection flow** — hallmark_preview_settings_write_guard_picker, hallmark_preview_settings_what_to_protect, hallmark_preview_settings_passphrase_dialogs, hallmark_preview_settings_security_pane [INFERRED 0.85]
- **Duplicated preview harness script (theme, fonts, URL carry) across screens** — hallmark_preview_connect_apply, hallmark_preview_home_apply, hallmark_preview_index_apply, hallmark_preview_connect_writeurl, hallmark_preview_home_writeurl, hallmark_preview_index_writeurl, hallmark_preview_index_ypathemes [INFERRED 0.95]

## Communities (58 total, 4 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.12
Nodes (27): api, errText(), flushWorkspace(), lastWritten, newQuery(), readWorkspace(), restored, saveTimers (+19 more)

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (4): Edits, State, Approval, Saved

### Community 2 - "index.html (Query console preview)"
Cohesion: 0.21
Nodes (15): connect.html (New connection preview), home.html (Home / Connections preview), Connection tabs strip (app-strip / ptabs), Connections list (On this Mac), index.html (Query console preview), Query history sidebar, Lucide v0.460.0 inline SVG icon sprite, Saved queries sidebar (+7 more)

### Community 3 - "conns.rs"
Cohesion: 0.06
Nodes (56): clean_group(), Conn, conn(), ConnFile, ConnLock, delete_connection(), Engine, Mysql (+48 more)

### Community 4 - "Query Executor Types"
Cohesion: 0.06
Nodes (13): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RunRequest, SchemaObjects (+5 more)

### Community 5 - "NPM Dependencies"
Cohesion: 0.11
Nodes (24): dependencies, lucide-react@0.460.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+16 more)

### Community 6 - "ResultGrid.tsx"
Cohesion: 0.10
Nodes (25): Cell(), CellEditor(), CellMenu(), GridRow, jsonHtml(), MenuButton(), MenuItem, ResultGrid() (+17 more)

### Community 7 - "guard.rs"
Cohesion: 0.07
Nodes (15): ALTER, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT, INSERT (+7 more)

### Community 8 - "TabsBar.tsx"
Cohesion: 0.15
Nodes (11): react, GroupSelect(), MenuButton(), ico, icoC(), LEVEL_ICON, LevelItems(), LevelSelect() (+3 more)

### Community 9 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 10 - "keychain.rs"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 11 - "sql.ts"
Cohesion: 0.18
Nodes (11): DIALECT, ENGINE_LABEL, ENGINE_NAME, KEEP_LIST, KEEP_WANT, KEYWORDS, quoteIdent(), Run (+3 more)

### Community 12 - "Picker.tsx"
Cohesion: 0.15
Nodes (21): ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mysql(), Postgres(), Sqlite() (+13 more)

### Community 13 - "New Connection Preview"
Cohesion: 0.22
Nodes (8): New connection dialog form, window.pvShow (connect states), save_connection Tauri command, setEngine(), setLine() (test status line), show(), connect form submit handler, validate() (connection name required)

### Community 14 - "Tauri App Config"
Cohesion: 0.08
Nodes (24): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+16 more)

### Community 15 - "App.tsx"
Cohesion: 0.15
Nodes (14): index.html (Vite app entry), App(), AppStrip(), SIDEBAR_DEFAULT, stack(), useTheme(), useTypeTokens(), icoLg (+6 more)

### Community 16 - "DB Catalog and Execute"
Cohesion: 0.27
Nodes (16): apply(), catalog(), conn(), done(), execute(), first(), on_pool!, Open (+8 more)

### Community 17 - ".get"
Cohesion: 0.21
Nodes (18): find(), cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState, err_text() (+10 more)

### Community 18 - "settings.rs"
Cohesion: 0.09
Nodes (15): build(), CLOSE_TAB, CLOSE_WINDOW, on_event(), run(), SETTINGS, config_dir(), config_path() (+7 more)

### Community 19 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "cache.yml"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 21 - "Modals.tsx"
Cohesion: 0.07
Nodes (26): ALL_KINDS, CONN_TABS, ConnectModal(), ConnTab, connUrl(), MONO_FONTS, MY_SSL, optNum() (+18 more)

### Community 22 - "RunOutcome"
Cohesion: 0.11
Nodes (14): apply_edits(), Cells, Collected, ColMeta, Exec, Cancelled, Done, plural() (+6 more)

### Community 23 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 24 - "QueryPane.tsx"
Cohesion: 0.17
Nodes (15): ConnWork(), CtxSelect(), Elapsed(), ErrorState(), QueryContext(), QueryPane(), QueryResults(), RunGroup() (+7 more)

### Community 25 - "themes.ts"
Cohesion: 0.18
Nodes (15): alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, fit(), Ghostty (+7 more)

### Community 26 - "edit.ts"
Cohesion: 0.16
Nodes (19): useEditTarget(), AFTER_FROM, column(), editStatements(), ident(), isName(), kw(), literal() (+11 more)

### Community 27 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 28 - "Agent Graph Workflow"
Cohesion: 0.60
Nodes (3): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), CLAUDE.md (symlink to AGENTS.md)

### Community 29 - "Applied"
Cohesion: 0.40
Nodes (5): Applied, Done, Failed, Miss, TimedOut

### Community 30 - "updates.ts"
Cohesion: 0.18
Nodes (7): DEV_BUILD, DevBuild, hasPendingUpdate(), restartToUpdate(), UpdateState, Updates, useUpdates

### Community 31 - "App Icon"
Cohesion: 0.67
Nodes (3): ypacapy App Icon, Blue Gradient Rounded Tile, Database Cylinder Glyph

### Community 32 - "classify"
Cohesion: 0.21
Nodes (11): Classified, classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+3 more)

### Community 36 - "GuardState"
Cohesion: 0.23
Nodes (9): authenticate_owner(), disable_passphrase(), GuardState, Inner, lock_protect(), reset_passphrase(), set_passphrase(), unlock_protect() (+1 more)

### Community 37 - "Modals"
Cohesion: 0.29
Nodes (10): Settings Queries pane, GuardModal(), Modals(), PromptModal(), QueriesPane(), SaveQueryModal(), SettingsModal(), Shell() (+2 more)

### Community 38 - "complete.ts"
Cohesion: 0.11
Nodes (28): Marked(), SqlEditor, Base, CLAUSE, completeContext(), Ctx, findSchema(), findTable() (+20 more)

### Community 39 - "window.YpaThemes (themes.js scheme API)"
Cohesion: 0.18
Nodes (9): apply() (theme/density), writeUrl(), apply() (theme/density), writeUrl(), apply() (theme/density), setFont(), voidHTTP design source (fonts/components), writeUrl() (+1 more)

### Community 40 - "updater.ts"
Cohesion: 0.24
Nodes (8): checkForUpdate(), installUpdate(), message(), NOTE_PREFIX, noteLines(), plain(), RELEASES_URL, REPO_URL

### Community 41 - "AppearancePane"
Cohesion: 0.21
Nodes (11): Settings Data on this Mac pane, AppearancePane(), DataPane(), FontRow(), SchemeRow(), SetItem(), Select(), FontList (+3 more)

### Community 42 - "apply() (settings preview)"
Cohesion: 0.29
Nodes (8): Settings Appearance pane, apply() (settings preview), setFont() (settings preview), writeUrl() (settings preview), apply() (table preview), writeUrl() (table preview), schemeSwatch(), schemeTokens()

### Community 43 - "Pool"
Cohesion: 0.18
Nodes (13): capitalise(), connect(), host_of(), password_for(), pg_position(), Pool, Lite, My (+5 more)

### Community 44 - "check"
Cohesion: 0.18
Nodes (9): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, authenticate(), check() (+1 more)

### Community 45 - "runQuery"
Cohesion: 0.22
Nodes (8): test_connection Tauri command, Connection lost state, window.pvShow (query states), q2-fix handler (apply HINT column and rerun), render() (query tab/result state), runQuery(), show(), SQL error state with database HINT fix

### Community 46 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, @tauri-apps/cli@^2.0.0, @types/react@^18.3.11, @types/react-dom@^18.3.1, typescript@^5.6.3, @tauri-apps/cli, @types/react, @types/react-dom (+1 more)

### Community 47 - "RawExec"
Cohesion: 0.21
Nodes (3): RawExec, RawItem, start_heartbeat()

### Community 48 - "Sidebar.tsx"
Cohesion: 0.22
Nodes (14): HistorySide(), MenuItem, Row(), RowMore(), SavedSide(), SchemaSide(), Sidebar(), estimate() (+6 more)

### Community 49 - "SqlEditor.tsx"
Cohesion: 0.17
Nodes (5): Completer, ItemIcon(), Props, TYPE_ICON, kindOf()

### Community 50 - "vite.config.ts"
Cohesion: 0.29
Nodes (6): vite@^5.4.10, @vitejs/plugin-react@^4.3.2, vite, @vitejs/plugin-react, devBuild(), git()

### Community 51 - "Schema tree sidebar"
Cohesion: 0.29
Nodes (6): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu), Result grid with cell inspector, Schema tree sidebar, layout() (schema tree filter)

### Community 52 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, tauri, typecheck

### Community 53 - "Engine"
Cohesion: 0.40
Nodes (4): GridEdit, EditTarget, Engine, ResultSet

### Community 54 - "reload() (table preview)"
Cohesion: 0.67
Nodes (3): reload() (table preview), render() (table preview), Table where-clause filter

### Community 56 - "SecurityPane"
Cohesion: 0.20
Nodes (12): openSub() (settings preview), Passphrase sub-dialogs (set, change, disable, unlock), window.pvShow (settings state switcher), renderLock() (settings preview), renderPass() (settings preview), Settings Security pane, What to protect (protected statement kinds), PassDialog() (+4 more)

### Community 58 - "Home.tsx"
Cohesion: 0.19
Nodes (9): address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack(), Home(), MenuItem (+1 more)

## Ambiguous Edges - Review These
- `Password kept in macOS login keychain` → `Write guard (Run it / Ask to confirm / Ask for passphrase)`  [AMBIGUOUS]
  .hallmark/preview/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **43 isolated node(s):** `ypacapy`, `Postgres`, `Mysql`, `Sqlite`, `None` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 348 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Passphrase sub-dialogs (set, change, disable, unlock)` connect `SecurityPane` to `GuardState`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **What connects `ypacapy`, `Postgres`, `Mysql` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11895161290322581 - nodes in this community are weakly interconnected._
- **Why does `PassDialog()` connect `SecurityPane` to `store.ts`, `Modals.tsx`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06386554621848739 - nodes in this community are weakly interconnected._
- **Why does `Settings Data on this Mac pane` connect `AppearancePane` to `index.html (Query console preview)`, `settings.rs`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Password kept in macOS login keychain` and `Write guard (Run it / Ask to confirm / Ask for passphrase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._