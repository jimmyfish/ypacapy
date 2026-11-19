# Graph Report - ypacapy  (2026-11-19)

## Corpus Check
- 74 files · ~274,864 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 1968 nodes · 4513 edges · 103 communities (89 shown, 14 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 299 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e569055b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MongoDB driver
- BSON values
- Diagram pane UI
- Home and groups
- Result grid with cell inspector, on-screen sort and copy/export menus
- DB runtime types
- Brand and graph docs
- Release workflow
- redis-cli parser
- Grid icons
- QueryPane.tsx
- Store actions
- Guard icons
- Redis and Mongo config
- History sidebar
- Diagram layout engine
- Updater chip preview
- guard.rs
- API and types
- Changelog features
- README icons
- Diagram preview script
- Catalog commands
- Workspace persistence
- Pool
- BSON cells
- Rust cache workflow
- Collection preview
- complete.ts
- Keychain
- Connections store
- conns.rs
- Redis previews
- Dependencies
- ERD catalog reads
- Local store
- themes.ts
- Redis state
- Unreleased changelog
- Settings and connect
- Build info and About
- home.html (Home / Connections preview)
- Security level (None / Low / Strict)
- useStore
- edit.ts
- lib.rs
- Connect dialog preview
- Connect URL sync
- devDependencies
- render() (mongo tab/result state)
- TypeScript config
- Updater cards
- SettingsState
- Redis connection
- Quiet on your server: catalog lookups only, planner estimates never count(*)
- Grid edit apply
- RawExec
- Picker.tsx
- Window artwork
- UpdateChip
- GuardState
- CHANGELOG.md
- check_kinds
- Cmd
- Result cells
- Fonts
- classify
- EngineIcon.tsx
- connect
- AGENTS.md
- Estimated document counts (~48k from collection metadata, not a count)
- render() (key head and value page)
- paths.rs
- About dialog preview
- ER diagram docs
- Tables to draw picker dialog
- Engine enum
- ask() (key write guard confirm)
- Tauri capabilities
- SSL modes
- render() (table preview)
- scripts
- Collection Info dialog ($collStats: count, sizes, indexes, validator)
- rediscli.ts
- Applied
- Legacy guard
- MongoTls
- SecurityLevel
- Connect preview helpers
- Redis preview helpers
- Updates preview helpers
- Table preview helpers
- Password kept in macOS login keychain
- Saved queries sidebar
- ypacapy root

## God Nodes (most connected - your core abstractions)
1. `State` - 50 edges
2. `useStore` - 37 edges
3. `icoC()` - 29 edges
4. `DiagramPane()` - 28 edges
5. `useCurrent()` - 26 edges
6. `ResultGrid()` - 25 edges
7. `run()` - 24 edges
8. `exec()` - 23 edges
9. `Added` - 23 edges
10. `react` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Strict: passphrase dialog (optional Touch ID)` --semantically_similar_to--> `GuardModal()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Modals.tsx
- `savedAt()` --semantically_similar_to--> `savedAtLabel()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/lib/diagramTab.ts
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

## Communities (103 total, 14 thin omitted)

### Community 0 - "MongoDB driver"
Cohesion: 0.06
Nodes (49): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+41 more)

### Community 1 - "BSON values"
Cohesion: 0.09
Nodes (35): command_kind(), date(), describe(), err(), errors_point_at_the_place(), guard_kinds(), int(), kind() (+27 more)

### Community 2 - "Diagram pane UI"
Cohesion: 0.08
Nodes (21): palette(), blobBase64(), BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog(), DETAILS (+13 more)

### Community 3 - "Home and groups"
Cohesion: 0.07
Nodes (23): index.html (Vite app entry), react, react-dom, GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS (+15 more)

### Community 4 - "Result grid with cell inspector, on-screen sort and copy/export menus"
Cohesion: 0.18
Nodes (12): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu, context menu), openCellMenu() (copy value / row as Plain text, JSON, Markdown, CSV), Result grid with cell inspector, on-screen sort and copy/export menus, pick() (grid cell select + inspector, collection), Cell context menu (Copy value / Copy row as), fillCols() (Go to column menu) (+4 more)

### Community 5 - "DB runtime types"
Cohesion: 0.05
Nodes (14): Affected, ColumnBrief, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, OpenInfo (+6 more)

### Community 6 - "Brand and graph docs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 7 - "Release workflow"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 8 - "redis-cli parser"
Cohesion: 0.10
Nodes (23): classifies_for_the_guard(), EXPIRE, FLUSH, HASHES, is_final(), KEYS_W, KINDS, LISTS (+15 more)

### Community 9 - "Grid icons"
Cohesion: 0.07
Nodes (31): AnyFormat, Cell(), ColKey, GridRow, jsonHtml(), MenuItem, SaveError, ShellText() (+23 more)

### Community 10 - "QueryPane.tsx"
Cohesion: 0.17
Nodes (17): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunMeta(), GridEdit, EditTarget (+9 more)

### Community 11 - "Store actions"
Cohesion: 0.05
Nodes (4): Edits, State, Saved, Settings

### Community 12 - "Guard icons"
Cohesion: 0.06
Nodes (49): ALL_KINDS, AppearancePane(), CollInfoModal(), CONN_TABS, ConnectModal(), ConnTab, connUrl(), DataPane() (+41 more)

### Community 13 - "Redis and Mongo config"
Cohesion: 0.11
Nodes (26): plural(), b(), cell(), entries(), escaped(), items(), KeyInfo, KeyPage (+18 more)

### Community 14 - "History sidebar"
Cohesion: 0.09
Nodes (40): Clear history dialog, Query history sidebar, ConnWork(), Box(), CollectionPane(), icoC(), JsonLine(), KeyPane() (+32 more)

### Community 15 - "Diagram layout engine"
Cohesion: 0.13
Nodes (27): Box, anchorY(), BODY_PAD, Box, Cardinality, cardinality(), DiagramColumn, DiagramDetail (+19 more)

### Community 16 - "Updater chip preview"
Cohesion: 0.08
Nodes (25): Install failed state (signature mismatch, rolled back, 0.0.1 unchanged, Download from GitHub), app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+17 more)

### Community 17 - "guard.rs"
Cohesion: 0.06
Nodes (18): ALTER, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT, INSERT (+10 more)

### Community 18 - "API and types"
Cohesion: 0.08
Nodes (31): UrlParts, KeyFolder, Approval, Ask, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL (+23 more)

### Community 19 - "Changelog features"
Cohesion: 0.10
Nodes (29): About dialog (version, update state, dev git info), Added, Settings sections (General, Appearance, Queries, Security, Data on this Mac, Updates), Tabs bar (min-width shrink, sideways scroll, edge fade), Lucide 'database' icon (teal #1abc9c), Lucide 'folder-tree' icon (teal #1abc9c), Lucide 'history' icon (teal #1abc9c), Lucide 'palette' icon (teal #1abc9c) (+21 more)

### Community 20 - "README icons"
Cohesion: 0.11
Nodes (22): Lucide 'ban' icon (teal #1abc9c), Lucide 'check' icon (teal #1abc9c), Lucide 'circle-help' icon (teal #1abc9c), Lucide 'download' icon (teal #1abc9c), Lucide 'feather' icon (teal #1abc9c), Lucide 'hard-drive' icon (teal #1abc9c), Lucide 'keyboard' icon (teal #1abc9c), Lucide 'lightbulb' icon (teal #1abc9c) (+14 more)

### Community 21 - "Diagram preview script"
Cohesion: 0.09
Nodes (29): apply() (draw picked tables), askClose(), Selection cardinality marks and linked columns, changed(), Linked table from another schema (outside box), draw(), window.Erd (inlined src/lib/diagram.ts + diagramExport.ts), window.ERD_DATA / ERD_LINKS sample catalog (+21 more)

### Community 22 - "Catalog commands"
Cohesion: 0.19
Nodes (21): apply_edits(), cancel_query(), capitalise(), check_schema(), close_connection(), col(), DbState, err_text() (+13 more)

### Community 23 - "Workspace persistence"
Cohesion: 0.09
Nodes (20): Picker(), api, positionsOf(), withLinked(), flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery (+12 more)

### Community 24 - "Pool"
Cohesion: 0.15
Nodes (24): apply(), conn(), connect(), execute(), first(), on_pool!, Open, open() (+16 more)

### Community 25 - "BSON cells"
Cohesion: 0.23
Nodes (21): BsonType, cellText(), cellValue(), docsToSet(), fieldsOf(), iso(), isObj(), key() (+13 more)

### Community 26 - "Rust cache workflow"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 27 - "Collection preview"
Cohesion: 0.11
Nodes (23): apply() (theme/density), setFont(), writeUrl(), collection.html (MongoDB collection preview), apply() (collection preview theme/density), Open in console (query as db.orders.find in a new tab), writeUrl() (collection preview), apply() (theme/density) (+15 more)

### Community 28 - "complete.ts"
Cohesion: 0.06
Nodes (51): ac-data JSON (schemas, tables, columns), accept() (insert suggestion via insertText), window.acShow (autocomplete presets), build() (suggestion list), cols() / fetchCols() column cache, context() (caret statement/clause/table refs), paint() (editor highlight), window.pvShow (query states) (+43 more)

### Community 29 - "Keychain"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 30 - "Connections store"
Cohesion: 0.13
Nodes (22): Card menu (Edit connection, Duplicate, Move to group, New group, Remove from group, Remove connection), Card drag-and-drop between groups, Connection card (engine tile, name, address, last opened), Connection groups (Production, Staging, Ungrouped), Connection search (name, host, user, database, file, engine, group; Cmd+F, Enter opens first, Esc clears), dropOn(), dup() (duplicate connection), Duplicated toast (Duplicated as shop_prod copy) (+14 more)

### Community 31 - "conns.rs"
Cohesion: 0.17
Nodes (28): clean_group(), Conn, conn(), ConnFile, ConnLock, copy_name(), copy_names_skip_taken_ones(), delete_connection() (+20 more)

### Community 32 - "Redis previews"
Cohesion: 0.12
Nodes (22): key.html (Redis key preview), redis.html (Redis connection preview), ask() (write guard dialog for DEL / KEYS), Expiring only filter (TTL keys), Guard dialogs: confirm (Low) and passphrase with Touch ID (Strict), Key Info dialog (TYPE, OBJECT encoding, MEMORY USAGE, idle time), Key row menu (Open key, New command, Copy name, Info, Delete key), window.mInfo() (Info dialog preview states) (+14 more)

### Community 33 - "Dependencies"
Cohesion: 0.11
Nodes (23): dependencies, lucide-react@1.75.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+15 more)

### Community 34 - "ERD catalog reads"
Cohesion: 0.19
Nodes (25): catalog(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of() (+17 more)

### Community 35 - "Local store"
Cohesion: 0.21
Nodes (14): new_id(), now_ms(), clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved() (+6 more)

### Community 36 - "themes.ts"
Cohesion: 0.16
Nodes (21): SchemeRow(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 37 - "Redis state"
Cohesion: 0.28
Nodes (9): DbState, err_text(), heartbeat(), lost(), open_info(), redis_key(), redis_key_info(), redis_scan() (+1 more)

### Community 38 - "Unreleased changelog"
Cohesion: 0.16
Nodes (16): Added, Changed, One ⋮ menu per connection card on Home, Duplicate a connection (own keychain item, same group), Lucide icons 1.75.0 upgrade (from 0.460.0), Collection Info ($collStats, read on open and Refresh), Documents as table (BSON-typed columns) or JSON, MongoDB connections (host/port, seed list, SRV, URL, TLS/X.509) (+8 more)

### Community 39 - "Settings and connect"
Cohesion: 0.10
Nodes (19): Per-connection Queries options (row limit / page size, timeout, heartbeat), Settings Appearance pane (theme, scheme per appearance, compact, three fonts), apply() (settings preview), closeSub() (settings preview), Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates), go() (settings pane switch), window.pvShow (settings state switcher), Settings Queries pane (row limit, statement timeout, history, heartbeat) (+11 more)

### Community 40 - "Build info and About"
Cohesion: 0.14
Nodes (21): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+13 more)

### Community 41 - "home.html (Home / Connections preview)"
Cohesion: 0.16
Nodes (18): about.html (About ypacapy preview), About preview bar (states: Up to date, Checking, Update available, Downloading, Installing, Ready to restart, Install failed, Dev build), Query workspace behind About (schema tree, history, saved queries, tabs, results), setPinned() (tab pin), Pinned query tabs (Pin/Unpin, Close skips pinned, diagrams unpinnable), diagram.html (ER diagram preview), home.html (Home / Connections preview), Connection tab colour picker (Flat UI: Turquoise, Emerald, Sunflower, Carrot, Alizarin, River, Asphalt, Amethyst) (+10 more)

### Community 42 - "Security level (None / Low / Strict)"
Cohesion: 0.16
Nodes (15): Security level picker for shop_prod (None, Low, Strict), setLevel() (security level), Low: Run this on shop_prod? confirm dialog, Strict: passphrase dialog (optional Touch ID), setLevel() (write guard), Security level (None / Low / Strict), Redis write guard (picked commands; Use SCAN instead), ask() (open guard dialog for a write kind) (+7 more)

### Community 43 - "useStore"
Cohesion: 0.27
Nodes (12): App(), stack(), useTheme(), useTypeTokens(), LevelSelect(), KeyInfoModal(), PassDialog(), PassphraseManager() (+4 more)

### Community 44 - "edit.ts"
Cohesion: 0.12
Nodes (26): useEditTarget(), CellEditor(), ResultGrid(), kindOf(), AFTER_FROM, applied(), column(), editCount() (+18 more)

### Community 45 - "lib.rs"
Cohesion: 0.15
Nodes (7): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS

### Community 46 - "Connect dialog preview"
Cohesion: 0.13
Nodes (16): connect.html (New connection preview), Advanced tab (app name, connect timeout; Mongo replica set/read preference/direct; Redis key separator, keys per scan), New connection dialog form (Name, Color, Group; General/Options/SSL/Advanced tabs), drawGroup(), Group picker (No group, Home groups, New group...), Security level picker ([data-level-pick], connect), Statements / writes / commands to ask about (per engine), renderLevel() (+8 more)

### Community 47 - "Connect URL sync"
Cohesion: 0.18
Nodes (16): cancel_query on the test's id (Stop test), fromUrl() (URL to fields), layout() (per-engine field visibility), mongoUrl() (mongodb / mongodb+srv URL), window.pvShow (connect states), pvStart() (connect preview), redisUrl() (redis / rediss URL), save_connection Tauri command (+8 more)

### Community 48 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @tauri-apps/cli@^2.0.0, @types/react@^18.3.11, @types/react-dom@^18.3.1, typescript@^5.6.3, vite@^5.4.10, @vitejs/plugin-react@^4.3.2, @tauri-apps/cli (+7 more)

### Community 49 - "render() (mongo tab/result state)"
Cohesion: 0.19
Nodes (13): Column does not exist error with PostgreSQL HINT and one-click fix, Connection lost state, q2-fix handler (apply HINT column and rerun), runQuery(), SQL error state with database HINT fix, No primary state (server selection timed out, Reconnect), q3-fix handler (rewrite $inn to $in and rerun), mongosh query editor (Query 1-5 tabs) (+5 more)

### Community 50 - "TypeScript config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 51 - "Updater cards"
Cohesion: 0.19
Nodes (13): Dev build card (channel, git-describe version, branch, commit, updates off in dev builds), Release notes list (first 3, rest behind Show all N changes), Show all / Show less release notes handler, show(), step() (About updater/dev card switch), Updater state cards (checking, current, available, downloading, installing, ready, failed), checkForUpdate(), hasPendingUpdate() (+5 more)

### Community 52 - "SettingsState"
Cohesion: 0.26
Nodes (8): run(), config_dir(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 53 - "Redis connection"
Cohesion: 0.19
Nodes (7): open_one(), ROpen, server_of(), Step, Cancelled, Done, Failed

### Community 54 - "Quiet on your server: catalog lookups only, planner estimates never count(*)"
Cohesion: 0.18
Nodes (14): Mongo Fields and Indexes views (no collection sampling), mongosh console (parsed, never run as JavaScript), Lucide 'code-xml' icon (teal #1abc9c), Lucide 'map' icon (teal #1abc9c), Back window: 'Revenue by city' SQL query + 9-row result (light), Autocomplete for tables, aliases and columns, <img src="docs/assets/icons/code-xml.svg" width="20" height="20" align="top" alt="" /> The SQL console, <img src="docs/assets/icons/code-xml.svg" width="24" height="24" align="top" alt="" /> Hack on it (+6 more)

### Community 55 - "Grid edit apply"
Cohesion: 0.15
Nodes (18): boxSize(), diagramModel(), layoutDiagram(), layoutWithSaved(), tableKey(), withMoves(), diagramCanSave(), diagramChanged() (+10 more)

### Community 57 - "Picker.tsx"
Cohesion: 0.11
Nodes (19): AppStrip(), SIDEBAR_DEFAULT, ConnTile(), EngineIcon(), ico, icoLg, ColorPicker(), ENGINE_LABELS (+11 more)

### Community 58 - "Window artwork"
Cohesion: 0.24
Nodes (11): Write guard for MongoDB (write-method kinds, unknown runCommand asks), Write guard for Redis (command groups, KEYS asks with Use SCAN), Security level pill in tabs bar (grey None, orange Low, red Strict), Lucide 'shield-check' icon (teal #1abc9c), Strict security-level pill in tabs bar (red), <img src="docs/assets/icons/shield-check.svg" width="24" height="24" align="top" alt="" /> The write guard, What to protect (INSERT, UPDATE, DELETE, REPLACE, ALTER, DROP, TRUNCATE, CREATE, GRANT, REVOKE), Security levels: None / Low / Strict (+3 more)

### Community 60 - "GuardState"
Cohesion: 0.16
Nodes (15): openSub() (connect preview), openSub() (settings preview), Passphrase sub-dialogs (set, change, disable, reset/forgot, unlock), approve_lowering(), authenticate(), authenticate_owner(), disable_passphrase(), evaluate() (+7 more)

### Community 61 - "CHANGELOG.md"
Cohesion: 0.25
Nodes (8): [0.0.1] - 2026-11-18, Changelog, Keep a Changelog + Semantic Versioning, Release pipeline (GitHub Actions draft release, latest.json, notes from CHANGELOG), Lucide 'rocket' icon (teal #1abc9c), Cutting a release (tag vX.Y.Z, draft release, publish by hand), release.yml workflow (aarch64 + x86_64 bundles, latest.json), Tauri updater signing key secrets

### Community 62 - "check_kinds"
Cohesion: 0.16
Nodes (14): Approval, Confirm, Passphrase, TouchId, Ask, check(), check_kinds(), check_sql() (+6 more)

### Community 63 - "Cmd"
Cohesion: 0.22
Nodes (11): c(), query(), Cmd, Kind, kind(), Read, Refused, Unknown (+3 more)

### Community 64 - "Result cells"
Cohesion: 0.12
Nodes (13): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet (+5 more)

### Community 65 - "Fonts"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 66 - "classify"
Cohesion: 0.20
Nodes (13): big_limits_warn_above_the_row_limit(), classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+5 more)

### Community 67 - "EngineIcon.tsx"
Cohesion: 0.44
Nodes (9): fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres(), Redis(), Sqlite() (+1 more)

### Community 68 - "connect"
Cohesion: 0.31
Nodes (10): against_a_server(), client(), connect(), db_of(), group(), reads_the_database_number(), secs(), test() (+2 more)

### Community 69 - "AGENTS.md"
Cohesion: 0.19
Nodes (10): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), app-icon.svg (ypacapy app icon), White capybara head soaking in the cylinder, Database cylinder as hot-spring tub, Teal gradient rounded tile (#2fd3b0 to #0a6e5d), Yuzu (yellow fruit with green leaf) on capybara's head, CLAUDE.md (symlink to AGENTS.md) (+2 more)

### Community 70 - "Estimated document counts (~48k from collection metadata, not a count)"
Cohesion: 0.33
Nodes (3): Collection Documents view (Table or JSON, 20 per page in stored order), Redis key tree (prefix folders, type badges, TTL marks), Expiring-only key filter (rTtlOnly)

### Community 71 - "render() (key head and value page)"
Cohesion: 0.25
Nodes (9): fillInfo() (key Info dialog), Key gone state (TYPE -> none), Key head (type badge, length, TTL, encoding, db), window.pvShow (key states), reload() (key re-read), render() (key head and value page), window.RKEYS (per-type key fixtures), setName() (long key keeps its end in view) (+1 more)

### Community 72 - "paths.rs"
Cohesion: 0.28
Nodes (4): base64(), config_path(), decode_base64(), write_binary_file()

### Community 73 - "About dialog preview"
Cohesion: 0.29
Nodes (7): About dialog (modal over the workspace), Version copy handler (clipboard, Copied for 1.4s), Copyable version button (copies 'ypacapy vX' for bug reports), GitHub and Report an issue links (github.com/jimmyfish/ypacapy), Capybara app icon in its onsen (steam, ripple rings), Onsen click handler (restart ping animation), REPO_URL

### Community 74 - "ER diagram docs"
Cohesion: 0.38
Nodes (7): ER diagrams (ported from opengrip, Apache-2.0), opengrip diagram view (Apache-2.0 source), Lucide 'network' icon (teal #1abc9c), ER diagram table picker (catalog-only reads), ER diagrams, <img src="docs/assets/icons/network.svg" width="20" height="20" align="top" alt="" /> ER diagrams, Saved diagram layout (⌘S)

### Community 75 - "Tables to draw picker dialog"
Cohesion: 0.33
Nodes (4): layout() (schema tree filter), Tables to draw picker dialog, Schema tree sidebar, layout() (schema tree filter)

### Community 76 - "Engine enum"
Cohesion: 0.29
Nodes (6): Engine, Mongo, Mysql, Postgres, Redis, Sqlite

### Community 77 - "ask() (key write guard confirm)"
Cohesion: 0.33
Nodes (6): ask() (key write guard confirm), Delete key (DEL via write guard), Expiry popover (EXPIRE / PERSIST), Hash field editing (HSET/HDEL in one MULTI), String value editing (SET ... KEEPTTL), cmd() (expiry command preview EXPIRE/PERSIST)

### Community 78 - "Tauri capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 79 - "SSL modes"
Cohesion: 0.33
Nodes (6): SslMode, Disable, Prefer, Require, VerifyCa, VerifyFull

### Community 80 - "render() (table preview)"
Cohesion: 0.17
Nodes (11): Collection query bar (filter, project, sort, skip, limit), reload() (collection run), valid() (bracket/comma parser stand-in), HSCAN/SSCAN MATCH field pattern, Table Columns view, Table Indexes and Foreign keys view, Filter matches nothing state, window.pvShow (table states) (+3 more)

### Community 81 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, tauri, typecheck

### Community 82 - "Collection Info dialog ($collStats: count, sizes, indexes, validator)"
Cohesion: 0.25
Nodes (9): Collection Fields view (fields seen on this page), Collection Indexes view (keys, unique, partial/sparse options), Collection Info dialog ($collStats: count, sizes, indexes, validator), window.mInfo (Info dialog preview states), Filter matches nothing state (with values seen hint), window.pvShow (collection states), render() (collection view/state), Key Info dialog (TYPE, OBJECT ENCODING, MEMORY USAGE) (+1 more)

### Community 83 - "rediscli.ts"
Cohesion: 0.60
Nodes (4): Redis command console (redis-cli commands in Query tabs), esc(), highlightRedis(), line()

### Community 84 - "Applied"
Cohesion: 0.40
Nodes (5): Applied, Done, Failed, Miss, TimedOut

### Community 85 - "Legacy guard"
Cohesion: 0.50
Nodes (4): LegacyGuard, Confirm, Run, Verify

### Community 86 - "MongoTls"
Cohesion: 0.50
Nodes (4): MongoTls, Insecure, Off, On

### Community 87 - "SecurityLevel"
Cohesion: 0.50
Nodes (4): SecurityLevel, Low, None, Strict

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
- **128 isolated node(s):** `Postgres`, `Mysql`, `Sqlite`, `Mongo`, `Redis` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 568 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where things live (module map)` connect `Quiet on your server: catalog lookups only, planner estimates never count(*)` to `Fonts`, `Local store`, `DB runtime types`, `paths.rs`, `guard.rs`, `API and types`, `SettingsState`, `Workspace persistence`, `Keychain`, `conns.rs`?**
  _High betweenness centrality (0.370) - this node is a cross-community bridge._
- **What connects `Postgres`, `Mysql`, `Sqlite` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MongoDB driver` be split into smaller, more focused modules?**
  _Cohesion score 0.05661729574773053 - nodes in this community are weakly interconnected._
- **Why does `redis.html (Redis connection preview)` connect `Redis previews` to `Settings and connect`, `home.html (Home / Connections preview)`, `Connect dialog preview`, `rediscli.ts`, `Collection preview`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `BSON values` be split into smaller, more focused modules?**
  _Cohesion score 0.08509615384615385 - nodes in this community are weakly interconnected._
- **Why does `home.html (Home / Connections preview)` connect `home.html (Home / Connections preview)` to `Password kept in macOS login keychain`, `Redis previews`, `Connect dialog preview`, `Collection preview`, `Connections store`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Lucide 'users' icon (teal #1abc9c)` and `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._