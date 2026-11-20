# Graph Report - ypacapy  (2026-11-20)

## Corpus Check
- 77 files · ~315,537 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 2051 nodes · 4869 edges · 97 communities (86 shown, 11 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 307 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `72072729`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MongoDB driver
- BSON values
- diagram.ts
- Home.tsx
- Result grid with cell inspector, on-screen sort and copy/export menus
- DB runtime types
- Brand and graph docs
- Release workflow
- redis-cli parser
- Grid icons
- AuthDialog.tsx
- Store actions
- Guard icons
- Redis and Mongo config
- History sidebar
- App.tsx
- Updater chip preview
- guard.rs
- API and types
- Changelog features
- README icons
- window.Erd (inlined src/lib/diagram.ts + diagramExport.ts)
- Catalog commands
- Workspace persistence
- Pool
- DocCards.tsx
- Rust cache workflow
- Collection preview
- complete.ts
- Keychain
- Connections store
- conns.rs
- Redis previews
- package.json
- ERD catalog reads
- Local store
- themes.ts
- Redis state
- Unreleased changelog
- Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates)
- Build info and About
- home.html (Home / Connections preview)
- Security level (None / Low / Strict)
- useStore
- edit.ts
- TabsBar.tsx
- connect.html (New connection preview)
- Connect URL sync
- QueryPane.tsx
- SqlEditor.tsx
- TypeScript config
- updater.ts
- SettingsState
- connect
- render() (collection view/state)
- find
- RawExec
- Picker.tsx
- check_kinds
- About dialog (modal over the workspace)
- GuardState
- Write guard
- check_kinds
- Step
- Result cells
- Fonts
- classify
- Pool
- AGENTS.md
- Estimated document counts (~48k from collection metadata, not a count)
- render() (key head and value page)
- paths.rs
- Security level (None / Low / Strict)
- Update steps: available, downloading, installing, ready to restart, failed
- Tables to draw picker dialog
- Engine enum
- Tauri capabilities
- SSL modes
- render() (table preview)
- ask() (key write guard confirm)
- EngineIcon.tsx
- @tauri-apps/api
- SecurityLevel
- Applied
- Connect preview helpers
- Redis preview helpers
- Updates preview helpers
- Table preview helpers
- Saved queries sidebar
- ypacapy root

