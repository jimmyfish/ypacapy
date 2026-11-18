# Graph Report - ypacapy  (2026-11-19)

## Corpus Check
- 110 files · ~271,945 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1951 nodes · 4487 edges · 101 communities (91 shown, 10 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 296 edges (avg confidence: 0.82)
- Token cost: 917,835 input · 0 output

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
- Query pane
- Store actions
- Guard icons
- Redis and Mongo config
- History sidebar
- Diagram layout engine
- Updater chip preview
- SQL parser types
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
- Color schemes
- Redis state
- Unreleased changelog
- Settings and connect
- Build info and About
- Preview pages
- SQL error and guard
- App shell
- Connection tiles
- Paths and storage
- Connect dialog preview
- Connect URL sync
- Dev dependencies
- Collection pane
- TypeScript config
- Updater cards
- Settings store
- Redis connection
- Approval flow
- Grid edit apply
- SQL highlighting
- Guard prompts
- Window artwork
- Update chip
- Autocomplete preview
- Passphrase guard
- Settings modal
- Connection CRUD
- Result cells
- Fonts
- Modals
- Statement classifier
- Exec stream
- Changelog and README
- Engine icons
- Security level previews
- Connect modal
- About dialog preview
- ER diagram docs
- Schema tree preview
- Engine enum
- Key editing preview
- Tauri capabilities
- SSL modes
- Connection test
- Release notes
- Redis console
- npm scripts
- Apply outcome
- Legacy guard
- Mongo TLS
- Security levels
- Connect preview helpers
- Redis preview helpers
- Updates preview helpers
- Touch ID auth
- Table preview helpers
- Saved queries sidebar
- ypacapy root

## God Nodes (most connected - your core abstractions)
1. `State` - 50 edges
2. `useStore` - 37 edges
3. `icoC()` - 29 edges
4. `run()` - 28 edges
5. `DiagramPane()` - 27 edges
6. `run()` - 26 edges
7. `useCurrent()` - 26 edges
8. `ResultGrid()` - 25 edges
9. `exec()` - 24 edges
10. `Added` - 23 edges

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
- **Write guard approval flow** — readme_write_guard, readme_security_levels, readme_parsed_sql_classification, readme_protected_statement_kinds, readme_app_passphrase, readme_touch_id, readme_strict_unlock_window [EXTRACTED 1.00]
- **Local-only data storage on the Mac** — readme_local_only_principle, readme_config_dir, readme_macos_keychain, readme_atomic_writes, src_tauri_src_paths, src_tauri_src_keychain [INFERRED 0.85]
- **No heavy automatic queries across engines** — readme_quiet_on_server, readme_autocomplete, readme_er_diagram_table_picker, changelog_redis_key_sidebar, changelog_mongo_fields_indexes [INFERRED 0.85]
- **Security level ask flow (None/Low/Strict)** — hallmark_preview_index_write_guard, hallmark_preview_index_setlevel, hallmark_preview_index_guard_confirm_dialog, hallmark_preview_index_guard_passphrase_dialog [EXTRACTED 1.00]
- **ER diagram export flow (image, Mermaid, DBML, drawio)** — readme_diagram_export, hallmark_preview_diagram_openimage, hallmark_preview_diagram_opencode, hallmark_preview_diagram_savedrawio, hallmark_preview_diagram_palette, hallmark_preview_diagram_erd_bundle [EXTRACTED 1.00]
- **Light, catalog-only reads policy across preview screens** — hallmark_preview_index_estimated_row_counts, hallmark_preview_table_estimated_row_count, hallmark_preview_diagram_catalog_only_read, hallmark_preview_index_sql_autocomplete, hallmark_preview_diagram_table_picker [INFERRED 0.85]
- **Home card drag-and-drop flow** — hallmark_preview_home_startdrag, hallmark_preview_home_placeghost, hallmark_preview_home_settarget, hallmark_preview_home_enddrag, hallmark_preview_home_dropon, hallmark_preview_home_recount, hallmark_preview_home_newgroup [EXTRACTED 1.00]
- **Home connection management actions (group, duplicate, remove)** — hallmark_preview_home_card_actions_menu, hallmark_preview_home_group_actions_menu, hallmark_preview_home_remove_connection_dialog, hallmark_preview_home_new_group_dialog, hallmark_preview_home_duplicate_toast, hallmark_preview_home_rename [INFERRED 0.85]
- **About updater drawn as SQL transaction (select releases, insert, commit/rollback)** — hallmark_preview_about_updates_as_query, hallmark_preview_about_updater_states, hallmark_preview_about_install_failed_state, hallmark_preview_about_release_notes, hallmark_preview_about_step [EXTRACTED 1.00]
- **Write guard applied per engine (SQL, MongoDB, Redis)** — hallmark_preview_index_write_guard, hallmark_preview_mongo_write_guard, hallmark_preview_key_write_guard, hallmark_preview_mongo_guard_confirm_dialog, hallmark_preview_mongo_guard_pass_dialog [INFERRED 0.85]
- **Object Info dialogs read once on open and on Refresh** — hallmark_preview_collection_info_dialog, hallmark_preview_mongo_info_dialog, hallmark_preview_key_info_dialog [INFERRED 0.85]
- **Bounded, cheap reads instead of heavy automatic queries** — hallmark_preview_collection_estimated_doc_count, hallmark_preview_collection_fields_view, hallmark_preview_mongo_auto_limit, hallmark_preview_key_incremental_scan, hallmark_preview_key_ttl_only_filter, hallmark_preview_index_estimated_row_counts [INFERRED 0.75]
- **Write guard and passphrase system across previews** — hallmark_preview_redis_write_guard_commands, hallmark_preview_redis_guard_dialogs, hallmark_preview_redis_security_level_menu, hallmark_preview_connect_security_options, hallmark_preview_connect_protected_kinds, hallmark_preview_settings_security_pane, hallmark_preview_settings_passphrase_dialogs [INFERRED 0.85]
- **Connection URL and fields round trip** — hallmark_preview_connect_tourl, hallmark_preview_connect_fromurl, hallmark_preview_connect_mongourl, hallmark_preview_connect_redisurl, hallmark_preview_connect_setengine, hallmark_preview_connect_layout [EXTRACTED 1.00]
- **In-app update flow (Settings pane to title-strip chip)** — hallmark_preview_settings_updates_pane, hallmark_preview_updates_update_chip, hallmark_preview_updates_update_steps, hallmark_preview_updates_install_failed, src_lib_updater [INFERRED 0.85]

## Communities (101 total, 10 thin omitted)

### Community 0 - "MongoDB driver"
Cohesion: 0.06
Nodes (49): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+41 more)

