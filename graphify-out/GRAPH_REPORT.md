# Graph Report - ypacapy  (2026-11-19)

## Corpus Check
- 77 files · ~310,825 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 2044 nodes · 4843 edges · 95 communities (84 shown, 11 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 306 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `36b5c92f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MongoDB driver
- BSON values
- diagram.ts
- Home and groups
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
- rediscli.ts
- Updater chip preview
- guard.rs
- API and types
- Changelog features
- README icons
- apply() (draw picked tables)
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
- QueryPane.tsx
- DiagramPane.tsx
- connect.html (New connection preview)
- Connect URL sync
- diagramTab.ts
- SqlEditor.tsx
- TypeScript config
- updater.ts
- SettingsState
- connect
- render() (collection view/state)
- update() (autocomplete open/close)
- RawExec
- App.tsx
- sql.ts
- GuardState
- CHANGELOG.md
- check_kinds
- Cmd
- Result cells
- Fonts
- classify
- Pool
- AGENTS.md
- Estimated document counts (~48k from collection metadata, not a count)
- render() (key head and value page)
- paths.rs
- <img src="docs/assets/icons/network.svg" width="20" height="20" align="top" alt="" /> ER diagrams
- Schema tree sidebar
- Engine enum
- Tauri capabilities
- SSL modes
- render() (table preview)
- EngineIcon.tsx
- SecurityLevel
- MongoTls
- Connect preview helpers
- Redis preview helpers
- Updates preview helpers
- window.Erd (inlined src/lib/diagram.ts + diagramExport.ts)
- Table preview helpers
- Saved queries sidebar
- ypacapy root
- askClose

## God Nodes (most connected - your core abstractions)
1. `State` - 51 edges
2. `useStore` - 41 edges
3. `icoC()` - 33 edges
4. `DiagramPane()` - 28 edges
5. `run()` - 28 edges
6. `useCurrent()` - 26 edges
7. `run()` - 26 edges
8. `DocCards()` - 25 edges
9. `ResultGrid()` - 25 edges
10. `react` - 25 edges

## Surprising Connections (you probably didn't know these)
- `savedAt()` --semantically_similar_to--> `savedAtLabel()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/lib/diagramTab.ts
- `Strict: passphrase dialog (optional Touch ID)` --semantically_similar_to--> `GuardModal()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Modals.tsx
- `Query history sidebar` --semantically_similar_to--> `HistorySide()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Sidebar.tsx
- `diagram.html (ER diagram preview)` --semantically_similar_to--> `DiagramPane()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/components/DiagramPane.tsx
- `palette()` --semantically_similar_to--> `palette()`  [INFERRED] [semantically similar]
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

## Communities (95 total, 11 thin omitted)

### Community 0 - "MongoDB driver"
Cohesion: 0.06
Nodes (46): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+38 more)

### Community 1 - "BSON values"
Cohesion: 0.06
Nodes (44): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, Call (+36 more)

### Community 2 - "diagram.ts"
Cohesion: 0.11
Nodes (32): Box, kindOf(), anchorY(), BODY_PAD, Box, boxSize(), Cardinality, cardinality() (+24 more)

### Community 3 - "Home and groups"
Cohesion: 0.08
Nodes (22): GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack(), Home() (+14 more)

### Community 4 - "Result grid with cell inspector, on-screen sort and copy/export menus"
Cohesion: 0.21
Nodes (11): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu, context menu), openCellMenu() (copy value / row as Plain text, JSON, Markdown, CSV), Result grid with cell inspector, on-screen sort and copy/export menus, pick() (grid cell select + inspector, collection), Cell context menu (Copy value / Copy row as), fillCols() (Go to column menu) (+3 more)

### Community 5 - "DB runtime types"
Cohesion: 0.05
Nodes (12): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RunRequest, start_heartbeat() (+4 more)

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
Cohesion: 0.08
Nodes (32): AnyFormat, Cell(), CellEditor(), ColKey, GridRow, jsonHtml(), MenuButton(), MenuItem (+24 more)

### Community 10 - "AuthDialog.tsx"
Cohesion: 0.15
Nodes (11): AuthDialog(), Caps(), Err(), Head(), PASS, PassField(), PassKind, PassphraseDialog() (+3 more)

### Community 11 - "Store actions"
Cohesion: 0.05
Nodes (4): Edits, State, Approval, Saved

### Community 12 - "Guard icons"
Cohesion: 0.06
Nodes (60): Strict: passphrase dialog (optional Touch ID), ALL_KINDS, AppearancePane(), CollInfoModal(), CONN_TABS, ConnectModal(), ConnQueriesPane(), ConnSecurityPane() (+52 more)

### Community 13 - "Redis and Mongo config"
Cohesion: 0.11
Nodes (26): plural(), b(), cell(), entries(), escaped(), items(), KeyInfo, KeyPage (+18 more)

### Community 14 - "History sidebar"
Cohesion: 0.12
Nodes (32): Clear history dialog, Query history sidebar, JsonLine(), KeyPane(), PARTS, prettyJson(), KeyInfoModal(), PassphraseManager() (+24 more)

### Community 15 - "rediscli.ts"
Cohesion: 0.60
Nodes (4): Redis command console (redis-cli commands in Query tabs), esc(), highlightRedis(), line()

### Community 16 - "Updater chip preview"
Cohesion: 0.08
Nodes (25): Install failed state (signature mismatch, rolled back, 0.0.1 unchanged, Download from GitHub), app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+17 more)

### Community 17 - "guard.rs"
Cohesion: 0.06
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "API and types"
Cohesion: 0.11
Nodes (26): KeyFolder, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL, ErdColumn, ErdKey, HistoryEntry (+18 more)

### Community 19 - "Changelog features"
Cohesion: 0.11
Nodes (30): About dialog (version, update state, dev git info), Added, Mongo Fields and Indexes views (no collection sampling), Settings sections (General, Appearance, Queries, Security, Data on this Mac, Updates), Tabs bar (min-width shrink, sideways scroll, edge fade), Lucide 'folder-tree' icon (teal #1abc9c), Lucide 'palette' icon (teal #1abc9c), Lucide 'sparkles' icon (teal #1abc9c) (+22 more)

### Community 20 - "README icons"
Cohesion: 0.10
Nodes (26): Lucide 'ban' icon (teal #1abc9c), Lucide 'check' icon (teal #1abc9c), Lucide 'circle-help' icon (teal #1abc9c), Lucide 'code-xml' icon (teal #1abc9c), Lucide 'download' icon (teal #1abc9c), Lucide 'feather' icon (teal #1abc9c), Lucide 'hard-drive' icon (teal #1abc9c), Lucide 'keyboard' icon (teal #1abc9c) (+18 more)

### Community 21 - "apply() (draw picked tables)"
Cohesion: 0.18
Nodes (11): apply() (draw picked tables), Selection cardinality marks and linked columns, Linked table from another schema (outside box), draw(), window.ERD_DATA / ERD_LINKS sample catalog, fit(), openMenu() (table box menu), place() (+3 more)

### Community 22 - "Catalog commands"
Cohesion: 0.18
Nodes (20): apply_edits(), cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState, err_text() (+12 more)

### Community 23 - "Workspace persistence"
Cohesion: 0.09
Nodes (24): Saved diagram (tables, positions, zoom, detail), flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten, Modal (+16 more)

### Community 24 - "Pool"
Cohesion: 0.14
Nodes (25): Applied, Done, Failed, Miss, TimedOut, apply(), Collected, conn() (+17 more)

### Community 25 - "DocCards.tsx"
Cohesion: 0.08
Nodes (65): DocCards(), card(), line(), removeUndo(), send(), DocEdit, isContainer(), live() (+57 more)

### Community 26 - "Rust cache workflow"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 27 - "Collection preview"
Cohesion: 0.10
Nodes (24): apply() (theme/density), setFont(), writeUrl(), collection.html (MongoDB collection preview), apply() (collection preview theme/density), Open in console (query as db.orders.find in a new tab), writeUrl() (collection preview), apply() (theme/density) (+16 more)

### Community 28 - "complete.ts"
Cohesion: 0.15
Nodes (19): Base, CLAUSE, completeContext(), findSchema(), findTable(), isName(), MAX_ITEMS, NO_COLUMNS (+11 more)

### Community 29 - "Keychain"
Cohesion: 0.13
Nodes (17): password_for(), check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase() (+9 more)

### Community 30 - "Connections store"
Cohesion: 0.13
Nodes (19): Card drag-and-drop between groups, Connection groups (Production, Staging, Ungrouped), Connection search (name, host, user, database, file, engine, group; Cmd+F, Enter opens first, Esc clears), Connections home (grouped connection cards), dropOn(), dup() (duplicate connection), endDrag(), Group menu (New connection here, Rename group, Close N open, Ungroup) (+11 more)

### Community 31 - "conns.rs"
Cohesion: 0.16
Nodes (30): clean_group(), Conn, conn(), ConnFile, ConnLock, copy_name(), copy_names_skip_taken_ones(), delete_connection() (+22 more)

### Community 32 - "Redis previews"
Cohesion: 0.13
Nodes (21): redis.html (Redis connection preview), ask() (write guard dialog for DEL / KEYS), Expiring only filter (TTL keys), Guard dialogs: confirm (Low) and passphrase with Touch ID (Strict), Key Info dialog (TYPE, OBJECT encoding, MEMORY USAGE, idle time), Key row menu (Open key, New command, Copy name, Info, Delete key), window.mInfo() (Info dialog preview states), Pinned query tabs kept with the connection (+13 more)

### Community 33 - "package.json"
Cohesion: 0.06
Nodes (41): dependencies, lucide-react@1.75.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-process@^2 (+33 more)

### Community 34 - "ERD catalog reads"
Cohesion: 0.19
Nodes (25): catalog(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of() (+17 more)

### Community 35 - "Local store"
Cohesion: 0.21
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "themes.ts"
Cohesion: 0.17
Nodes (21): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 37 - "Redis state"
Cohesion: 0.28
Nodes (9): DbState, err_text(), heartbeat(), lost(), open_info(), redis_key(), redis_key_info(), redis_scan() (+1 more)

### Community 38 - "Unreleased changelog"
Cohesion: 0.08
Nodes (33): Added, Changed, One ⋮ menu per connection card on Home, Duplicate a connection (own keychain item, same group), ER diagrams (ported from opengrip, Apache-2.0), Lucide icons 1.75.0 upgrade (from 0.460.0), Collection Info ($collStats, read on open and Refresh), Documents as table (BSON-typed columns) or JSON (+25 more)

### Community 39 - "Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates)"
Cohesion: 0.09
Nodes (21): openSub() (connect preview), Per-connection Queries options (row limit / page size, timeout, heartbeat), Settings Appearance pane (theme, scheme per appearance, compact, three fonts), apply() (settings preview), closeSub() (settings preview), Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates), go() (settings pane switch), openSub() (settings preview) (+13 more)

### Community 40 - "Build info and About"
Cohesion: 0.17
Nodes (23): @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-opener, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+15 more)

### Community 41 - "home.html (Home / Connections preview)"
Cohesion: 0.14
Nodes (21): about.html (About ypacapy preview), About preview bar (states: Up to date, Checking, Update available, Downloading, Installing, Ready to restart, Install failed, Dev build), Query workspace behind About (schema tree, history, saved queries, tabs, results), setPinned() (tab pin), Pinned query tabs (Pin/Unpin, Close skips pinned, diagrams unpinnable), diagram.html (ER diagram preview), home.html (Home / Connections preview), Card menu (Edit connection, Duplicate, Move to group, New group, Remove from group, Remove connection) (+13 more)

### Community 42 - "Security level (None / Low / Strict)"
Cohesion: 0.08
Nodes (33): Security level picker for shop_prod (None, Low, Strict), setLevel() (security level), Column does not exist error with PostgreSQL HINT and one-click fix, Connection lost state, Low: Run this on shop_prod? confirm dialog, q2-fix handler (apply HINT column and rerun), runQuery(), setLevel() (write guard) (+25 more)

### Community 43 - "useStore"
Cohesion: 0.25
Nodes (12): ConnWork(), Box(), CollectionPane(), ErrorState(), RunGroup(), mongoColl(), TablePane(), estimate() (+4 more)

### Community 44 - "QueryPane.tsx"
Cohesion: 0.09
Nodes (36): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunMeta(), useEditTarget(), GridEdit (+28 more)

### Community 45 - "DiagramPane.tsx"
Cohesion: 0.11
Nodes (21): blobBase64(), BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog(), DETAILS, DiagramPane() (+13 more)

### Community 46 - "connect.html (New connection preview)"
Cohesion: 0.13
Nodes (16): connect.html (New connection preview), Advanced tab (app name, connect timeout; Mongo replica set/read preference/direct; Redis key separator, keys per scan), New connection dialog form (Name, Color, Group; General/Options/SSL/Advanced tabs), drawGroup(), Group picker (No group, Home groups, New group...), Security level picker ([data-level-pick], connect), Statements / writes / commands to ask about (per engine), renderLevel() (+8 more)

### Community 47 - "Connect URL sync"
Cohesion: 0.15
Nodes (17): cancel_query on the test's id (Stop test), fromUrl() (URL to fields), layout() (per-engine field visibility), mongoUrl() (mongodb / mongodb+srv URL), window.pvShow (connect states), pvStart() (connect preview), redisUrl() (redis / rediss URL), save_connection Tauri command (+9 more)

### Community 48 - "diagramTab.ts"
Cohesion: 0.16
Nodes (16): DiagramLayout, DiagramModel, diagramModel(), tableKey(), withMoves(), diagramCanSave(), diagramChanged(), diagramLayoutOf() (+8 more)

### Community 49 - "SqlEditor.tsx"
Cohesion: 0.15
Nodes (8): ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON, Ctx, Item, Suggest

### Community 50 - "TypeScript config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 51 - "updater.ts"
Cohesion: 0.09
Nodes (24): About dialog (modal over the workspace), Version copy handler (clipboard, Copied for 1.4s), Copyable version button (copies 'ypacapy vX' for bug reports), Dev build card (channel, git-describe version, branch, commit, updates off in dev builds), GitHub and Report an issue links (github.com/jimmyfish/ypacapy), Capybara app icon in its onsen (steam, ripple rings), Onsen click handler (restart ping animation), Release notes list (first 3, rest behind Show all N changes) (+16 more)

### Community 52 - "SettingsState"
Cohesion: 0.20
Nodes (9): keep_history_overrides_settings_only_when_set(), run(), config_dir(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState (+1 more)

### Community 53 - "connect"
Cohesion: 0.18
Nodes (11): against_a_server(), client(), connect(), db_of(), group(), open_one(), reads_the_database_number(), ROpen (+3 more)

### Community 54 - "render() (collection view/state)"
Cohesion: 0.25
Nodes (8): Collection Fields view (fields seen on this page), Collection Indexes view (keys, unique, partial/sparse options), window.mInfo (Info dialog preview states), Filter matches nothing state (with values seen hint), window.pvShow (collection states), reload() (collection run), render() (collection view/state), valid() (bracket/comma parser stand-in)

### Community 55 - "update() (autocomplete open/close)"
Cohesion: 0.16
Nodes (15): ac-data JSON (schemas, tables, columns), accept() (insert suggestion via insertText), window.acShow (autocomplete presets), build() (suggestion list), cols() / fetchCols() column cache, context() (caret statement/clause/table refs), paint() (editor highlight), window.pvShow (query states) (+7 more)

### Community 57 - "App.tsx"
Cohesion: 0.09
Nodes (25): index.html (Vite app entry), react, react-dom, App(), AppStrip(), SIDEBAR_DEFAULT, stack(), useTypeTokens() (+17 more)

### Community 58 - "sql.ts"
Cohesion: 0.17
Nodes (14): tokens(), DIALECT, ENGINE_LABEL, ENGINE_NAME, esc(), highlightInline(), highlightSql(), KEEP_LIST (+6 more)

### Community 60 - "GuardState"
Cohesion: 0.15
Nodes (15): Passphrase sub-dialogs (set, change, disable, reset/forgot, unlock), approve_default_lowering(), authenticate(), authenticate_owner(), check_kinds(), disable_passphrase(), evaluate(), GuardState (+7 more)

### Community 61 - "CHANGELOG.md"
Cohesion: 0.25
Nodes (8): [0.0.1] - 2026-11-18, Changelog, Keep a Changelog + Semantic Versioning, Release pipeline (GitHub Actions draft release, latest.json, notes from CHANGELOG), Lucide 'rocket' icon (teal #1abc9c), Cutting a release (tag vX.Y.Z, draft release, publish by hand), release.yml workflow (aarch64 + x86_64 bundles, latest.json), Tauri updater signing key secrets

### Community 62 - "check_kinds"
Cohesion: 0.18
Nodes (13): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, check(), check_sql() (+5 more)

### Community 63 - "Cmd"
Cohesion: 0.16
Nodes (15): c(), query(), Step, Cancelled, Done, Failed, Cmd, Kind (+7 more)

### Community 64 - "Result cells"
Cohesion: 0.17
Nodes (8): Cells, ColMeta, ResultSet, RunOutcome, Ask, Cancelled, Done, Error

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
Cohesion: 0.19
Nodes (10): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), app-icon.svg (ypacapy app icon), White capybara head soaking in the cylinder, Database cylinder as hot-spring tub, Teal gradient rounded tile (#2fd3b0 to #0a6e5d), Yuzu (yellow fruit with green leaf) on capybara's head, CLAUDE.md (symlink to AGENTS.md) (+2 more)

### Community 70 - "Estimated document counts (~48k from collection metadata, not a count)"
Cohesion: 0.22
Nodes (4): Collection Documents view (Table or JSON, 20 per page in stored order), Tables to draw picker dialog, Redis key tree (prefix folders, type badges, TTL marks), Expiring-only key filter (rTtlOnly)

### Community 71 - "render() (key head and value page)"
Cohesion: 0.18
Nodes (12): Collection Info dialog ($collStats: count, sizes, indexes, validator), fillInfo() (key Info dialog), Key Info dialog (TYPE, OBJECT ENCODING, MEMORY USAGE), Key gone state (TYPE -> none), Key head (type badge, length, TTL, encoding, db), window.pvShow (key states), reload() (key re-read), render() (key head and value page) (+4 more)

### Community 72 - "paths.rs"
Cohesion: 0.15
Nodes (11): Lucide 'database' icon (teal #1abc9c), Lucide 'history' icon (teal #1abc9c), ~/.config/ypacapy (settings.toml, connections.toml, ypacapy.db), Query history (per connection, last 2,000 runs), <img src="docs/assets/icons/database.svg" width="24" height="24" align="top" alt="" /> Where's my data?, <img src="docs/assets/icons/history.svg" width="20" height="20" align="top" alt="" /> History and saved queries, Saved queries in folders (drift indicator), base64() (+3 more)

### Community 74 - "<img src="docs/assets/icons/network.svg" width="20" height="20" align="top" alt="" /> ER diagrams"
Cohesion: 0.60
Nodes (5): Lucide 'network' icon (teal #1abc9c), ER diagram table picker (catalog-only reads), ER diagrams, <img src="docs/assets/icons/network.svg" width="20" height="20" align="top" alt="" /> ER diagrams, Saved diagram layout (⌘S)

### Community 75 - "Schema tree sidebar"
Cohesion: 0.50
Nodes (4): layout() (schema tree filter), Schema tree sidebar, layout() (schema tree filter), MongoDB database tree (Collections, Views, System databases)

### Community 76 - "Engine enum"
Cohesion: 0.29
Nodes (6): Engine, Mongo, Mysql, Postgres, Redis, Sqlite

### Community 78 - "Tauri capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 79 - "SSL modes"
Cohesion: 0.33
Nodes (6): SslMode, Disable, Prefer, Require, VerifyCa, VerifyFull

### Community 80 - "render() (table preview)"
Cohesion: 0.22
Nodes (8): Table Columns view, Table Indexes and Foreign keys view, Filter matches nothing state, window.pvShow (table states), reload() (table preview), render() (table preview), Table Rows view (paged, 20 per page), Table where-clause filter

### Community 82 - "EngineIcon.tsx"
Cohesion: 0.44
Nodes (9): fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres(), Redis(), Sqlite() (+1 more)

### Community 85 - "SecurityLevel"
Cohesion: 0.21
Nodes (8): LegacyGuard, Confirm, Run, Verify, SecurityLevel, Low, None, Strict

### Community 86 - "MongoTls"
Cohesion: 0.50
Nodes (4): MongoTls, Insecure, Off, On

### Community 88 - "Connect preview helpers"
Cohesion: 0.67
Nodes (3): apply() (theme/density, connect preview), setFont() (connect preview), writeUrl() (connect preview)

### Community 89 - "Redis preview helpers"
Cohesion: 0.67
Nodes (3): apply() (theme/density, redis preview), setFont() (redis preview), writeUrl() (redis preview)

### Community 90 - "Updates preview helpers"
Cohesion: 0.67
Nodes (3): apply() (theme/density, updates preview), setFont() (updates preview), writeUrl() (updates preview)

### Community 91 - "window.Erd (inlined src/lib/diagram.ts + diagramExport.ts)"
Cohesion: 0.26
Nodes (11): window.Erd (inlined src/lib/diagram.ts + diagramExport.ts), openCode() (Mermaid/DBML), openDiagram(), openImage(), openPicker(), palette(), window.pvShow (diagram states), save() (+3 more)

### Community 101 - "askClose"
Cohesion: 0.50
Nodes (4): askClose(), changed(), Unpinnable diagram tab with unsaved dot, Pinned query tabs

## Ambiguous Edges - Review These
- `Lucide 'users' icon (teal #1abc9c)` → `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`  [AMBIGUOUS]
  README.md · relation: references

## Knowledge Gaps
- **128 isolated node(s):** `Cancelled`, `Done`, `Failed`, `Refused`, `Db` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 570 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where things live (module map)` connect `README icons` to `Fonts`, `Local store`, `DB runtime types`, `paths.rs`, `guard.rs`, `API and types`, `SettingsState`, `Workspace persistence`, `Keychain`, `conns.rs`?**
  _High betweenness centrality (0.392) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `run()` (e.g. with `capitalise()` and `summary()`) actually correct?**
  _`run()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Cancelled`, `Done`, `Failed` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MongoDB driver` be split into smaller, more focused modules?**
  _Cohesion score 0.05847803881511747 - nodes in this community are weakly interconnected._
- **Why does `<img src="docs/assets/icons/code-xml.svg" width="24" height="24" align="top" alt="" /> Hack on it` connect `README icons` to `CHANGELOG.md`, `AGENTS.md`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `BSON values` be split into smaller, more focused modules?**
  _Cohesion score 0.05909351692484223 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Lucide 'users' icon (teal #1abc9c)` and `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._