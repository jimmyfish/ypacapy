# Graph Report - ypacapy  (2026-11-20)

## Corpus Check
- 78 files · ~337,080 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: .css 29, (none) 4, .lock 1)
- WARNING: 34 of 150 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 2071 nodes · 4968 edges · 93 communities (86 shown, 7 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 309 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2b74e191`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MongoDB driver
- BSON values
- DiagramPane.tsx
- Home.tsx
- Result grid with cell inspector, on-screen sort and copy/export menus
- DB runtime types
- Brand and graph docs
- Release workflow
- redis-cli parser
- Grid icons
- AuthDialog.tsx
- diagram.ts
- Guard icons
- Redis and Mongo config
- History sidebar
- App.tsx
- Updater chip preview
- guard.rs
- State
- Changelog features
- README icons
- themes.ts
- Pool
- apply_edits
- find
- DocCards.tsx
- Rust cache workflow
- types.ts
- complete.ts
- Keychain
- Connections store
- DbState
- Redis previews
- package.json
- ERD catalog reads
- Local store
- themes.ts
- .redis
- Unreleased changelog
- CollectionPane.tsx
- Build info and About
- home.html (Home / Connections preview)
- Security level (None / Low / Strict)
- CHANGELOG.md
- QueryPane.tsx
- vite.config.ts
- Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates)
- Connect URL sync
- Estimated document counts (~48k from collection metadata, not a count)
- render() (table preview)
- TypeScript config
- updater.ts
- SettingsState
- redis.rs
- store.ts
- find
- ConnectModal
- connect.html (New connection preview)
- run
- diagramTab.ts
- GuardState
- render() (key head and value page)
- check_kinds
- ROpen
- window.Erd (inlined src/lib/diagram.ts + diagramExport.ts)
- Fonts
- classify
- start_heartbeat
- paths.rs
- AGENTS.md
- render() (collection view/state)
- UpdateChip
- ~/.config/ypacapy (settings.toml, connections.toml, ypacapy.db)
- SecurityLevel
- RawExec
- themes.js
- Engine enum
- LegacyGuard
- Tauri capabilities
- Collection Info dialog ($collStats: count, sizes, indexes, validator)
- @tauri-apps/api
- scripts
- About dialog (modal over the workspace)
- Applied
- Connect preview helpers
- Redis preview helpers
- Updates preview helpers
- Table preview helpers
- Saved queries sidebar
- ypacapy root
- SslMode

## God Nodes (most connected - your core abstractions)
1. `State` - 53 edges
2. `useStore` - 47 edges
3. `icoC()` - 33 edges
4. `DiagramPane()` - 28 edges
5. `run()` - 27 edges
6. `DocCards()` - 27 edges
7. `ResultGrid()` - 26 edges
8. `useCurrent()` - 26 edges
9. `react` - 25 edges
10. `run()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `savedAt()` --semantically_similar_to--> `savedAtLabel()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/lib/diagramTab.ts
- `diagram.html (ER diagram preview)` --semantically_similar_to--> `DiagramPane()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/components/DiagramPane.tsx
- `Tables to draw picker dialog` --semantically_similar_to--> `Picker()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/components/DiagramPane.tsx
- `Strict: passphrase dialog (optional Touch ID)` --semantically_similar_to--> `GuardModal()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Modals.tsx
- `Query history sidebar` --semantically_similar_to--> `HistorySide()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Sidebar.tsx

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

## Communities (93 total, 7 thin omitted)

### Community 0 - "MongoDB driver"
Cohesion: 0.06
Nodes (47): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+39 more)

### Community 1 - "BSON values"
Cohesion: 0.06
Nodes (42): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, command_kind() (+34 more)

### Community 2 - "DiagramPane.tsx"
Cohesion: 0.09
Nodes (22): palette(), blobBase64(), Box, BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog() (+14 more)

### Community 3 - "Home.tsx"
Cohesion: 0.08
Nodes (26): Pinned query tabs, react, GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename() (+18 more)

### Community 4 - "Result grid with cell inspector, on-screen sort and copy/export menus"
Cohesion: 0.18
Nodes (12): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu, context menu), openCellMenu() (copy value / row as Plain text, JSON, Markdown, CSV), Result grid with cell inspector, on-screen sort and copy/export menus, pick() (grid cell select + inspector, collection), Cell context menu (Copy value / Copy row as), fillCols() (Go to column menu) (+4 more)

### Community 5 - "DB runtime types"
Cohesion: 0.05
Nodes (15): Affected, BEAT_WAIT, ColumnBrief, EditRequest, HARD_CAP, Link, impl_affected!, impl_cells! (+7 more)

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
Cohesion: 0.11
Nodes (26): AnyFormat, Cell(), DocsActions(), GridRow, jsonHtml(), MenuButton(), MenuItem, SaveError (+18 more)

### Community 10 - "AuthDialog.tsx"
Cohesion: 0.14
Nodes (13): AuthDialog(), Caps(), Err(), Head(), PASS, PassField(), PassKind, PassphraseDialog() (+5 more)

### Community 11 - "diagram.ts"
Cohesion: 0.12
Nodes (29): anchorY(), BODY_PAD, Box, boxSize(), Cardinality, cardinality(), DiagramColumn, DiagramDetail (+21 more)

### Community 12 - "Guard icons"
Cohesion: 0.06
Nodes (40): Strict: passphrase dialog (optional Touch ID), ALL_KINDS, CollInfoModal(), CONN_TABS, ConnTab, Final(), GuardModal(), KeyInfoModal() (+32 more)

### Community 13 - "Redis and Mongo config"
Cohesion: 0.19
Nodes (20): b(), c(), cell(), col(), entries(), escaped(), items(), KeyPage (+12 more)

### Community 14 - "History sidebar"
Cohesion: 0.13
Nodes (26): Clear history dialog, Query history sidebar, JsonLine(), KeyPane(), PARTS, prettyJson(), foldKeys(), HistorySide() (+18 more)

### Community 15 - "App.tsx"
Cohesion: 0.11
Nodes (27): index.html (Vite app entry), App(), ConnWork(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), CollectionPane(), beatOn() (+19 more)

### Community 16 - "Updater chip preview"
Cohesion: 0.07
Nodes (25): Install failed state (signature mismatch, rolled back, 0.0.1 unchanged, Download from GitHub), app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+17 more)

### Community 17 - "guard.rs"
Cohesion: 0.05
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "State"
Cohesion: 0.05
Nodes (4): Edits, State, Approval, Saved

### Community 19 - "Changelog features"
Cohesion: 0.10
Nodes (30): About dialog (version, update state, dev git info), Added, Mongo Fields and Indexes views (no collection sampling), mongosh console (parsed, never run as JavaScript), Settings sections (General, Appearance, Queries, Security, Data on this Mac, Updates), Tabs bar (min-width shrink, sideways scroll, edge fade), Lucide 'code-xml' icon (teal #1abc9c), Lucide 'folder-tree' icon (teal #1abc9c) (+22 more)

### Community 20 - "README icons"
Cohesion: 0.11
Nodes (22): Lucide 'ban' icon (teal #1abc9c), Lucide 'check' icon (teal #1abc9c), Lucide 'circle-help' icon (teal #1abc9c), Lucide 'download' icon (teal #1abc9c), Lucide 'feather' icon (teal #1abc9c), Lucide 'hard-drive' icon (teal #1abc9c), Lucide 'keyboard' icon (teal #1abc9c), Lucide 'lightbulb' icon (teal #1abc9c) (+14 more)

### Community 21 - "themes.ts"
Cohesion: 0.17
Nodes (21): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 22 - "Pool"
Cohesion: 0.16
Nodes (21): apply(), catalog(), conn(), connect(), execute(), first(), on_pool!, Open (+13 more)

### Community 23 - "apply_edits"
Cohesion: 0.09
Nodes (20): apply_edits(), capitalise(), Cells, Collected, ColMeta, done(), Exec, Cancelled (+12 more)

### Community 24 - "find"
Cohesion: 0.27
Nodes (14): clean_group(), ConnLock, delete_connection(), duplicate_connection(), find(), new_id(), now_ms(), save_connection() (+6 more)

### Community 25 - "DocCards.tsx"
Cohesion: 0.07
Nodes (69): DocCards(), card(), example(), line(), removeUndo(), send(), DocEdit, EMPTY (+61 more)

### Community 26 - "Rust cache workflow"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 27 - "types.ts"
Cohesion: 0.13
Nodes (23): KeyFolder, CollInfo, ColumnBrief, Conn, ErdColumn, ErdKey, HistoryEntry, KeyInfo (+15 more)

### Community 28 - "complete.ts"
Cohesion: 0.05
Nodes (51): layout() (schema tree filter), ac-data JSON (schemas, tables, columns), accept() (insert suggestion via insertText), window.acShow (autocomplete presets), build() (suggestion list), cols() / fetchCols() column cache, context() (caret statement/clause/table refs), paint() (editor highlight) (+43 more)

### Community 29 - "Keychain"
Cohesion: 0.12
Nodes (17): password_for(), set_passphrase(), check_passphrase(), clear_passphrase(), derive(), get(), get_string(), has_passphrase() (+9 more)

### Community 30 - "Connections store"
Cohesion: 0.11
Nodes (22): Card menu (Edit connection, Duplicate, Move to group, New group, Remove from group, Remove connection), Card drag-and-drop between groups, Connection card (engine tile, name, address, last opened), Connection groups (Production, Staging, Ungrouped), Connections home (grouped connection cards), dropOn(), dup() (duplicate connection), Duplicated toast (Duplicated as shop_prod copy) (+14 more)

### Community 31 - "DbState"
Cohesion: 0.17
Nodes (19): cancel_query on the test's id (Stop test), cancel_query(), check_schema(), close_connection(), col(), DbState, err_text(), load_schema() (+11 more)

### Community 32 - "Redis previews"
Cohesion: 0.12
Nodes (22): key.html (Redis key preview), redis.html (Redis connection preview), ask() (write guard dialog for DEL / KEYS), Expiring only filter (TTL keys), Guard dialogs: confirm (Low) and passphrase with Touch ID (Strict), Key Info dialog (TYPE, OBJECT encoding, MEMORY USAGE, idle time), Key row menu (Open key, New command, Copy name, Info, Delete key), window.mInfo() (Info dialog preview states) (+14 more)

### Community 33 - "package.json"
Cohesion: 0.09
Nodes (29): dependencies, lucide-react@1.75.0, react@^18.3.1, sql-formatter@15.9.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-process@^2, @tauri-apps/plugin-updater@^2 (+21 more)

### Community 34 - "ERD catalog reads"
Cohesion: 0.18
Nodes (25): add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of(), kind_of() (+17 more)

### Community 35 - "Local store"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "themes.ts"
Cohesion: 0.12
Nodes (26): react-dom@^18.3.1, react-dom, AppStrip(), ConnTile(), EngineIcon(), fill(), GLYPHS, ld() (+18 more)

### Community 37 - ".redis"
Cohesion: 0.30
Nodes (9): DbState, err_text(), KeyInfo, KeyRequest, lost(), open_info(), redis_key(), redis_key_info() (+1 more)

### Community 38 - "Unreleased changelog"
Cohesion: 0.09
Nodes (30): Added, Changed, One ⋮ menu per connection card on Home, Duplicate a connection (own keychain item, same group), Lucide icons 1.75.0 upgrade (from 0.460.0), Collection Info ($collStats, read on open and Refresh), Documents as table (BSON-typed columns) or JSON, Write guard for MongoDB (write-method kinds, unknown runCommand asks) (+22 more)

### Community 39 - "CollectionPane.tsx"
Cohesion: 0.17
Nodes (7): Box(), ColKey, GridEdit, api, DEFAULT_ROW_LIMIT, ResultSet, TableTab

### Community 40 - "Build info and About"
Cohesion: 0.12
Nodes (24): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+16 more)

### Community 41 - "home.html (Home / Connections preview)"
Cohesion: 0.18
Nodes (18): about.html (About ypacapy preview), About preview bar (states: Up to date, Checking, Update available, Downloading, Installing, Ready to restart, Install failed, Dev build), Query workspace behind About (schema tree, history, saved queries, tabs, results), setPinned() (tab pin), Pinned query tabs (Pin/Unpin, Close skips pinned, diagrams unpinnable), diagram.html (ER diagram preview), home.html (Home / Connections preview), Connection search (name, host, user, database, file, engine, group; Cmd+F, Enter opens first, Esc clears) (+10 more)

### Community 42 - "Security level (None / Low / Strict)"
Cohesion: 0.08
Nodes (33): Security level picker for shop_prod (None, Low, Strict), setLevel() (security level), Column does not exist error with PostgreSQL HINT and one-click fix, Connection lost state, Low: Run this on shop_prod? confirm dialog, q2-fix handler (apply HINT column and rerun), runQuery(), setLevel() (write guard) (+25 more)

### Community 43 - "CHANGELOG.md"
Cohesion: 0.25
Nodes (8): [0.0.1] - 2026-11-18, Changelog, Keep a Changelog + Semantic Versioning, Release pipeline (GitHub Actions draft release, latest.json, notes from CHANGELOG), Lucide 'rocket' icon (teal #1abc9c), Cutting a release (tag vX.Y.Z, draft release, publish by hand), release.yml workflow (aarch64 + x86_64 bundles, latest.json), Tauri updater signing key secrets

### Community 44 - "QueryPane.tsx"
Cohesion: 0.06
Nodes (53): Redis command console (redis-cli commands in Query tabs), CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunGroup(), RunMeta() (+45 more)

### Community 45 - "vite.config.ts"
Cohesion: 0.29
Nodes (6): vite@^5.4.10, @vitejs/plugin-react@^4.3.2, vite, @vitejs/plugin-react, devBuild(), git()

### Community 46 - "Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates)"
Cohesion: 0.10
Nodes (21): openSub() (connect preview), Per-connection Queries options (row limit / page size, timeout, heartbeat), Settings Appearance pane (theme, scheme per appearance, compact, three fonts), apply() (settings preview), closeSub() (settings preview), Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates), go() (settings pane switch), openSub() (settings preview) (+13 more)

### Community 47 - "Connect URL sync"
Cohesion: 0.16
Nodes (16): fromUrl() (URL to fields), layout() (per-engine field visibility), mongoUrl() (mongodb / mongodb+srv URL), window.pvShow (connect states), pvStart() (connect preview), redisUrl() (redis / rediss URL), save_connection Tauri command, selectTab() (connection settings tabs) (+8 more)

### Community 48 - "Estimated document counts (~48k from collection metadata, not a count)"
Cohesion: 0.22
Nodes (4): Collection Documents view (Table or JSON, 20 per page in stored order), Tables to draw picker dialog, Redis key tree (prefix folders, type badges, TTL marks), Expiring-only key filter (rTtlOnly)

### Community 49 - "render() (table preview)"
Cohesion: 0.29
Nodes (7): Table Columns view, Table Indexes and Foreign keys view, Filter matches nothing state, window.pvShow (table states), reload() (table preview), render() (table preview), Table where-clause filter

### Community 50 - "TypeScript config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 51 - "updater.ts"
Cohesion: 0.19
Nodes (13): Dev build card (channel, git-describe version, branch, commit, updates off in dev builds), Release notes list (first 3, rest behind Show all N changes), Show all / Show less release notes handler, show(), step() (About updater/dev card switch), Updater state cards (checking, current, available, downloading, installing, ready, failed), checkForUpdate(), hasPendingUpdate() (+5 more)

### Community 52 - "SettingsState"
Cohesion: 0.21
Nodes (8): run(), config_dir(), config_path(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 53 - "redis.rs"
Cohesion: 0.15
Nodes (14): against_a_server(), client(), connect(), db_of(), group(), reads_the_database_number(), ScanKey, ScanPage (+6 more)

### Community 54 - "store.ts"
Cohesion: 0.08
Nodes (26): save(), Saved diagram (tables, positions, zoom, detail), positionsOf(), flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable (+18 more)

### Community 55 - "find"
Cohesion: 0.16
Nodes (23): Conn, conn(), ConnFile, copy_name(), copy_names_skip_taken_ones(), group_is_trimmed_and_blank_is_none(), keep_history_overrides_settings_only_when_set(), list_connections() (+15 more)

### Community 56 - "ConnectModal"
Cohesion: 0.17
Nodes (20): AppearancePane(), ConnectModal(), ConnQueriesPane(), ConnSecurityPane(), connUrl(), DataPane(), FontRow(), fromTri() (+12 more)

### Community 57 - "connect.html (New connection preview)"
Cohesion: 0.13
Nodes (16): connect.html (New connection preview), Advanced tab (app name, connect timeout; Mongo replica set/read preference/direct; Redis key separator, keys per scan), New connection dialog form (Name, Color, Group; General/Options/SSL/Advanced tabs), drawGroup(), Group picker (No group, Home groups, New group...), Security level picker ([data-level-pick], connect), Statements / writes / commands to ask about (per engine), renderLevel() (+8 more)

### Community 58 - "run"
Cohesion: 0.33
Nodes (6): run(), Step, Cancelled, Done, Failed, summary()

### Community 59 - "diagramTab.ts"
Cohesion: 0.15
Nodes (17): DiagramLayout, DiagramModel, diagramModel(), tableKey(), withMoves(), diagramCanSave(), diagramChanged(), diagramKey() (+9 more)

### Community 60 - "GuardState"
Cohesion: 0.13
Nodes (18): Passphrase sub-dialogs (set, change, disable, reset/forgot, unlock), Approval, Confirm, Passphrase, TouchId, approve_default_lowering(), approve_lowering(), authenticate() (+10 more)

### Community 61 - "render() (key head and value page)"
Cohesion: 0.25
Nodes (9): fillInfo() (key Info dialog), Key gone state (TYPE -> none), Key head (type badge, length, TTL, encoding, db), window.pvShow (key states), reload() (key re-read), render() (key head and value page), window.RKEYS (per-type key fixtures), setName() (long key keeps its end in view) (+1 more)

### Community 62 - "check_kinds"
Cohesion: 0.27
Nodes (8): Ask, check(), check_sql(), Classified, Warning, BigLimit, UpdateAll, warnings()

### Community 63 - "ROpen"
Cohesion: 0.31
Nodes (3): heartbeat(), open_one(), ROpen

### Community 64 - "window.Erd (inlined src/lib/diagram.ts + diagramExport.ts)"
Cohesion: 0.12
Nodes (23): apply() (draw picked tables), askClose(), Selection cardinality marks and linked columns, changed(), Linked table from another schema (outside box), draw(), window.Erd (inlined src/lib/diagram.ts + diagramExport.ts), window.ERD_DATA / ERD_LINKS sample catalog (+15 more)

### Community 65 - "Fonts"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 66 - "classify"
Cohesion: 0.17
Nodes (15): big_limits_warn_above_100(), classify(), classify_tokens(), dialect(), fallback_tokenizer(), is_final(), kinds(), reads_never_ask() (+7 more)

### Community 67 - "start_heartbeat"
Cohesion: 0.43
Nodes (4): Beat, beat_pool!, heartbeat(), start_heartbeat()

### Community 68 - "paths.rs"
Cohesion: 0.32
Nodes (4): base64(), decode_base64(), expand_tilde(), write_binary_file()

### Community 69 - "AGENTS.md"
Cohesion: 0.13
Nodes (15): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), app-icon.svg (ypacapy app icon), White capybara head soaking in the cylinder, Database cylinder as hot-spring tub, Teal gradient rounded tile (#2fd3b0 to #0a6e5d), Yuzu (yellow fruit with green leaf) on capybara's head, CLAUDE.md (symlink to AGENTS.md) (+7 more)

### Community 70 - "render() (collection view/state)"
Cohesion: 0.33
Nodes (6): Collection Fields view (fields seen on this page), Collection Indexes view (keys, unique, partial/sparse options), Filter matches nothing state (with values seen hint), reload() (collection run), render() (collection view/state), valid() (bracket/comma parser stand-in)

### Community 72 - "~/.config/ypacapy (settings.toml, connections.toml, ypacapy.db)"
Cohesion: 0.16
Nodes (14): ER diagrams (ported from opengrip, Apache-2.0), opengrip diagram view (Apache-2.0 source), Lucide 'database' icon (teal #1abc9c), Lucide 'history' icon (teal #1abc9c), Lucide 'network' icon (teal #1abc9c), ~/.config/ypacapy (settings.toml, connections.toml, ypacapy.db), ER diagram table picker (catalog-only reads), ER diagrams (+6 more)

### Community 73 - "SecurityLevel"
Cohesion: 0.50
Nodes (4): SecurityLevel, Low, None, Strict

### Community 75 - "themes.js"
Cohesion: 0.10
Nodes (24): apply() (theme/density), setFont(), writeUrl(), collection.html (MongoDB collection preview), apply() (collection preview theme/density), Open in console (query as db.orders.find in a new tab), writeUrl() (collection preview), apply() (theme/density) (+16 more)

### Community 76 - "Engine enum"
Cohesion: 0.29
Nodes (6): Engine, Mongo, Mysql, Postgres, Redis, Sqlite

### Community 77 - "LegacyGuard"
Cohesion: 0.50
Nodes (4): LegacyGuard, Confirm, Run, Verify

### Community 78 - "Tauri capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 79 - "Collection Info dialog ($collStats: count, sizes, indexes, validator)"
Cohesion: 0.40
Nodes (5): Collection Info dialog ($collStats: count, sizes, indexes, validator), window.mInfo (Info dialog preview states), window.pvShow (collection states), Key Info dialog (TYPE, OBJECT ENCODING, MEMORY USAGE), Collection Info dialog ($collStats, mongo console)

### Community 80 - "@tauri-apps/api"
Cohesion: 0.40
Nodes (4): @tauri-apps/api@^2.0.0, @tauri-apps/api, FontList, systemFonts()

### Community 81 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, tauri, typecheck

### Community 85 - "About dialog (modal over the workspace)"
Cohesion: 0.29
Nodes (7): About dialog (modal over the workspace), Version copy handler (clipboard, Copied for 1.4s), Copyable version button (copies 'ypacapy vX' for bug reports), GitHub and Report an issue links (github.com/jimmyfish/ypacapy), Capybara app icon in its onsen (steam, ripple rings), Onsen click handler (restart ping animation), REPO_URL

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

### Community 101 - "SslMode"
Cohesion: 0.33
Nodes (6): SslMode, Disable, Prefer, Require, VerifyCa, VerifyFull

## Ambiguous Edges - Review These
- `Lucide 'users' icon (teal #1abc9c)` → `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`  [AMBIGUOUS]
  README.md · relation: references

## Knowledge Gaps
- **128 isolated node(s):** `ypacapy`, `Postgres`, `Mysql`, `Sqlite`, `Mongo` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 572 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where things live (module map)` connect `AGENTS.md` to `Fonts`, `Local store`, `paths.rs`, `DB runtime types`, `guard.rs`, `SettingsState`, `store.ts`, `find`, `types.ts`, `Keychain`?**
  _High betweenness centrality (0.371) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `run()` (e.g. with `capitalise()` and `summary()`) actually correct?**
  _`run()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ypacapy`, `Postgres`, `Mysql` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MongoDB driver` be split into smaller, more focused modules?**
  _Cohesion score 0.05873340143003064 - nodes in this community are weakly interconnected._
- **Why does `home.html (Home / Connections preview)` connect `home.html (Home / Connections preview)` to `Redis previews`, `connect.html (New connection preview)`, `themes.js`, `Connections store`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `BSON values` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Lucide 'users' icon (teal #1abc9c)` and `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._