### Community 1 - "BSON values"
Cohesion: 0.06
Nodes (42): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, command_kind() (+34 more)

### Community 2 - "Diagram pane UI"
Cohesion: 0.06
Nodes (30): palette(), react-dom@^18.3.1, react-dom, blobBase64(), Box, BoxItem, BoxMenu(), clampZoom() (+22 more)

### Community 3 - "Home and groups"
Cohesion: 0.09
Nodes (23): react, GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack() (+15 more)

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
Cohesion: 0.09
Nodes (30): AnyFormat, Cell(), CellEditor(), CellMenu(), ColKey, GridRow, jsonHtml(), MenuButton() (+22 more)

### Community 10 - "Query pane"
Cohesion: 0.10
Nodes (34): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunMeta(), useEditTarget(), GridEdit (+26 more)

### Community 11 - "Store actions"
Cohesion: 0.06
Nodes (4): Edits, State, Saved, Settings

### Community 12 - "Guard icons"
Cohesion: 0.06
Nodes (28): ALL_KINDS, CONN_TABS, ConnTab, MONGO_ALL, MONGO_TLS, MONO_FONTS, MY_SSL, PORTS (+20 more)

### Community 13 - "Redis and Mongo config"
Cohesion: 0.13
Nodes (24): b(), cell(), col(), entries(), escaped(), items(), KeyInfo, KeyPage (+16 more)

### Community 14 - "History sidebar"
Cohesion: 0.13
Nodes (26): Clear history dialog, Query history sidebar, JsonLine(), KeyPane(), PARTS, prettyJson(), foldKeys(), HistorySide() (+18 more)

### Community 15 - "Diagram layout engine"
Cohesion: 0.11
Nodes (32): anchorY(), BODY_PAD, Box, boxSize(), Cardinality, cardinality(), DiagramColumn, DiagramDetail (+24 more)

### Community 16 - "Updater chip preview"
Cohesion: 0.06
Nodes (31): Install failed state (signature mismatch, rolled back, 0.0.1 unchanged, Download from GitHub), pvStart() (updates preview), setOpen() (chip popover), step() (window.pvShow, update step switch), Title-strip update chip with popover, Update steps: available, downloading, installing, ready to restart, failed, voidHTTP (design source for the update chip), app (+23 more)

