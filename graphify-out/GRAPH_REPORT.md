# Graph Report - ypacapy  (2026-11-19)

## Corpus Check
- 74 files · ~272,672 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 1947 nodes · 4517 edges · 90 communities (83 shown, 7 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 296 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `45e29116`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MongoDB driver
- BSON values
- Diagram pane UI
- Home and groups
- Result grid previews
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
- SQL pools and exec
- BSON cells
- Rust cache workflow
- Collection preview
- SQL autocomplete
- Keychain
- Connections store
- Connection groups UI
- Redis previews
- Dependencies
- ERD catalog reads
- Local store
- themes.ts
- Redis state
- Unreleased changelog
- Settings and connect
- Build info and About
- Preview pages
- SQL error and guard
- App shell
- edit.ts
- diagram.ts
- Connect dialog preview
- Connect URL sync
- vite.config.ts
- Collection pane
- TypeScript config
- Updater cards
- lib.rs
- Redis connection
- Quiet on your server: catalog lookups only, planner estimates never count(*)
- Grid edit apply
- Pool
- runs
- Window artwork
- UpdateChip
- Autocomplete preview
- Update steps: available, downloading, installing, ready to restart, failed
- q2-fix handler (apply HINT column and rerun)
- Connection CRUD
- Result cells
- Fonts
- useStore
- @tauri-apps/api
- Exec stream
- Changelog and README
- Security level previews
- About dialog preview
- ER diagram docs
- Schema tree preview
- Engine enum
- Key editing preview
- Tauri capabilities
- SSL modes
- UpdateChip.tsx
- npm scripts
- Legacy guard
- Security levels
- Connect preview helpers
- Redis preview helpers
- Updates preview helpers
- Table preview helpers
- Saved queries sidebar
- ypacapy root

## God Nodes (most connected - your core abstractions)
1. `State` - 50 edges
2. `useStore` - 37 edges
3. `icoC()` - 29 edges
4. `run()` - 28 edges
5. `DiagramPane()` - 28 edges
6. `run()` - 26 edges
7. `useCurrent()` - 26 edges
8. `ResultGrid()` - 25 edges
9. `exec()` - 24 edges
10. `react` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Strict: passphrase dialog (optional Touch ID)` --semantically_similar_to--> `GuardModal()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Modals.tsx
- `savedAt()` --semantically_similar_to--> `savedAtLabel()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/lib/diagramTab.ts
- `diagram.html (ER diagram preview)` --semantically_similar_to--> `DiagramPane()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/components/DiagramPane.tsx
- `Tables to draw picker dialog` --semantically_similar_to--> `Picker()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/components/DiagramPane.tsx
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

## Communities (90 total, 7 thin omitted)

### Community 0 - "MongoDB driver"
Cohesion: 0.06
Nodes (49): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+41 more)

### Community 1 - "BSON values"
Cohesion: 0.08
Nodes (35): command_kind(), date(), describe(), err(), errors_point_at_the_place(), guard_kinds(), int(), kind() (+27 more)

### Community 2 - "Diagram pane UI"
Cohesion: 0.09
Nodes (22): palette(), blobBase64(), BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog(), DETAILS (+14 more)

### Community 3 - "Home and groups"
Cohesion: 0.08
Nodes (22): Unpinnable diagram tab with unsaved dot, Pinned query tabs, react, GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS (+14 more)

### Community 4 - "Result grid previews"
Cohesion: 0.05
Nodes (42): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu, context menu), openCellMenu() (copy value / row as Plain text, JSON, Markdown, CSV), Result grid with cell inspector, on-screen sort and copy/export menus, Collection Documents view (Table or JSON, 20 per page in stored order), Collection Fields view (fields seen on this page), pick() (grid cell select + inspector, collection) (+34 more)

### Community 5 - "DB runtime types"
Cohesion: 0.05
Nodes (12): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RunRequest, start_heartbeat() (+4 more)

### Community 6 - "Brand and graph docs"
Cohesion: 0.12
Nodes (34): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), app-icon.svg (ypacapy app icon), White capybara head soaking in the cylinder, Database cylinder as hot-spring tub, Teal gradient rounded tile (#2fd3b0 to #0a6e5d), Yuzu (yellow fruit with green leaf) on capybara's head, CLAUDE.md (symlink to AGENTS.md) (+26 more)

### Community 7 - "Release workflow"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 8 - "redis-cli parser"
Cohesion: 0.08
Nodes (34): c(), query(), classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES, is_final() (+26 more)

### Community 9 - "Grid icons"
Cohesion: 0.05
Nodes (43): react-dom@^18.3.1, react-dom, Box, AnyFormat, Cell(), CellEditor(), CellMenu(), GridEdit (+35 more)

### Community 10 - "QueryPane.tsx"
Cohesion: 0.10
Nodes (31): Redis command console (redis-cli commands in Query tabs), CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunMeta(), useEditTarget() (+23 more)

### Community 11 - "Store actions"
Cohesion: 0.06
Nodes (4): Edits, State, Saved, Settings

### Community 12 - "Guard icons"
Cohesion: 0.06
Nodes (31): ALL_KINDS, CONN_TABS, ConnectModal(), ConnTab, connUrl(), kindsOf(), MONGO_ALL, MONGO_TLS (+23 more)

### Community 13 - "Redis and Mongo config"
Cohesion: 0.13
Nodes (24): b(), cell(), col(), entries(), escaped(), items(), KeyInfo, KeyPage (+16 more)

### Community 14 - "History sidebar"
Cohesion: 0.11
Nodes (27): Clear history dialog, Query history sidebar, ico, JsonLine(), KeyPane(), PARTS, prettyJson(), foldKeys() (+19 more)

### Community 15 - "Diagram layout engine"
Cohesion: 0.18
Nodes (18): anchorY(), BODY_PAD, Cardinality, cardinality(), DiagramDetail, edgeGeometry(), HEADER_H, ROW_H (+10 more)

### Community 16 - "Updater chip preview"
Cohesion: 0.08
Nodes (25): Install failed state (signature mismatch, rolled back, 0.0.1 unchanged, Download from GitHub), app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+17 more)

### Community 17 - "guard.rs"
Cohesion: 0.05
Nodes (50): Passphrase sub-dialogs (set, change, disable, reset/forgot, unlock), ALTER, Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask (+42 more)

### Community 18 - "API and types"
Cohesion: 0.09
Nodes (26): KeyFolder, api, Approval, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL, ErdColumn (+18 more)

### Community 19 - "Changelog features"
Cohesion: 0.09
Nodes (30): About dialog (version, update state, dev git info), Added, Settings sections (General, Appearance, Queries, Security, Data on this Mac, Updates), Tabs bar (min-width shrink, sideways scroll, edge fade), Lucide 'database' icon (teal #1abc9c), Lucide 'folder-tree' icon (teal #1abc9c), Lucide 'history' icon (teal #1abc9c), Lucide 'palette' icon (teal #1abc9c) (+22 more)

### Community 20 - "README icons"
Cohesion: 0.11
Nodes (22): Lucide 'ban' icon (teal #1abc9c), Lucide 'check' icon (teal #1abc9c), Lucide 'circle-help' icon (teal #1abc9c), Lucide 'download' icon (teal #1abc9c), Lucide 'feather' icon (teal #1abc9c), Lucide 'hard-drive' icon (teal #1abc9c), Lucide 'keyboard' icon (teal #1abc9c), Lucide 'lightbulb' icon (teal #1abc9c) (+14 more)

### Community 21 - "Diagram preview script"
Cohesion: 0.12
Nodes (24): apply() (draw picked tables), askClose(), Selection cardinality marks and linked columns, changed(), Linked table from another schema (outside box), draw(), window.Erd (inlined src/lib/diagram.ts + diagramExport.ts), window.ERD_DATA / ERD_LINKS sample catalog (+16 more)

### Community 22 - "Catalog commands"
Cohesion: 0.17
Nodes (21): apply_edits(), cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState, err_text() (+13 more)

### Community 23 - "Workspace persistence"
Cohesion: 0.09
Nodes (24): Saved diagram (tables, positions, zoom, detail), flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten, Modal (+16 more)

### Community 24 - "SQL pools and exec"
Cohesion: 0.14
Nodes (24): Applied, Done, Failed, Miss, TimedOut, apply(), Collected, conn() (+16 more)

### Community 25 - "BSON cells"
Cohesion: 0.23
Nodes (21): BsonType, cellText(), cellValue(), docsToSet(), fieldsOf(), iso(), isObj(), key() (+13 more)

### Community 26 - "Rust cache workflow"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 27 - "Collection preview"
Cohesion: 0.13
Nodes (19): apply() (theme/density), setFont(), writeUrl(), apply() (collection preview theme/density), writeUrl() (collection preview), apply() (theme/density), setFont(), writeUrl() (+11 more)

### Community 28 - "SQL autocomplete"
Cohesion: 0.13
Nodes (22): Base, CLAUSE, completeContext(), Ctx, findSchema(), findTable(), isName(), Item (+14 more)

### Community 29 - "Keychain"
Cohesion: 0.13
Nodes (14): check_passphrase(), clear_passphrase(), derive(), get(), get_string(), has_passphrase(), hex(), ITERATIONS (+6 more)

### Community 30 - "Connections store"
Cohesion: 0.11
Nodes (23): Card menu (Edit connection, Duplicate, Move to group, New group, Remove from group, Remove connection), Card drag-and-drop between groups, Connection card (engine tile, name, address, last opened), Connection groups (Production, Staging, Ungrouped), Connection search (name, host, user, database, file, engine, group; Cmd+F, Enter opens first, Esc clears), Connections home (grouped connection cards), dropOn(), dup() (duplicate connection) (+15 more)

### Community 31 - "Connection groups UI"
Cohesion: 0.15
Nodes (22): clean_group(), Conn, conn(), ConnFile, copy_name(), copy_names_skip_taken_ones(), group_is_trimmed_and_blank_is_none(), list_connections() (+14 more)

### Community 32 - "Redis previews"
Cohesion: 0.12
Nodes (22): key.html (Redis key preview), redis.html (Redis connection preview), ask() (write guard dialog for DEL / KEYS), Expiring only filter (TTL keys), Guard dialogs: confirm (Low) and passphrase with Touch ID (Strict), Key Info dialog (TYPE, OBJECT encoding, MEMORY USAGE, idle time), Key row menu (Open key, New command, Copy name, Info, Delete key), window.mInfo() (Info dialog preview states) (+14 more)

### Community 33 - "Dependencies"
Cohesion: 0.09
Nodes (29): dependencies, lucide-react@1.75.0, react@^18.3.1, sql-formatter@15.9.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-process@^2, @tauri-apps/plugin-updater@^2 (+21 more)

### Community 34 - "ERD catalog reads"
Cohesion: 0.18
Nodes (25): catalog(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of() (+17 more)

### Community 35 - "Local store"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "themes.ts"
Cohesion: 0.07
Nodes (45): AppStrip(), useTheme(), ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mongo() (+37 more)

### Community 37 - "Redis state"
Cohesion: 0.17
Nodes (15): DbState, err_text(), heartbeat(), lost(), open_info(), reader(), redis_key(), redis_key_info() (+7 more)

### Community 38 - "Unreleased changelog"
Cohesion: 0.14
Nodes (19): Added, Changed, One ⋮ menu per connection card on Home, Duplicate a connection (own keychain item, same group), Lucide icons 1.75.0 upgrade (from 0.460.0), Collection Info ($collStats, read on open and Refresh), Documents as table (BSON-typed columns) or JSON, MongoDB connections (host/port, seed list, SRV, URL, TLS/X.509) (+11 more)

### Community 39 - "Settings and connect"
Cohesion: 0.17
Nodes (12): openSub() (connect preview), Settings Appearance pane (theme, scheme per appearance, compact, three fonts), apply() (settings preview), closeSub() (settings preview), Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates), go() (settings pane switch), openSub() (settings preview), window.pvShow (settings state switcher) (+4 more)

### Community 40 - "Build info and About"
Cohesion: 0.21
Nodes (18): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+10 more)

### Community 41 - "Preview pages"
Cohesion: 0.14
Nodes (22): about.html (About ypacapy preview), About preview bar (states: Up to date, Checking, Update available, Downloading, Installing, Ready to restart, Install failed, Dev build), Query workspace behind About (schema tree, history, saved queries, tabs, results), setPinned() (tab pin), Pinned query tabs (Pin/Unpin, Close skips pinned, diagrams unpinnable), collection.html (MongoDB collection preview), Open in console (query as db.orders.find in a new tab), diagram.html (ER diagram preview) (+14 more)

### Community 42 - "SQL error and guard"
Cohesion: 0.16
Nodes (15): Connection lost state, runQuery(), ask() (open guard dialog for a write kind), Guard confirm dialog (Run this on events_prod?), Guard passphrase dialog (with Touch ID option), KINDS write-kind table (q4 deleteMany, q5 $merge), No primary state (server selection timed out, Reconnect), window.pvShow (mongo states) (+7 more)

### Community 43 - "App shell"
Cohesion: 0.15
Nodes (7): index.html (Vite app entry), App(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), icoLg, SideView

### Community 44 - "edit.ts"
Cohesion: 0.15
Nodes (19): AFTER_FROM, column(), editStatements(), ident(), isName(), kw(), literal(), NO_EDITS (+11 more)

### Community 45 - "diagram.ts"
Cohesion: 0.17
Nodes (15): Box, boxSize(), DiagramColumn, DiagramEdge, diagramModel(), DiagramRef, DiagramTable, EdgeEnd (+7 more)

### Community 46 - "Connect dialog preview"
Cohesion: 0.11
Nodes (18): connect.html (New connection preview), Advanced tab (app name, connect timeout; Mongo replica set/read preference/direct; Redis key separator, keys per scan), New connection dialog form (Name, Color, Group; General/Options/SSL/Advanced tabs), drawGroup(), Group picker (No group, Home groups, New group...), Security level picker ([data-level-pick], connect), Statements / writes / commands to ask about (per engine), Per-connection Queries options (row limit / page size, timeout, heartbeat) (+10 more)

### Community 47 - "Connect URL sync"
Cohesion: 0.13
Nodes (18): cancel_query on the test's id (Stop test), fromUrl() (URL to fields), layout() (per-engine field visibility), mongoUrl() (mongodb / mongodb+srv URL), window.pvShow (connect states), pvStart() (connect preview), redisUrl() (redis / rediss URL), save_connection Tauri command (+10 more)

### Community 48 - "vite.config.ts"
Cohesion: 0.29
Nodes (6): vite@^5.4.10, @vitejs/plugin-react@^4.3.2, vite, @vitejs/plugin-react, devBuild(), git()

### Community 49 - "Collection pane"
Cohesion: 0.28
Nodes (11): ConnWork(), Box(), CollectionPane(), ErrorState(), RunGroup(), ColKey, mongoColl(), TablePane() (+3 more)

### Community 50 - "TypeScript config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 51 - "Updater cards"
Cohesion: 0.23
Nodes (11): Dev build card (channel, git-describe version, branch, commit, updates off in dev builds), show(), step() (About updater/dev card switch), Updater state cards (checking, current, available, downloading, installing, ready, failed), checkForUpdate(), hasPendingUpdate(), installUpdate(), message() (+3 more)

### Community 52 - "lib.rs"
Cohesion: 0.08
Nodes (20): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), run(), SETTINGS (+12 more)

### Community 53 - "Redis connection"
Cohesion: 0.22
Nodes (9): against_a_server(), client(), connect(), db_of(), open_one(), ROpen, secs(), server_of() (+1 more)

### Community 54 - "Quiet on your server: catalog lookups only, planner estimates never count(*)"
Cohesion: 0.29
Nodes (9): Mongo Fields and Indexes views (no collection sampling), mongosh console (parsed, never run as JavaScript), Back window: 'Revenue by city' SQL query + 9-row result (light), Autocomplete for tables, aliases and columns, <img src="docs/assets/icons/code-xml.svg" width="20" height="20" align="top" alt="" /> The SQL console, Result grid (sort, frozen PK columns, typed cells, inspector), Row limit (100 default, 10,000-row cap), Schema tree (lazy per-schema load, cached until Refresh) (+1 more)

### Community 55 - "Grid edit apply"
Cohesion: 0.18
Nodes (14): DiagramLayout, DiagramModel, withMoves(), diagramCanSave(), diagramChanged(), diagramLayoutOf(), diagramViews, mergeDiagram() (+6 more)

### Community 56 - "Pool"
Cohesion: 0.15
Nodes (16): capitalise(), connect(), host_of(), password_for(), pg_position(), Pool, Lite, My (+8 more)

### Community 57 - "runs"
Cohesion: 0.50
Nodes (5): tokens(), esc(), highlightInline(), highlightSql(), runs()

### Community 58 - "Window artwork"
Cohesion: 0.24
Nodes (11): Write guard for MongoDB (write-method kinds, unknown runCommand asks), Write guard for Redis (command groups, KEYS asks with Use SCAN), Security level pill in tabs bar (grey None, orange Low, red Strict), Lucide 'shield-check' icon (teal #1abc9c), Strict security-level pill in tabs bar (red), <img src="docs/assets/icons/shield-check.svg" width="24" height="24" align="top" alt="" /> The write guard, What to protect (INSERT, UPDATE, DELETE, REPLACE, ALTER, DROP, TRUNCATE, CREATE, GRANT, REVOKE), Security levels: None / Low / Strict (+3 more)

### Community 60 - "Autocomplete preview"
Cohesion: 0.19
Nodes (13): ac-data JSON (schemas, tables, columns), accept() (insert suggestion via insertText), window.acShow (autocomplete presets), build() (suggestion list), cols() / fetchCols() column cache, context() (caret statement/clause/table refs), paint() (editor highlight), window.pvShow (query states) (+5 more)

### Community 61 - "Update steps: available, downloading, installing, ready to restart, failed"
Cohesion: 0.33
Nodes (6): pvStart() (updates preview), setOpen() (chip popover), step() (window.pvShow, update step switch), Title-strip update chip with popover, Update steps: available, downloading, installing, ready to restart, failed, voidHTTP (design source for the update chip)

### Community 62 - "q2-fix handler (apply HINT column and rerun)"
Cohesion: 0.50
Nodes (5): Column does not exist error with PostgreSQL HINT and one-click fix, q2-fix handler (apply HINT column and rerun), SQL error state with database HINT fix, q3-fix handler (rewrite $inn to $in and rerun), Server error state: unknown operator $inn, with 'Use $in and run' fix

### Community 63 - "Connection CRUD"
Cohesion: 0.32
Nodes (13): ConnLock, delete_connection(), duplicate_connection(), find(), new_id(), now_ms(), save_connection(), set_group() (+5 more)

### Community 64 - "Result cells"
Cohesion: 0.17
Nodes (8): Cells, ColMeta, ResultSet, RunOutcome, Ask, Cancelled, Done, Error

### Community 65 - "Fonts"
Cohesion: 0.25
Nodes (7): Lucide 'map' icon (teal #1abc9c), Where things live (module map), FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 66 - "useStore"
Cohesion: 0.17
Nodes (25): AppearancePane(), CollInfoModal(), DataPane(), Final(), FontRow(), GuardModal(), KeyInfoModal(), Modals() (+17 more)

### Community 67 - "@tauri-apps/api"
Cohesion: 0.40
Nodes (4): @tauri-apps/api@^2.0.0, @tauri-apps/api, FontList, systemFonts()

### Community 69 - "Changelog and README"
Cohesion: 0.20
Nodes (10): [0.0.1] - 2026-11-18, Changelog, Keep a Changelog + Semantic Versioning, Release pipeline (GitHub Actions draft release, latest.json, notes from CHANGELOG), Lucide 'code-xml' icon (teal #1abc9c), Lucide 'rocket' icon (teal #1abc9c), <img src="docs/assets/icons/code-xml.svg" width="24" height="24" align="top" alt="" /> Hack on it, Cutting a release (tag vX.Y.Z, draft release, publish by hand) (+2 more)

### Community 71 - "Security level previews"
Cohesion: 0.32
Nodes (8): Security level picker for shop_prod (None, Low, Strict), setLevel() (security level), Low: Run this on shop_prod? confirm dialog, Strict: passphrase dialog (optional Touch ID), setLevel() (write guard), Security level (None / Low / Strict), Redis write guard (picked commands; Use SCAN instead), MongoDB write guard (deleteMany, aggregate ending in $merge)

### Community 73 - "About dialog preview"
Cohesion: 0.29
Nodes (7): About dialog (modal over the workspace), Version copy handler (clipboard, Copied for 1.4s), Copyable version button (copies 'ypacapy vX' for bug reports), GitHub and Report an issue links (github.com/jimmyfish/ypacapy), Capybara app icon in its onsen (steam, ripple rings), Onsen click handler (restart ping animation), REPO_URL

### Community 74 - "ER diagram docs"
Cohesion: 0.38
Nodes (7): ER diagrams (ported from opengrip, Apache-2.0), opengrip diagram view (Apache-2.0 source), Lucide 'network' icon (teal #1abc9c), ER diagram table picker (catalog-only reads), ER diagrams, <img src="docs/assets/icons/network.svg" width="20" height="20" align="top" alt="" /> ER diagrams, Saved diagram layout (⌘S)

### Community 75 - "Schema tree preview"
Cohesion: 0.29
Nodes (5): layout() (schema tree filter), Schema tree sidebar, SQL editor autocomplete (Query 5), layout() (schema tree filter), Completer

### Community 76 - "Engine enum"
Cohesion: 0.29
Nodes (6): Engine, Mongo, Mysql, Postgres, Redis, Sqlite

### Community 77 - "Key editing preview"
Cohesion: 0.33
Nodes (6): ask() (key write guard confirm), Delete key (DEL via write guard), Expiry popover (EXPIRE / PERSIST), Hash field editing (HSET/HDEL in one MULTI), String value editing (SET ... KEEPTTL), cmd() (expiry command preview EXPIRE/PERSIST)

### Community 78 - "Tauri capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 79 - "SSL modes"
Cohesion: 0.33
Nodes (6): SslMode, Disable, Prefer, Require, VerifyCa, VerifyFull

### Community 81 - "UpdateChip.tsx"
Cohesion: 0.18
Nodes (6): Release notes list (first 3, rest behind Show all N changes), Show all / Show less release notes handler, Notes(), noteLines(), plain(), RELEASES_URL

### Community 83 - "npm scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, tauri, typecheck

### Community 85 - "Legacy guard"
Cohesion: 0.50
Nodes (4): LegacyGuard, Confirm, Run, Verify

### Community 87 - "Security levels"
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
- **126 isolated node(s):** `ypacapy`, `Postgres`, `Mysql`, `Sqlite`, `Mongo` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 556 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where things live (module map)` connect `Fonts` to `Local store`, `DB runtime types`, `Changelog and README`, `guard.rs`, `API and types`, `lib.rs`, `Workspace persistence`, `Keychain`, `Connection groups UI`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `run()` (e.g. with `capitalise()` and `summary()`) actually correct?**
  _`run()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ypacapy`, `Postgres`, `Mysql` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MongoDB driver` be split into smaller, more focused modules?**
  _Cohesion score 0.05661729574773053 - nodes in this community are weakly interconnected._
- **Why does `State` connect `Store actions` to `Diagram pane UI`, `Grid icons`, `Guard icons`, `Connect dialog preview`, `API and types`, `Workspace persistence`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `BSON values` be split into smaller, more focused modules?**
  _Cohesion score 0.08298368298368299 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Lucide 'users' icon (teal #1abc9c)` and `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._