## God Nodes (most connected - your core abstractions)
1. `State` - 51 edges
2. `useStore` - 42 edges
3. `icoC()` - 33 edges
4. `DiagramPane()` - 28 edges
5. `run()` - 28 edges
6. `DocCards()` - 27 edges
7. `useCurrent()` - 26 edges
8. `run()` - 26 edges
9. `errText()` - 25 edges
10. `ResultGrid()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `savedAt()` --semantically_similar_to--> `savedAtLabel()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/lib/diagramTab.ts
- `Strict: passphrase dialog (optional Touch ID)` --semantically_similar_to--> `GuardModal()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Modals.tsx
- `Query history sidebar` --semantically_similar_to--> `HistorySide()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Sidebar.tsx
- `diagram.html (ER diagram preview)` --semantically_similar_to--> `DiagramPane()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/components/DiagramPane.tsx
- `Tables to draw picker dialog` --semantically_similar_to--> `Picker()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/components/DiagramPane.tsx

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`
- 1-file cycle: `src-tauri/src/paths.rs -> src-tauri/src/paths.rs`

## Hyperedges (group relationships)
- **About updater drawn as SQL transaction (select releases, insert, commit/rollback)** — hallmark_preview_about_updates_as_query, hallmark_preview_about_updater_states, hallmark_preview_about_install_failed_state, hallmark_preview_about_release_notes, hallmark_preview_about_step [EXTRACTED 1.00]
- **Connection URL and fields round trip** — hallmark_preview_connect_tourl, hallmark_preview_connect_fromurl, hallmark_preview_connect_mongourl, hallmark_preview_connect_redisurl, hallmark_preview_connect_setengine, hallmark_preview_connect_layout [EXTRACTED 1.00]
- **Home card drag-and-drop flow** — hallmark_preview_home_startdrag, hallmark_preview_home_placeghost, hallmark_preview_home_settarget, hallmark_preview_home_enddrag, hallmark_preview_home_dropon, hallmark_preview_home_recount, hallmark_preview_home_newgroup [EXTRACTED 1.00]
- **ER diagram export flow (image, Mermaid, DBML, drawio)** — readme_diagram_export, hallmark_preview_diagram_openimage, hallmark_preview_diagram_opencode, hallmark_preview_diagram_savedrawio, hallmark_preview_diagram_palette, hallmark_preview_diagram_erd_bundle [EXTRACTED 1.00]
- **Security level ask flow (None/Low/Strict)** — hallmark_preview_index_write_guard, hallmark_preview_index_setlevel, hallmark_preview_index_guard_confirm_dialog, hallmark_preview_index_guard_passphrase_dialog [EXTRACTED 1.00]
- **Write guard approval flow** — readme_write_guard, readme_security_levels, readme_parsed_sql_classification, readme_protected_statement_kinds, readme_app_passphrase, readme_touch_id, readme_strict_unlock_window [EXTRACTED 1.00]
- **Bounded, cheap reads instead of heavy automatic queries** — hallmark_preview_collection_estimated_doc_count, hallmark_preview_collection_fields_view, hallmark_preview_mongo_auto_limit, hallmark_preview_key_incremental_scan, hallmark_preview_key_ttl_only_filter, hallmark_preview_index_estimated_row_counts [INFERRED 0.75]
- **Write guard applied per engine (SQL, MongoDB, Redis)** — hallmark_preview_index_write_guard, hallmark_preview_mongo_write_guard, hallmark_preview_key_write_guard, hallmark_preview_mongo_guard_confirm_dialog, hallmark_preview_mongo_guard_pass_dialog [INFERRED 0.85]
- **Object Info dialogs read once on open and on Refresh** — hallmark_preview_collection_info_dialog, hallmark_preview_mongo_info_dialog, hallmark_preview_key_info_dialog [INFERRED 0.85]
- **In-app update flow (Settings pane to title-strip chip)** — hallmark_preview_settings_updates_pane, hallmark_preview_updates_update_chip, hallmark_preview_updates_update_steps, hallmark_preview_updates_install_failed, src_lib_updater [INFERRED 0.85]
- **Write guard and passphrase system across previews** — hallmark_preview_redis_write_guard_commands, hallmark_preview_redis_guard_dialogs, hallmark_preview_redis_security_level_menu, hallmark_preview_connect_security_options, hallmark_preview_connect_protected_kinds, hallmark_preview_settings_security_pane, hallmark_preview_settings_passphrase_dialogs [INFERRED 0.85]
- **Home connection management actions (group, duplicate, remove)** — hallmark_preview_home_card_actions_menu, hallmark_preview_home_group_actions_menu, hallmark_preview_home_remove_connection_dialog, hallmark_preview_home_new_group_dialog, hallmark_preview_home_duplicate_toast, hallmark_preview_home_rename [INFERRED 0.85]
- **Local-only data storage on the Mac** — readme_local_only_principle, readme_config_dir, readme_macos_keychain, readme_atomic_writes, src_tauri_src_paths, src_tauri_src_keychain [INFERRED 0.85]
- **No heavy automatic queries across engines** — readme_quiet_on_server, readme_autocomplete, readme_er_diagram_table_picker, changelog_redis_key_sidebar, changelog_mongo_fields_indexes [INFERRED 0.85]
- **Light, catalog-only reads policy across preview screens** — hallmark_preview_index_estimated_row_counts, hallmark_preview_table_estimated_row_count, hallmark_preview_diagram_catalog_only_read, hallmark_preview_index_sql_autocomplete, hallmark_preview_diagram_table_picker [INFERRED 0.85]

## Communities (97 total, 11 thin omitted)

### Community 0 - "MongoDB driver"
Cohesion: 0.06
Nodes (48): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+40 more)

### Community 1 - "BSON values"
Cohesion: 0.06
Nodes (42): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, command_kind() (+34 more)

### Community 2 - "diagram.ts"
Cohesion: 0.07
Nodes (53): palette(), blobBase64(), Box, BoxItem, clampZoom(), CODE, CodeDialog(), DETAILS (+45 more)

### Community 3 - "Home.tsx"
Cohesion: 0.11
Nodes (13): react, address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack(), Home() (+5 more)

### Community 4 - "Result grid with cell inspector, on-screen sort and copy/export menus"
Cohesion: 0.18
Nodes (12): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu, context menu), openCellMenu() (copy value / row as Plain text, JSON, Markdown, CSV), Result grid with cell inspector, on-screen sort and copy/export menus, pick() (grid cell select + inspector, collection), Cell context menu (Copy value / Copy row as), fillCols() (Go to column menu) (+4 more)

### Community 5 - "DB runtime types"
Cohesion: 0.05
Nodes (13): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, OpenInfo, RunRequest (+5 more)

### Community 6 - "Brand and graph docs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 7 - "Release workflow"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 8 - "redis-cli parser"
Cohesion: 0.08
Nodes (32): query(), classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES, KEYS_W, Kind (+24 more)

### Community 9 - "Grid icons"
Cohesion: 0.08
Nodes (30): AnyFormat, Cell(), CellEditor(), ColKey, DocsActions(), GridRow, jsonHtml(), MenuButton() (+22 more)

### Community 10 - "AuthDialog.tsx"
Cohesion: 0.12
Nodes (14): AuthDialog(), Caps(), Err(), Head(), PASS, PassField(), PassKind, PassphraseDialog() (+6 more)

### Community 11 - "Store actions"
Cohesion: 0.05
Nodes (5): Edits, State, Approval, Saved, Settings

### Community 12 - "Guard icons"
Cohesion: 0.06
Nodes (57): Strict: passphrase dialog (optional Touch ID), ALL_KINDS, AppearancePane(), CollInfoModal(), CONN_TABS, ConnectModal(), ConnQueriesPane(), ConnSecurityPane() (+49 more)

### Community 13 - "Redis and Mongo config"
Cohesion: 0.13
Nodes (26): b(), c(), cell(), col(), entries(), escaped(), items(), KeyPage (+18 more)

### Community 14 - "History sidebar"
Cohesion: 0.13
Nodes (27): Clear history dialog, Query history sidebar, JsonLine(), KeyPane(), PARTS, prettyJson(), foldKeys(), HistorySide() (+19 more)

### Community 15 - "App.tsx"
Cohesion: 0.14
Nodes (13): index.html (Vite app entry), App(), AppStrip(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), icoLg, PassphraseManager() (+5 more)

### Community 16 - "Updater chip preview"
Cohesion: 0.08
Nodes (25): Install failed state (signature mismatch, rolled back, 0.0.1 unchanged, Download from GitHub), app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+17 more)

### Community 17 - "guard.rs"
Cohesion: 0.05
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "API and types"
Cohesion: 0.10
Nodes (28): UrlParts, KeyFolder, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL, Engine, ErdColumn (+20 more)

### Community 19 - "Changelog features"
Cohesion: 0.09
Nodes (33): About dialog (version, update state, dev git info), Added, Settings sections (General, Appearance, Queries, Security, Data on this Mac, Updates), Tabs bar (min-width shrink, sideways scroll, edge fade), Lucide 'database' icon (teal #1abc9c), Lucide 'folder-tree' icon (teal #1abc9c), Lucide 'history' icon (teal #1abc9c), Lucide 'palette' icon (teal #1abc9c) (+25 more)

### Community 20 - "README icons"
Cohesion: 0.11
Nodes (22): Lucide 'ban' icon (teal #1abc9c), Lucide 'check' icon (teal #1abc9c), Lucide 'circle-help' icon (teal #1abc9c), Lucide 'download' icon (teal #1abc9c), Lucide 'feather' icon (teal #1abc9c), Lucide 'hard-drive' icon (teal #1abc9c), Lucide 'keyboard' icon (teal #1abc9c), Lucide 'lightbulb' icon (teal #1abc9c) (+14 more)

### Community 21 - "window.Erd (inlined src/lib/diagram.ts + diagramExport.ts)"
Cohesion: 0.09
Nodes (30): ER diagrams (ported from opengrip, Apache-2.0), opengrip diagram view (Apache-2.0 source), Lucide 'network' icon (teal #1abc9c), apply() (draw picked tables), askClose(), Selection cardinality marks and linked columns, changed(), Linked table from another schema (outside box) (+22 more)

### Community 22 - "Catalog commands"
Cohesion: 0.19
Nodes (19): apply_edits(), cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState, err_text() (+11 more)

### Community 23 - "Workspace persistence"
Cohesion: 0.06
Nodes (41): save(), Saved diagram (tables, positions, zoom, detail), DiagramModel, diagramModel(), tableKey(), withMoves(), diagramCanSave(), diagramChanged() (+33 more)

### Community 24 - "Pool"
Cohesion: 0.26
Nodes (15): apply(), conn(), execute(), first(), on_pool!, Open, open(), postgres_catalog() (+7 more)

### Community 25 - "DocCards.tsx"
Cohesion: 0.07
Nodes (69): DocCards(), card(), example(), line(), removeUndo(), send(), DocEdit, EMPTY (+61 more)

### Community 26 - "Rust cache workflow"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 27 - "Collection preview"
Cohesion: 0.11
Nodes (23): apply() (theme/density), setFont(), writeUrl(), apply() (collection preview theme/density), writeUrl() (collection preview), apply() (theme/density), Connection tab colour picker (Flat UI: Turquoise, Emerald, Sunflower, Carrot, Alizarin, River, Asphalt, Amethyst), Connection tabs strip (app-strip / ptabs) (+15 more)

### Community 28 - "complete.ts"
Cohesion: 0.06
Nodes (49): ac-data JSON (schemas, tables, columns), accept() (insert suggestion via insertText), window.acShow (autocomplete presets), build() (suggestion list), cols() / fetchCols() column cache, context() (caret statement/clause/table refs), paint() (editor highlight), window.pvShow (query states) (+41 more)

### Community 29 - "Keychain"
Cohesion: 0.13
Nodes (15): password_for(), check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase() (+7 more)

### Community 30 - "Connections store"
Cohesion: 0.11
Nodes (23): Card menu (Edit connection, Duplicate, Move to group, New group, Remove from group, Remove connection), Card drag-and-drop between groups, Connection card (engine tile, name, address, last opened), Connection groups (Production, Staging, Ungrouped), Connection search (name, host, user, database, file, engine, group; Cmd+F, Enter opens first, Esc clears), Connections home (grouped connection cards), dropOn(), dup() (duplicate connection) (+15 more)

### Community 31 - "conns.rs"
Cohesion: 0.13
Nodes (23): clean_group(), Conn, conn(), ConnFile, copy_name(), copy_names_skip_taken_ones(), group_is_trimmed_and_blank_is_none(), keep_history_overrides_settings_only_when_set() (+15 more)

### Community 32 - "Redis previews"
Cohesion: 0.10
Nodes (26): key.html (Redis key preview), redis.html (Redis connection preview), ask() (write guard dialog for DEL / KEYS), Redis command console (redis-cli commands in Query tabs), Expiring only filter (TTL keys), Guard dialogs: confirm (Low) and passphrase with Touch ID (Strict), Key Info dialog (TYPE, OBJECT encoding, MEMORY USAGE, idle time), Key row menu (Open key, New command, Copy name, Info, Delete key) (+18 more)

### Community 33 - "package.json"
Cohesion: 0.06
Nodes (39): dependencies, lucide-react@1.75.0, react@^18.3.1, sql-formatter@15.9.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-process@^2, @tauri-apps/plugin-updater@^2 (+31 more)

### Community 34 - "ERD catalog reads"
Cohesion: 0.18
Nodes (25): catalog(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of() (+17 more)

### Community 35 - "Local store"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "themes.ts"
Cohesion: 0.18
Nodes (20): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), FAMILIES, findScheme(), fit() (+12 more)

### Community 37 - "Redis state"
Cohesion: 0.25
Nodes (10): DbState, err_text(), heartbeat(), KeyInfo, lost(), open_info(), redis_key(), redis_key_info() (+2 more)

### Community 38 - "Unreleased changelog"
Cohesion: 0.10
Nodes (28): [0.0.1] - 2026-11-18, Added, Changed, Changelog, One ⋮ menu per connection card on Home, Duplicate a connection (own keychain item, same group), Lucide icons 1.75.0 upgrade (from 0.460.0), Collection Info ($collStats, read on open and Refresh) (+20 more)

### Community 39 - "Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates)"
Cohesion: 0.12
Nodes (17): Security level picker ([data-level-pick], connect), openSub() (connect preview), renderPass() (connect preview), Settings Appearance pane (theme, scheme per appearance, compact, three fonts), apply() (settings preview), closeSub() (settings preview), Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates), go() (settings pane switch) (+9 more)

### Community 40 - "Build info and About"
Cohesion: 0.16
Nodes (20): @tauri-apps/plugin-opener, DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K() (+12 more)

### Community 41 - "home.html (Home / Connections preview)"
Cohesion: 0.18
Nodes (18): about.html (About ypacapy preview), About preview bar (states: Up to date, Checking, Update available, Downloading, Installing, Ready to restart, Install failed, Dev build), Query workspace behind About (schema tree, history, saved queries, tabs, results), setPinned() (tab pin), Pinned query tabs (Pin/Unpin, Close skips pinned, diagrams unpinnable), collection.html (MongoDB collection preview), Open in console (query as db.orders.find in a new tab), diagram.html (ER diagram preview) (+10 more)

### Community 42 - "Security level (None / Low / Strict)"
Cohesion: 0.13
Nodes (19): Column does not exist error with PostgreSQL HINT and one-click fix, Connection lost state, q2-fix handler (apply HINT column and rerun), runQuery(), SQL error state with database HINT fix, ask() (open guard dialog for a write kind), Guard confirm dialog (Run this on events_prod?), Guard passphrase dialog (with Touch ID option) (+11 more)

### Community 43 - "useStore"
Cohesion: 0.20
Nodes (12): ConnWork(), Box(), CollectionPane(), ErrorState(), RunGroup(), mongoColl(), TablePane(), estimate() (+4 more)

### Community 44 - "edit.ts"
Cohesion: 0.15
Nodes (21): useEditTarget(), kindOf(), AFTER_FROM, column(), editStatements(), ident(), isName(), kw() (+13 more)

### Community 45 - "TabsBar.tsx"
Cohesion: 0.15
Nodes (10): Pinned query tabs, BoxMenu(), GroupSelect(), icoC(), LevelItems(), LevelSelect(), CellMenu(), GuardPicker() (+2 more)

### Community 46 - "connect.html (New connection preview)"
Cohesion: 0.14
Nodes (13): connect.html (New connection preview), Advanced tab (app name, connect timeout; Mongo replica set/read preference/direct; Redis key separator, keys per scan), New connection dialog form (Name, Color, Group; General/Options/SSL/Advanced tabs), drawGroup(), Group picker (No group, Home groups, New group...), Statements / writes / commands to ask about (per engine), Per-connection Queries options (row limit / page size, timeout, heartbeat), renderLevel() (+5 more)

### Community 47 - "Connect URL sync"
Cohesion: 0.13
Nodes (18): cancel_query on the test's id (Stop test), fromUrl() (URL to fields), layout() (per-engine field visibility), mongoUrl() (mongodb / mongodb+srv URL), window.pvShow (connect states), pvStart() (connect preview), redisUrl() (redis / rediss URL), save_connection Tauri command (+10 more)

### Community 48 - "QueryPane.tsx"
Cohesion: 0.17
Nodes (18): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunMeta(), GridEdit, api (+10 more)

### Community 49 - "SqlEditor.tsx"
Cohesion: 0.13
Nodes (9): SQL editor autocomplete (Query 5), react-dom@^18.3.1, react-dom, Completer, ItemIcon(), Marked(), Props, SqlEditor (+1 more)

### Community 50 - "TypeScript config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 51 - "updater.ts"
Cohesion: 0.17
Nodes (13): Release notes list (first 3, rest behind Show all N changes), Show all / Show less release notes handler, Updater state cards (checking, current, available, downloading, installing, ready, failed), UpdateChip(), checkForUpdate(), hasPendingUpdate(), installUpdate(), message() (+5 more)

### Community 52 - "SettingsState"
Cohesion: 0.27
Nodes (8): run(), config_dir(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 53 - "connect"
Cohesion: 0.18
Nodes (11): against_a_server(), client(), connect(), db_of(), group(), open_one(), reads_the_database_number(), ROpen (+3 more)

### Community 54 - "render() (collection view/state)"
Cohesion: 0.18
Nodes (11): Collection Fields view (fields seen on this page), Collection Indexes view (keys, unique, partial/sparse options), Collection Info dialog ($collStats: count, sizes, indexes, validator), window.mInfo (Info dialog preview states), Filter matches nothing state (with values seen hint), window.pvShow (collection states), reload() (collection run), render() (collection view/state) (+3 more)

### Community 55 - "find"
Cohesion: 0.34
Nodes (12): ConnLock, delete_connection(), duplicate_connection(), find(), new_id(), now_ms(), save_connection(), set_group() (+4 more)

### Community 57 - "Picker.tsx"
Cohesion: 0.19
Nodes (14): ConnTile(), EngineIcon(), ColorPicker(), ENGINE_LABELS, EnginePicker(), ENGINES, Picker(), PickerOption (+6 more)

### Community 58 - "check_kinds"
Cohesion: 0.17
Nodes (11): Approval, Confirm, Passphrase, TouchId, approve_lowering(), authenticate(), authenticate_owner(), check_kinds() (+3 more)

### Community 59 - "About dialog (modal over the workspace)"
Cohesion: 0.18
Nodes (10): About dialog (modal over the workspace), Version copy handler (clipboard, Copied for 1.4s), Copyable version button (copies 'ypacapy vX' for bug reports), Dev build card (channel, git-describe version, branch, commit, updates off in dev builds), GitHub and Report an issue links (github.com/jimmyfish/ypacapy), Capybara app icon in its onsen (steam, ripple rings), Onsen click handler (restart ping animation), show() (+2 more)

### Community 60 - "GuardState"
Cohesion: 0.20
Nodes (12): Passphrase sub-dialogs (set, change, disable, reset/forgot, unlock), approve_default_lowering(), disable_passphrase(), GuardState, Inner, lock_protect(), reset_passphrase(), set_passphrase() (+4 more)

### Community 61 - "Write guard"
Cohesion: 0.24
Nodes (11): Write guard for MongoDB (write-method kinds, unknown runCommand asks), Write guard for Redis (command groups, KEYS asks with Use SCAN), Security level pill in tabs bar (grey None, orange Low, red Strict), Lucide 'shield-check' icon (teal #1abc9c), Strict security-level pill in tabs bar (red), <img src="docs/assets/icons/shield-check.svg" width="24" height="24" align="top" alt="" /> The write guard, What to protect (INSERT, UPDATE, DELETE, REPLACE, ALTER, DROP, TRUNCATE, CREATE, GRANT, REVOKE), Security levels: None / Low / Strict (+3 more)

### Community 62 - "check_kinds"
Cohesion: 0.27
Nodes (8): Ask, check(), check_sql(), Classified, Warning, BigLimit, UpdateAll, warnings()

### Community 63 - "Step"
Cohesion: 0.50
Nodes (4): Step, Cancelled, Done, Failed

### Community 64 - "Result cells"
Cohesion: 0.12
Nodes (13): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet (+5 more)

### Community 65 - "Fonts"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 66 - "classify"
Cohesion: 0.21
Nodes (13): big_limits_warn_above_100(), classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+5 more)

### Community 68 - "Pool"
Cohesion: 0.18
Nodes (14): capitalise(), connect(), host_of(), test(), pg_position(), Pool, Lite, My (+6 more)

### Community 69 - "AGENTS.md"
Cohesion: 0.12
Nodes (16): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), app-icon.svg (ypacapy app icon), White capybara head soaking in the cylinder, Database cylinder as hot-spring tub, Teal gradient rounded tile (#2fd3b0 to #0a6e5d), Yuzu (yellow fruit with green leaf) on capybara's head, Keep a Changelog + Semantic Versioning (+8 more)

### Community 70 - "Estimated document counts (~48k from collection metadata, not a count)"
Cohesion: 0.33
Nodes (3): Collection Documents view (Table or JSON, 20 per page in stored order), Redis key tree (prefix folders, type badges, TTL marks), Expiring-only key filter (rTtlOnly)

### Community 71 - "render() (key head and value page)"
Cohesion: 0.25
Nodes (9): fillInfo() (key Info dialog), Key gone state (TYPE -> none), Key head (type badge, length, TTL, encoding, db), window.pvShow (key states), reload() (key re-read), render() (key head and value page), window.RKEYS (per-type key fixtures), setName() (long key keeps its end in view) (+1 more)

### Community 72 - "paths.rs"
Cohesion: 0.22
Nodes (6): Lucide 'map' icon (teal #1abc9c), Where things live (module map), base64(), config_path(), decode_base64(), write_binary_file()

### Community 73 - "Security level (None / Low / Strict)"
Cohesion: 0.32
Nodes (8): Security level picker for shop_prod (None, Low, Strict), setLevel() (security level), Low: Run this on shop_prod? confirm dialog, setLevel() (write guard), Security level (None / Low / Strict), Redis write guard (picked commands; Use SCAN instead), setLevel() (security level None/Low/Strict, mongo), MongoDB write guard (deleteMany, aggregate ending in $merge)

### Community 74 - "Update steps: available, downloading, installing, ready to restart, failed"
Cohesion: 0.33
Nodes (6): pvStart() (updates preview), setOpen() (chip popover), step() (window.pvShow, update step switch), Title-strip update chip with popover, Update steps: available, downloading, installing, ready to restart, failed, voidHTTP (design source for the update chip)

### Community 75 - "Tables to draw picker dialog"
Cohesion: 0.33
Nodes (4): layout() (schema tree filter), Tables to draw picker dialog, Schema tree sidebar, layout() (schema tree filter)

### Community 76 - "Engine enum"
Cohesion: 0.16
Nodes (10): Engine, Mongo, Mysql, Postgres, Redis, Sqlite, MongoTls, Insecure (+2 more)

### Community 78 - "Tauri capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 79 - "SSL modes"
Cohesion: 0.33
Nodes (6): SslMode, Disable, Prefer, Require, VerifyCa, VerifyFull

### Community 80 - "render() (table preview)"
Cohesion: 0.29
Nodes (7): Table Columns view, Table Indexes and Foreign keys view, Filter matches nothing state, window.pvShow (table states), reload() (table preview), render() (table preview), Table where-clause filter

### Community 81 - "ask() (key write guard confirm)"
Cohesion: 0.33
Nodes (6): ask() (key write guard confirm), Delete key (DEL via write guard), Expiry popover (EXPIRE / PERSIST), Hash field editing (HSET/HDEL in one MULTI), String value editing (SET ... KEEPTTL), cmd() (expiry command preview EXPIRE/PERSIST)

### Community 82 - "EngineIcon.tsx"
Cohesion: 0.44
Nodes (9): fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres(), Redis(), Sqlite() (+1 more)

### Community 84 - "@tauri-apps/api"
Cohesion: 0.40
Nodes (4): @tauri-apps/api@^2.0.0, @tauri-apps/api, FontList, systemFonts()

### Community 85 - "SecurityLevel"
Cohesion: 0.50
Nodes (4): SecurityLevel, Low, None, Strict

### Community 86 - "Applied"
Cohesion: 0.40
Nodes (5): Applied, Done, Failed, Miss, TimedOut

### Community 88 - "Connect preview helpers"
Cohesion: 0.67
Nodes (3): apply() (theme/density, connect preview), setFont() (connect preview), writeUrl() (connect preview)

### Community 89 - "Redis preview helpers"
Cohesion: 0.67
Nodes (3): apply() (theme/density, redis preview), setFont() (redis preview), writeUrl() (redis preview)

### Community 90 - "Updates preview helpers"
Cohesion: 0.67
Nodes (3): apply() (theme/density, updates preview), setFont() (updates preview), writeUrl() (updates preview)

## Ambiguous Edges - Review These
- `Lucide 'users' icon (teal #1abc9c)` → `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`  [AMBIGUOUS]
  README.md · relation: references

## Knowledge Gaps
- **128 isolated node(s):** `Cancelled`, `Done`, `Failed`, `Refused`, `Db` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 574 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where things live (module map)` connect `paths.rs` to `Fonts`, `Local store`, `DB runtime types`, `AGENTS.md`, `guard.rs`, `API and types`, `SettingsState`, `Workspace persistence`, `Keychain`, `conns.rs`?**
  _High betweenness centrality (0.392) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `run()` (e.g. with `capitalise()` and `summary()`) actually correct?**
  _`run()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Cancelled`, `Done`, `Failed` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MongoDB driver` be split into smaller, more focused modules?**
  _Cohesion score 0.05613951266125179 - nodes in this community are weakly interconnected._
- **Why does `run()` connect `Redis state` to `Local store`, `Pool`, `DB runtime types`, `redis-cli parser`, `Redis and Mongo config`, `SettingsState`, `connect`, `Catalog commands`, `find`, `check_kinds`, `GuardState`, `Step`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `BSON values` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Lucide 'users' icon (teal #1abc9c)` and `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._