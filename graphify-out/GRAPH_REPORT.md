# Graph Report - ypacapy  (2026-11-20)

## Corpus Check
- 77 files · ~315,612 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 5, (none) 4, .lock 1)

## Summary
- 2056 nodes · 4841 edges · 99 communities (83 shown, 16 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 307 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `babc9836`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MongoDB driver
- BSON values
- diagram.ts
- Home.tsx
- render() (key head and value page)
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
- store.ts
- Pool
- DocCards.tsx
- Rust cache workflow
- writeUrl
- SqlEditor.tsx
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
- window.pvShow (settings state switcher)
- Build info and About
- home.html (Home / Connections preview)
- Security level (None / Low / Strict)
- QueryPane.tsx
- edit.ts
- TabsBar.tsx
- connect.html (New connection preview)
- Connect URL sync
- mongosh.ts
- sql.ts
- TypeScript config
- updater.ts
- SettingsState
- connect
- DiagramPane.tsx
- find
- useStore
- Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates)
- Approval
- diagramTab.ts
- GuardState
- Where things live (module map)
- check_kinds
- Step
- Result cells
- Fonts
- classify
- run_error
- AGENTS.md
- GuardState
- Approval
- paths.rs
- DiagramTab
- rediscli.ts
- themes.js
- Engine enum
- LegacyGuard
- Tauri capabilities
- SSL modes
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
5. `DocCards()` - 27 edges
6. `run()` - 27 edges
7. `useCurrent()` - 26 edges
8. `errText()` - 25 edges
9. `ResultGrid()` - 25 edges
10. `react` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Strict: passphrase dialog (optional Touch ID)` --semantically_similar_to--> `GuardModal()`  [INFERRED] [semantically similar]
  .hallmark/preview/index.html → src/components/Modals.tsx
- `savedAt()` --semantically_similar_to--> `savedAtLabel()`  [INFERRED] [semantically similar]
  .hallmark/preview/diagram.html → src/lib/diagramTab.ts
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

## Communities (99 total, 16 thin omitted)

### Community 0 - "MongoDB driver"
Cohesion: 0.06
Nodes (48): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+40 more)

### Community 1 - "BSON values"
Cohesion: 0.06
Nodes (42): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, command_kind() (+34 more)

### Community 2 - "diagram.ts"
Cohesion: 0.10
Nodes (34): anchorY(), BODY_PAD, Box, boxSize(), Cardinality, cardinality(), DiagramColumn, DiagramDetail (+26 more)

### Community 3 - "Home.tsx"
Cohesion: 0.11
Nodes (13): BoxMenu(), GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack() (+5 more)

### Community 4 - "render() (key head and value page)"
Cohesion: 0.05
Nodes (40): fillCols() (Go to column menu), pick() (grid cell select + inspector), Menu controller (closeAll, row menu, data-menu, context menu), openCellMenu() (copy value / row as Plain text, JSON, Markdown, CSV), Result grid with cell inspector, on-screen sort and copy/export menus, Collection Documents view (Table or JSON, 20 per page in stored order), Collection Fields view (fields seen on this page), pick() (grid cell select + inspector, collection) (+32 more)

### Community 5 - "DB runtime types"
Cohesion: 0.05
Nodes (14): Affected, EditRequest, HARD_CAP, impl_affected!, impl_cells!, impl_raw!, RawExec, RawItem (+6 more)

### Community 6 - "Brand and graph docs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 7 - "Release workflow"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 8 - "redis-cli parser"
Cohesion: 0.08
Nodes (33): c(), query(), classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES, KEYS_W (+25 more)

### Community 9 - "Grid icons"
Cohesion: 0.07
Nodes (35): AnyFormat, Cell(), CellEditor(), CellMenu(), DocsActions(), GridEdit, GridRow, jsonHtml() (+27 more)

### Community 10 - "AuthDialog.tsx"
Cohesion: 0.11
Nodes (17): react, AuthDialog(), Caps(), Err(), Head(), PASS, PassField(), PassKind (+9 more)

### Community 11 - "Store actions"
Cohesion: 0.06
Nodes (3): Edits, State, Saved

### Community 12 - "Guard icons"
Cohesion: 0.07
Nodes (33): ALL_KINDS, CollInfoModal(), CONN_TABS, ConnTab, Final(), GuardModal(), KeyInfoModal(), Modals() (+25 more)

### Community 13 - "Redis and Mongo config"
Cohesion: 0.11
Nodes (26): plural(), b(), cell(), entries(), escaped(), items(), KeyInfo, KeyPage (+18 more)

### Community 14 - "History sidebar"
Cohesion: 0.11
Nodes (28): Clear history dialog, Query history sidebar, JsonLine(), KeyPane(), PARTS, prettyJson(), foldKeys(), HistorySide() (+20 more)

### Community 15 - "App.tsx"
Cohesion: 0.16
Nodes (7): index.html (Vite app entry), App(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), icoLg, SideView

### Community 16 - "Updater chip preview"
Cohesion: 0.08
Nodes (25): Install failed state (signature mismatch, rolled back, 0.0.1 unchanged, Download from GitHub), app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+17 more)

### Community 17 - "guard.rs"
Cohesion: 0.06
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "API and types"
Cohesion: 0.09
Nodes (29): UrlParts, KeyFolder, Ask, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL, Engine (+21 more)

### Community 19 - "Changelog features"
Cohesion: 0.11
Nodes (29): About dialog (version, update state, dev git info), Added, Settings sections (General, Appearance, Queries, Security, Data on this Mac, Updates), Tabs bar (min-width shrink, sideways scroll, edge fade), Lucide 'folder-tree' icon (teal #1abc9c), Lucide 'history' icon (teal #1abc9c), Lucide 'palette' icon (teal #1abc9c), Lucide 'sparkles' icon (teal #1abc9c) (+21 more)

### Community 20 - "README icons"
Cohesion: 0.09
Nodes (25): Lucide 'ban' icon (teal #1abc9c), Lucide 'check' icon (teal #1abc9c), Lucide 'circle-help' icon (teal #1abc9c), Lucide 'database' icon (teal #1abc9c), Lucide 'download' icon (teal #1abc9c), Lucide 'feather' icon (teal #1abc9c), Lucide 'hard-drive' icon (teal #1abc9c), Lucide 'keyboard' icon (teal #1abc9c) (+17 more)

### Community 21 - "window.Erd (inlined src/lib/diagram.ts + diagramExport.ts)"
Cohesion: 0.08
Nodes (34): ER diagrams (ported from opengrip, Apache-2.0), opengrip diagram view (Apache-2.0 source), apply() (draw picked tables), askClose(), Selection cardinality marks and linked columns, changed(), Linked table from another schema (outside box), draw() (+26 more)

### Community 22 - "Catalog commands"
Cohesion: 0.13
Nodes (26): cancel_query on the test's id (Stop test), apply_edits(), cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState (+18 more)

### Community 23 - "store.ts"
Cohesion: 0.12
Nodes (18): flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten, Modal, newQuery() (+10 more)

### Community 24 - "Pool"
Cohesion: 0.19
Nodes (20): apply(), catalog(), conn(), connect(), execute(), first(), on_pool!, Open (+12 more)

### Community 25 - "DocCards.tsx"
Cohesion: 0.07
Nodes (67): DocCards(), card(), example(), line(), removeUndo(), send(), DocEdit, EMPTY (+59 more)

### Community 26 - "Rust cache workflow"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 27 - "writeUrl"
Cohesion: 0.22
Nodes (10): setFont(), writeUrl(), setFont(), tabColor(), writeUrl(), apply() (theme/density), setFont(), voidHTTP design source (fonts/components) (+2 more)

### Community 28 - "SqlEditor.tsx"
Cohesion: 0.09
Nodes (29): ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON, estimate(), Base, CLAUSE (+21 more)

### Community 29 - "Keychain"
Cohesion: 0.14
Nodes (13): check_passphrase(), clear_passphrase(), derive(), get(), get_string(), has_passphrase(), ITERATIONS, NOT_FOUND (+5 more)

### Community 30 - "Connections store"
Cohesion: 0.12
Nodes (21): Card menu (Edit connection, Duplicate, Move to group, New group, Remove from group, Remove connection), Card drag-and-drop between groups, Connection card (engine tile, name, address, last opened), Connection groups (Production, Staging, Ungrouped), Connections home (grouped connection cards), dropOn(), dup() (duplicate connection), Duplicated toast (Duplicated as shop_prod copy) (+13 more)

### Community 31 - "conns.rs"
Cohesion: 0.12
Nodes (23): clean_group(), Conn, conn(), ConnFile, copy_name(), copy_names_skip_taken_ones(), group_is_trimmed_and_blank_is_none(), keep_history_overrides_settings_only_when_set() (+15 more)

### Community 32 - "Redis previews"
Cohesion: 0.13
Nodes (21): redis.html (Redis connection preview), ask() (write guard dialog for DEL / KEYS), Expiring only filter (TTL keys), Guard dialogs: confirm (Low) and passphrase with Touch ID (Strict), Key Info dialog (TYPE, OBJECT encoding, MEMORY USAGE, idle time), Key row menu (Open key, New command, Copy name, Info, Delete key), window.mInfo() (Info dialog preview states), Pinned query tabs kept with the connection (+13 more)

### Community 33 - "package.json"
Cohesion: 0.06
Nodes (43): dependencies, lucide-react@1.75.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+35 more)

### Community 34 - "ERD catalog reads"
Cohesion: 0.18
Nodes (25): add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of(), kind_of() (+17 more)

### Community 35 - "Local store"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "themes.ts"
Cohesion: 0.07
Nodes (45): AppStrip(), useTheme(), ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mongo() (+37 more)

### Community 37 - "Redis state"
Cohesion: 0.28
Nodes (9): DbState, err_text(), heartbeat(), lost(), open_info(), redis_key(), redis_key_info(), redis_scan() (+1 more)

### Community 38 - "Unreleased changelog"
Cohesion: 0.09
Nodes (31): Added, Changed, One ⋮ menu per connection card on Home, Duplicate a connection (own keychain item, same group), Lucide icons 1.75.0 upgrade (from 0.460.0), Collection Info ($collStats, read on open and Refresh), Documents as table (BSON-typed columns) or JSON, Write guard for MongoDB (write-method kinds, unknown runCommand asks) (+23 more)

### Community 39 - "window.pvShow (settings state switcher)"
Cohesion: 0.15
Nodes (14): openSub() (connect preview), closeSub() (settings preview), go() (settings pane switch), openSub() (settings preview), window.pvShow (settings state switcher), Settings Updates pane (status per updater state, check automatically), updState() (updater status rows), updates.html (In-app updates preview) (+6 more)

### Community 40 - "Build info and About"
Cohesion: 0.14
Nodes (21): @tauri-apps/plugin-opener, DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K() (+13 more)

### Community 41 - "home.html (Home / Connections preview)"
Cohesion: 0.18
Nodes (18): about.html (About ypacapy preview), About preview bar (states: Up to date, Checking, Update available, Downloading, Installing, Ready to restart, Install failed, Dev build), Query workspace behind About (schema tree, history, saved queries, tabs, results), setPinned() (tab pin), Pinned query tabs (Pin/Unpin, Close skips pinned, diagrams unpinnable), diagram.html (ER diagram preview), home.html (Home / Connections preview), Connection search (name, host, user, database, file, engine, group; Cmd+F, Enter opens first, Esc clears) (+10 more)

### Community 42 - "Security level (None / Low / Strict)"
Cohesion: 0.06
Nodes (39): Security level picker for shop_prod (None, Low, Strict), setLevel() (security level), Column does not exist error with PostgreSQL HINT and one-click fix, window.acShow (autocomplete presets), Connection lost state, Low: Run this on shop_prod? confirm dialog, Strict: passphrase dialog (optional Touch ID), window.pvShow (query states) (+31 more)

### Community 43 - "QueryPane.tsx"
Cohesion: 0.13
Nodes (24): ConnWork(), Box(), CollectionPane(), CtxSelect(), Elapsed(), ErrorState(), QueryContext(), QueryPane() (+16 more)

### Community 44 - "edit.ts"
Cohesion: 0.16
Nodes (18): kindOf(), AFTER_FROM, column(), editStatements(), ident(), isName(), kw(), literal() (+10 more)

### Community 45 - "TabsBar.tsx"
Cohesion: 0.22
Nodes (8): Box, icoC(), LevelItems(), GuardPicker(), TabMenu(), TabsBar(), diagramKey(), isDirty()

### Community 46 - "connect.html (New connection preview)"
Cohesion: 0.13
Nodes (16): connect.html (New connection preview), Advanced tab (app name, connect timeout; Mongo replica set/read preference/direct; Redis key separator, keys per scan), New connection dialog form (Name, Color, Group; General/Options/SSL/Advanced tabs), drawGroup(), Group picker (No group, Home groups, New group...), Security level picker ([data-level-pick], connect), Statements / writes / commands to ask about (per engine), renderLevel() (+8 more)

### Community 47 - "Connect URL sync"
Cohesion: 0.19
Nodes (15): fromUrl() (URL to fields), layout() (per-engine field visibility), mongoUrl() (mongodb / mongodb+srv URL), window.pvShow (connect states), pvStart() (connect preview), redisUrl() (redis / rediss URL), save_connection Tauri command, selectTab() (connection settings tabs) (+7 more)

### Community 48 - "mongosh.ts"
Cohesion: 0.83
Nodes (3): esc(), highlightMongo(), runs()

### Community 49 - "sql.ts"
Cohesion: 0.09
Nodes (26): ac-data JSON (schemas, tables, columns), accept() (insert suggestion via insertText), build() (suggestion list), cols() / fetchCols() column cache, context() (caret statement/clause/table refs), paint() (editor highlight), runs() SQL highlighter tokenizer, SQL editor autocomplete (Query 5) (+18 more)

### Community 50 - "TypeScript config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 51 - "updater.ts"
Cohesion: 0.09
Nodes (25): About dialog (modal over the workspace), Version copy handler (clipboard, Copied for 1.4s), Copyable version button (copies 'ypacapy vX' for bug reports), Dev build card (channel, git-describe version, branch, commit, updates off in dev builds), GitHub and Report an issue links (github.com/jimmyfish/ypacapy), Capybara app icon in its onsen (steam, ripple rings), Onsen click handler (restart ping animation), Release notes list (first 3, rest behind Show all N changes) (+17 more)

### Community 52 - "SettingsState"
Cohesion: 0.27
Nodes (8): run(), config_dir(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 53 - "connect"
Cohesion: 0.18
Nodes (12): against_a_server(), client(), connect(), db_of(), group(), open_one(), reads_the_database_number(), ROpen (+4 more)

### Community 54 - "DiagramPane.tsx"
Cohesion: 0.12
Nodes (19): blobBase64(), BoxItem, clampZoom(), CODE, CodeDialog(), DETAILS, DiagramPane(), fileName() (+11 more)

### Community 55 - "find"
Cohesion: 0.32
Nodes (13): ConnLock, delete_connection(), duplicate_connection(), find(), new_id(), now_ms(), save_connection(), set_group() (+5 more)

### Community 56 - "useStore"
Cohesion: 0.16
Nodes (27): LevelSelect(), AppearancePane(), ConnectModal(), ConnQueriesPane(), ConnSecurityPane(), connUrl(), DataPane(), FontRow() (+19 more)

### Community 57 - "Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates)"
Cohesion: 0.15
Nodes (9): Per-connection Queries options (row limit / page size, timeout, heartbeat), Remove connection dialog, Settings Appearance pane (theme, scheme per appearance, compact, three fonts), apply() (settings preview), Settings Data on this Mac pane, Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates), Settings Queries pane (row limit, statement timeout, history, heartbeat), setFont() (settings preview) (+1 more)

### Community 58 - "Approval"
Cohesion: 0.28
Nodes (9): Approval, Confirm, Passphrase, TouchId, approve_default_lowering(), approve_lowering(), authenticate(), unlock_protect() (+1 more)

### Community 59 - "diagramTab.ts"
Cohesion: 0.22
Nodes (12): DiagramLayout, withMoves(), diagramCanSave(), diagramChanged(), diagramLayoutOf(), diagramViews, mergeDiagram(), sameSet() (+4 more)

### Community 60 - "GuardState"
Cohesion: 0.24
Nodes (9): Passphrase sub-dialogs (set, change, disable, reset/forgot, unlock), authenticate_owner(), disable_passphrase(), evaluate(), lock_protect(), reset_passphrase(), set_passphrase(), hex() (+1 more)

### Community 61 - "Where things live (module map)"
Cohesion: 0.24
Nodes (11): Mongo Fields and Indexes views (no collection sampling), Lucide 'code-xml' icon (teal #1abc9c), Lucide 'map' icon (teal #1abc9c), Back window: 'Revenue by city' SQL query + 9-row result (light), Autocomplete for tables, aliases and columns, <img src="docs/assets/icons/code-xml.svg" width="20" height="20" align="top" alt="" /> The SQL console, <img src="docs/assets/icons/code-xml.svg" width="24" height="24" align="top" alt="" /> Hack on it, Row limit (100 default, 10,000-row cap) (+3 more)

### Community 62 - "check_kinds"
Cohesion: 0.27
Nodes (8): Ask, check(), check_sql(), Classified, Warning, BigLimit, UpdateAll, warnings()

### Community 63 - "Step"
Cohesion: 0.50
Nodes (4): Step, Cancelled, Done, Failed

### Community 64 - "Result cells"
Cohesion: 0.18
Nodes (8): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet

### Community 65 - "Fonts"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 66 - "classify"
Cohesion: 0.21
Nodes (13): big_limits_warn_above_100(), classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+5 more)

### Community 68 - "run_error"
Cohesion: 0.29
Nodes (9): capitalise(), host_of(), test(), password_for(), pg_position(), port_of(), run_error(), test_connection() (+1 more)

### Community 69 - "AGENTS.md"
Cohesion: 0.11
Nodes (17): Graph freshness hooks (PostToolUse + git post-commit), graphify knowledge graph (graphify-out/), app-icon.svg (ypacapy app icon), White capybara head soaking in the cylinder, Database cylinder as hot-spring tub, Teal gradient rounded tile (#2fd3b0 to #0a6e5d), Yuzu (yellow fruit with green leaf) on capybara's head, [0.0.1] - 2026-11-18 (+9 more)

### Community 70 - "GuardState"
Cohesion: 0.28
Nodes (5): check_kinds(), GuardState, Inner, is_final(), is_final()

### Community 72 - "paths.rs"
Cohesion: 0.28
Nodes (4): base64(), config_path(), decode_base64(), write_binary_file()

### Community 73 - "DiagramTab"
Cohesion: 0.33
Nodes (4): DiagramTab, KeyTab, QueryTab, TableTab

### Community 74 - "rediscli.ts"
Cohesion: 0.60
Nodes (4): Redis command console (redis-cli commands in Query tabs), esc(), highlightRedis(), line()

### Community 75 - "themes.js"
Cohesion: 0.13
Nodes (18): apply() (theme/density), layout() (schema tree filter), collection.html (MongoDB collection preview), apply() (collection preview theme/density), Open in console (query as db.orders.find in a new tab), writeUrl() (collection preview), apply() (theme/density), Schema tree sidebar (+10 more)

### Community 76 - "Engine enum"
Cohesion: 0.29
Nodes (6): Engine, Mongo, Mysql, Postgres, Redis, Sqlite

### Community 77 - "LegacyGuard"
Cohesion: 0.50
Nodes (4): LegacyGuard, Confirm, Run, Verify

### Community 78 - "Tauri capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 79 - "SSL modes"
Cohesion: 0.33
Nodes (6): SslMode, Disable, Prefer, Require, VerifyCa, VerifyFull

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
- **128 isolated node(s):** `Done`, `Ask`, `Error`, `Cancelled`, `Done` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 579 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where things live (module map)` connect `Where things live (module map)` to `Fonts`, `Local store`, `DB runtime types`, `paths.rs`, `guard.rs`, `API and types`, `SettingsState`, `store.ts`, `Keychain`, `conns.rs`?**
  _High betweenness centrality (0.407) - this node is a cross-community bridge._
- **What connects `Done`, `Ask`, `Error` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MongoDB driver` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `<img src="docs/assets/icons/code-xml.svg" width="24" height="24" align="top" alt="" /> Hack on it` connect `Where things live (module map)` to `README icons`, `AGENTS.md`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `BSON values` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._
- **Why does `redis.html (Redis connection preview)` connect `Redis previews` to `home.html (Home / Connections preview)`, `rediscli.ts`, `themes.js`, `connect.html (New connection preview)`, `Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates)`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Lucide 'users' icon (teal #1abc9c)` and `Never on the wishlist (accounts, cloud sync, telemetry, background scans)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._