### Community 17 - "SQL parser types"
Cohesion: 0.07
Nodes (17): ALTER, available(), classify_stmt(), CREATE, DELETE, DROP, GRANT, INSERT (+9 more)

### Community 18 - "API and types"
Cohesion: 0.09
Nodes (27): KeyFolder, Approval, Ask, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL, ErdColumn (+19 more)

### Community 19 - "Changelog features"
Cohesion: 0.11
Nodes (28): About dialog (version, update state, dev git info), Added, Mongo Fields and Indexes views (no collection sampling), Settings sections (General, Appearance, Queries, Security, Data on this Mac, Updates), Tabs bar (min-width shrink, sideways scroll, edge fade), Lucide 'folder-tree' icon (teal #1abc9c), Lucide 'palette' icon (teal #1abc9c), Lucide 'sparkles' icon (teal #1abc9c) (+20 more)

### Community 20 - "README icons"
Cohesion: 0.10
Nodes (24): Lucide 'ban' icon (teal #1abc9c), Lucide 'check' icon (teal #1abc9c), Lucide 'circle-help' icon (teal #1abc9c), Lucide 'code-xml' icon (teal #1abc9c), Lucide 'download' icon (teal #1abc9c), Lucide 'feather' icon (teal #1abc9c), Lucide 'hard-drive' icon (teal #1abc9c), Lucide 'keyboard' icon (teal #1abc9c) (+16 more)

### Community 21 - "Diagram preview script"
Cohesion: 0.11
Nodes (26): apply() (draw picked tables), askClose(), Selection cardinality marks and linked columns, changed(), Linked table from another schema (outside box), draw(), window.Erd (inlined src/lib/diagram.ts + diagramExport.ts), window.ERD_DATA / ERD_LINKS sample catalog (+18 more)

### Community 22 - "Catalog commands"
Cohesion: 0.15
Nodes (19): cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState, open_sql(), schema_diagram() (+11 more)

### Community 23 - "Workspace persistence"
Cohesion: 0.10
Nodes (21): Saved diagram (tables, positions, zoom, detail), flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten, Modal (+13 more)

### Community 24 - "SQL pools and exec"
Cohesion: 0.18
Nodes (22): apply(), catalog(), conn(), connect(), execute(), first(), on_pool!, Open (+14 more)

### Community 25 - "BSON cells"
Cohesion: 0.17
Nodes (25): BsonType, cellText(), cellValue(), docsToSet(), fieldsOf(), iso(), isObj(), key() (+17 more)

### Community 26 - "Rust cache workflow"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 27 - "Collection preview"
Cohesion: 0.11
Nodes (23): apply() (theme/density), setFont(), writeUrl(), collection.html (MongoDB collection preview), apply() (collection preview theme/density), Open in console (query as db.orders.find in a new tab), writeUrl() (collection preview), apply() (theme/density) (+15 more)

### Community 28 - "SQL autocomplete"
Cohesion: 0.13
Nodes (22): Base, CLAUSE, completeContext(), Ctx, findSchema(), findTable(), isName(), Item (+14 more)

### Community 29 - "Keychain"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 30 - "Connections store"
Cohesion: 0.12
Nodes (21): Card menu (Edit connection, Duplicate, Move to group, New group, Remove from group, Remove connection), Card drag-and-drop between groups, Connection card (engine tile, name, address, last opened), Connection groups (Production, Staging, Ungrouped), Connections home (grouped connection cards), dropOn(), dup() (duplicate connection), Duplicated toast (Duplicated as shop_prod copy) (+13 more)

### Community 31 - "Connection groups UI"
Cohesion: 0.19
Nodes (18): clean_group(), Conn, conn(), ConnFile, copy_name(), copy_names_skip_taken_ones(), group_is_trimmed_and_blank_is_none(), list_connections() (+10 more)

### Community 32 - "Redis previews"
Cohesion: 0.12
Nodes (22): key.html (Redis key preview), redis.html (Redis connection preview), ask() (write guard dialog for DEL / KEYS), Expiring only filter (TTL keys), Guard dialogs: confirm (Low) and passphrase with Touch ID (Strict), Key Info dialog (TYPE, OBJECT encoding, MEMORY USAGE, idle time), Key row menu (Open key, New command, Copy name, Info, Delete key), window.mInfo() (Info dialog preview states) (+14 more)

### Community 33 - "Dependencies"
Cohesion: 0.12
Nodes (22): dependencies, lucide-react@1.75.0, react@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-process@^2 (+14 more)

### Community 34 - "ERD catalog reads"
Cohesion: 0.23
Nodes (21): add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of(), kind_of() (+13 more)

### Community 35 - "Local store"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "Color schemes"
Cohesion: 0.17
Nodes (20): alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme(), fit() (+12 more)

### Community 37 - "Redis state"
Cohesion: 0.17
Nodes (15): DbState, err_text(), heartbeat(), lost(), open_info(), reader(), redis_key(), redis_key_info() (+7 more)

### Community 38 - "Unreleased changelog"
Cohesion: 0.13
Nodes (20): Added, Changed, One ⋮ menu per connection card on Home, Duplicate a connection (own keychain item, same group), Lucide icons 1.75.0 upgrade (from 0.460.0), Collection Info ($collStats, read on open and Refresh), Documents as table (BSON-typed columns) or JSON, MongoDB connections (host/port, seed list, SRV, URL, TLS/X.509) (+12 more)

### Community 39 - "Settings and connect"
Cohesion: 0.10
Nodes (17): openSub() (connect preview), Per-connection Queries options (row limit / page size, timeout, heartbeat), Remove connection dialog, Settings Appearance pane (theme, scheme per appearance, compact, three fonts), apply() (settings preview), closeSub() (settings preview), Settings Data on this Mac pane, Settings dialog panes (Appearance, Queries, Security, Data on this Mac, Updates) (+9 more)

### Community 40 - "Build info and About"
Cohesion: 0.20
Nodes (15): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+7 more)

### Community 41 - "Preview pages"
Cohesion: 0.17
Nodes (19): about.html (About ypacapy preview), About preview bar (states: Up to date, Checking, Update available, Downloading, Installing, Ready to restart, Install failed, Dev build), Query workspace behind About (schema tree, history, saved queries, tabs, results), setPinned() (tab pin), Pinned query tabs (Pin/Unpin, Close skips pinned, diagrams unpinnable), diagram.html (ER diagram preview), home.html (Home / Connections preview), Connection search (name, host, user, database, file, engine, group; Cmd+F, Enter opens first, Esc clears) (+11 more)

### Community 42 - "SQL error and guard"
Cohesion: 0.13
Nodes (19): Column does not exist error with PostgreSQL HINT and one-click fix, Connection lost state, q2-fix handler (apply HINT column and rerun), runQuery(), SQL error state with database HINT fix, ask() (open guard dialog for a write kind), Guard confirm dialog (Run this on events_prod?), Guard passphrase dialog (with Touch ID option) (+11 more)

### Community 43 - "App shell"
Cohesion: 0.16
Nodes (11): index.html (Vite app entry), App(), AppStrip(), ConnWork(), SIDEBAR_DEFAULT, stack(), useTheme(), useTypeTokens() (+3 more)

### Community 44 - "Connection tiles"
Cohesion: 0.19
Nodes (14): ConnTile(), EngineIcon(), ColorPicker(), ENGINE_LABELS, EnginePicker(), ENGINES, Picker(), PickerOption (+6 more)

### Community 45 - "Paths and storage"
Cohesion: 0.15
Nodes (12): Lucide 'database' icon (teal #1abc9c), Lucide 'history' icon (teal #1abc9c), ~/.config/ypacapy (settings.toml, connections.toml, ypacapy.db), Query history (per connection, last 2,000 runs), <img src="docs/assets/icons/database.svg" width="24" height="24" align="top" alt="" /> Where's my data?, <img src="docs/assets/icons/history.svg" width="20" height="20" align="top" alt="" /> History and saved queries, Saved queries in folders (drift indicator), base64() (+4 more)

### Community 46 - "Connect dialog preview"
Cohesion: 0.13
Nodes (16): connect.html (New connection preview), Advanced tab (app name, connect timeout; Mongo replica set/read preference/direct; Redis key separator, keys per scan), New connection dialog form (Name, Color, Group; General/Options/SSL/Advanced tabs), drawGroup(), Group picker (No group, Home groups, New group...), Security level picker ([data-level-pick], connect), Statements / writes / commands to ask about (per engine), renderLevel() (+8 more)

### Community 47 - "Connect URL sync"
Cohesion: 0.18
Nodes (16): cancel_query on the test's id (Stop test), fromUrl() (URL to fields), layout() (per-engine field visibility), mongoUrl() (mongodb / mongodb+srv URL), window.pvShow (connect states), pvStart() (connect preview), redisUrl() (redis / rediss URL), save_connection Tauri command (+8 more)

### Community 48 - "Dev dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @tauri-apps/cli@^2.0.0, @types/react@^18.3.11, @types/react-dom@^18.3.1, typescript@^5.6.3, vite@^5.4.10, @vitejs/plugin-react@^4.3.2, @tauri-apps/cli (+7 more)

### Community 49 - "Collection pane"
Cohesion: 0.26
Nodes (11): Box(), CollectionPane(), ErrorState(), RunGroup(), mongoColl(), TablePane(), estimate(), tableSelect() (+3 more)

### Community 50 - "TypeScript config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 51 - "Updater cards"
Cohesion: 0.23
Nodes (11): Dev build card (channel, git-describe version, branch, commit, updates off in dev builds), show(), step() (About updater/dev card switch), Updater state cards (checking, current, available, downloading, installing, ready, failed), checkForUpdate(), hasPendingUpdate(), installUpdate(), message() (+3 more)

### Community 52 - "Settings store"
Cohesion: 0.29
Nodes (8): run(), config_dir(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 53 - "Redis connection"
Cohesion: 0.22
Nodes (9): against_a_server(), client(), connect(), db_of(), open_one(), ROpen, secs(), server_of() (+1 more)

### Community 54 - "Approval flow"
Cohesion: 0.17
Nodes (10): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, check(), check_kinds() (+2 more)

### Community 55 - "Grid edit apply"
Cohesion: 0.17
Nodes (15): diagramModel(), tableKey(), withMoves(), diagramCanSave(), diagramChanged(), diagramLayoutOf(), diagramModelOf(), diagramViews (+7 more)

### Community 56 - "SQL highlighting"
Cohesion: 0.19
Nodes (13): apply_edits(), capitalise(), host_of(), pg_position(), plural(), port_of(), run_error(), run_query() (+5 more)

### Community 57 - "Guard prompts"
Cohesion: 0.17
Nodes (14): tokens(), DIALECT, ENGINE_LABEL, ENGINE_NAME, esc(), highlightInline(), highlightSql(), KEEP_LIST (+6 more)

### Community 58 - "Window artwork"
Cohesion: 0.18
Nodes (14): Write guard for MongoDB (write-method kinds, unknown runCommand asks), Write guard for Redis (command groups, KEYS asks with Use SCAN), Security level pill in tabs bar (grey None, orange Low, red Strict), Lucide 'shield-check' icon (teal #1abc9c), ypacapy-window.svg (three stacked app windows, drawn), Front window: Home with Production, Staging and Local groups, Strict security-level pill in tabs bar (red), Home: connection tiles in named groups (+6 more)

### Community 59 - "Update chip"
Cohesion: 0.21
Nodes (6): Notes(), UpdateChip(), mb(), releaseDate(), Updates, useUpdates

### Community 60 - "Autocomplete preview"
Cohesion: 0.19
Nodes (13): ac-data JSON (schemas, tables, columns), accept() (insert suggestion via insertText), window.acShow (autocomplete presets), build() (suggestion list), cols() / fetchCols() column cache, context() (caret statement/clause/table refs), paint() (editor highlight), window.pvShow (query states) (+5 more)

### Community 61 - "Passphrase guard"
Cohesion: 0.24
Nodes (9): Passphrase sub-dialogs (set, change, disable, reset/forgot, unlock), disable_passphrase(), GuardState, Inner, lock_protect(), reset_passphrase(), set_passphrase(), unlock_protect() (+1 more)

### Community 62 - "Settings modal"
Cohesion: 0.21
Nodes (13): LevelSelect(), AppearancePane(), FontRow(), PassDialog(), PassphraseManager(), releaseLink(), SchemeRow(), SecurityPane() (+5 more)

### Community 63 - "Connection CRUD"
Cohesion: 0.36
Nodes (11): ConnLock, delete_connection(), duplicate_connection(), find(), new_id(), now_ms(), save_connection(), set_group() (+3 more)

### Community 64 - "Result cells"
Cohesion: 0.18
Nodes (8): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet

### Community 65 - "Fonts"
Cohesion: 0.25
Nodes (7): Lucide 'map' icon (teal #1abc9c), Where things live (module map), FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 66 - "Modals"
Cohesion: 0.31
Nodes (11): CollInfoModal(), DataPane(), Final(), GuardModal(), KeyInfoModal(), Modals(), PromptModal(), SaveQueryModal() (+3 more)

### Community 67 - "Statement classifier"
Cohesion: 0.25
Nodes (10): classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target(), statement_end() (+2 more)

### Community 69 - "Changelog and README"
Cohesion: 0.22
Nodes (8): [0.0.1] - 2026-11-18, Changelog, Keep a Changelog + Semantic Versioning, Release pipeline (GitHub Actions draft release, latest.json, notes from CHANGELOG), Lucide 'rocket' icon (teal #1abc9c), Cutting a release (tag vX.Y.Z, draft release, publish by hand), release.yml workflow (aarch64 + x86_64 bundles, latest.json), Tauri updater signing key secrets

### Community 70 - "Engine icons"
Cohesion: 0.44
Nodes (9): fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres(), Redis(), Sqlite() (+1 more)

### Community 71 - "Security level previews"
Cohesion: 0.28
Nodes (9): Security level picker for shop_prod (None, Low, Strict), setLevel() (security level), Low: Run this on shop_prod? confirm dialog, Strict: passphrase dialog (optional Touch ID), setLevel() (write guard), Security level (None / Low / Strict), Redis write guard (picked commands; Use SCAN instead), setLevel() (security level None/Low/Strict, mongo) (+1 more)

### Community 72 - "Connect modal"
Cohesion: 0.25
Nodes (8): ConnectModal(), connUrl(), kindsOf(), optNum(), optStr(), OptUnit(), parseUrl(), storedList()

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

### Community 80 - "Connection test"
Cohesion: 0.40
Nodes (6): password_for(), group(), reads_the_database_number(), test(), test_connection(), TestResult

### Community 81 - "Release notes"
Cohesion: 0.40
Nodes (5): Release notes list (first 3, rest behind Show all N changes), Show all / Show less release notes handler, Notes(), noteLines(), plain()

### Community 82 - "Redis console"
Cohesion: 0.60
Nodes (4): Redis command console (redis-cli commands in Query tabs), esc(), highlightRedis(), line()

### Community 83 - "npm scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, tauri, typecheck

### Community 84 - "Apply outcome"
Cohesion: 0.40
Nodes (5): Applied, Done, Failed, Miss, TimedOut

### Community 85 - "Legacy guard"
Cohesion: 0.50
Nodes (4): LegacyGuard, Confirm, Run, Verify

### Community 86 - "Mongo TLS"
Cohesion: 0.50
Nodes (4): MongoTls, Insecure, Off, On

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

### Community 91 - "Touch ID auth"
Cohesion: 0.67
Nodes (3): authenticate(), authenticate_owner(), evaluate()

## Ambiguous Edges - Review These
- `Never on the wishlist (accounts, cloud sync, telemetry, background scans)` → `Lucide 'users' icon (teal #1abc9c)`  [AMBIGUOUS]
  README.md · relation: references

## Knowledge Gaps
- **126 isolated node(s):** `CLAUDE.md (symlink to AGENTS.md)`, `index.html (Vite app entry)`, `ypacapy`, `Postgres`, `Mysql` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 561 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Where things live (module map)` connect `Fonts` to `Local store`, `DB runtime types`, `Paths and storage`, `SQL parser types`, `API and types`, `README icons`, `Settings store`, `Workspace persistence`, `Keychain`, `Connection groups UI`?**
  _High betweenness centrality (0.393) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `run()` (e.g. with `capitalise()` and `summary()`) actually correct?**
  _`run()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CLAUDE.md (symlink to AGENTS.md)`, `index.html (Vite app entry)`, `ypacapy` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MongoDB driver` be split into smaller, more focused modules?**
  _Cohesion score 0.05661729574773053 - nodes in this community are weakly interconnected._
- **Why does `<img src="docs/assets/icons/code-xml.svg" width="24" height="24" align="top" alt="" /> Hack on it` connect `README icons` to `Fonts`, `Changelog and README`, `Brand and graph docs`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `BSON values` be split into smaller, more focused modules?**
  _Cohesion score 0.05877167205406994 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Never on the wishlist (accounts, cloud sync, telemetry, background scans)` and `Lucide 'users' icon (teal #1abc9c)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._