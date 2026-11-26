# Graph Report - ypacapy  (2026-11-26)

## Corpus Check
- 86 files · ~406,175 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: .css 33, (none) 4, .lock 1)
- WARNING: 38 of 165 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1798 nodes · 4745 edges · 67 communities (62 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 142 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `014a0067`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mongo.rs
- mongo_shell.rs
- RawExec
- Ask.tsx
- diagram.ts
- icoC
- rediscli.ts
- themes.ts
- Modals.tsx
- package.json
- with
- redis_cli.rs
- build-window.mjs
- check
- Pool
- AboutModal.tsx
- ROpen
- guard.rs
- types.ts
- DiagramPane.tsx
- ypacapy
- cache.yml
- SqlEditor.tsx
- tauri.conf.json
- redis.rs
- conns.rs
- UpdateChip.tsx
- erd.rs
- compilerOptions
- keychain.rs
- App.tsx
- DbState
- fonts.rs
- store.ts
- diagramTab.ts
- store.rs
- SecurityLevel
- connect
- Engine
- default.json
- SslMode
- Applied
- SqlEditor.tsx
- connect
- paths.rs
- TaskManager.tsx
- verify
- ypacapy
- run
- SettingsState
- Sidebar.tsx
- CollectionPane.tsx
- Exec
- Approval
- @tauri-apps/api
- classify
- start_heartbeat
- ResultGrid.tsx
- State
- TODO: Windows build (.msi / NSIS .exe)
- Phase 1: usable build
- DocCards.tsx
- db.rs
- run_error

## God Nodes (most connected - your core abstractions)
1. `State` - 60 edges
2. `useStore` - 54 edges
3. `icoC()` - 37 edges
4. `react` - 29 edges
5. `DiagramPane()` - 29 edges
6. `run()` - 27 edges
7. `DocCards()` - 27 edges
8. `errText()` - 27 edges
9. `useCurrent()` - 27 edges
10. `EmptyState()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Styles: one CSS file per component` --references--> `App()`  [INFERRED]
  CLAUDE.md → src/App.tsx
- `save_settings()` --references--> `strict`  [INFERRED]
  src-tauri/src/settings.rs → tsconfig.json
- `save_query()` --calls--> `now_ms()`  [INFERRED]
  src-tauri/src/store.rs → src-tauri/src/conns.rs
- `save_workspace()` --calls--> `now_ms()`  [INFERRED]
  src-tauri/src/store.rs → src-tauri/src/conns.rs
- `save_query()` --calls--> `new_id()`  [INFERRED]
  src-tauri/src/store.rs → src-tauri/src/conns.rs

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`
- 1-file cycle: `src-tauri/src/paths.rs -> src-tauri/src/paths.rs`

## Communities (67 total, 5 thin omitted)

### Community 0 - "mongo.rs"
Cohesion: 0.06
Nodes (49): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+41 more)

### Community 1 - "mongo_shell.rs"
Cohesion: 0.06
Nodes (42): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, command_kind() (+34 more)

### Community 3 - "Ask.tsx"
Cohesion: 0.05
Nodes (59): Actions(), Alt(), ConfirmAsk(), Effects(), FinalLine(), GuardAsk(), Ico(), ICONS (+51 more)

### Community 4 - "diagram.ts"
Cohesion: 0.10
Nodes (33): anchorY(), BODY_PAD, Box, boxSize(), Cardinality, cardinality(), DiagramColumn, DiagramDetail (+25 more)

### Community 5 - "icoC"
Cohesion: 0.07
Nodes (24): react, Box, BoxMenu(), DiagramPane(), GroupSelect(), address(), dropAttr(), DropKey (+16 more)

### Community 6 - "rediscli.ts"
Cohesion: 0.83
Nodes (3): esc(), highlightRedis(), line()

### Community 7 - "themes.ts"
Cohesion: 0.16
Nodes (21): CONN_HEX_BY_ID, alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 8 - "Modals.tsx"
Cohesion: 0.06
Nodes (54): ALL_KINDS, AppearancePane(), CollInfoModal(), CONN_TABS, ConnectModal(), ConnQueriesPane(), ConnSecurityPane(), ConnTab (+46 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (42): dependencies, lucide-react@1.75.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-process@^2, @tauri-apps/plugin-updater@^2 (+34 more)

### Community 10 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 11 - "redis_cli.rs"
Cohesion: 0.08
Nodes (32): c(), classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES, KEYS_W, Kind (+24 more)

### Community 12 - "build-window.mjs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 13 - "check"
Cohesion: 0.27
Nodes (8): Ask, check(), check_sql(), Classified, Warning, BigLimit, UpdateAll, warnings()

### Community 14 - "Pool"
Cohesion: 0.18
Nodes (20): apply(), conn(), connect(), execute(), first(), on_pool!, Open, open() (+12 more)

### Community 15 - "AboutModal.tsx"
Cohesion: 0.12
Nodes (22): @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-opener, DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql() (+14 more)

### Community 16 - "ROpen"
Cohesion: 0.31
Nodes (3): open_one(), ROpen, server_of()

### Community 17 - "guard.rs"
Cohesion: 0.05
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "types.ts"
Cohesion: 0.08
Nodes (30): KeyFolder, Ask, CollInfo, ColumnBrief, DEFAULT_LEVEL, DiagramTab, ErdColumn, ErdKey (+22 more)

### Community 19 - "DiagramPane.tsx"
Cohesion: 0.11
Nodes (14): blobBase64(), BoxItem, clampZoom(), CODE, CodeDialog(), DETAILS, fileName(), ImageDialog() (+6 more)

### Community 20 - "ypacapy"
Cohesion: 0.05
Nodes (39): [0.0.1] - 2026-11-18, [0.1.0] - 2026-11-19, [0.1.1] - 2026-11-20, [0.1.2] - 2026-11-25, [0.1.3] - 2026-11-26, Added, Added, Added (+31 more)

### Community 21 - "cache.yml"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 22 - "SqlEditor.tsx"
Cohesion: 0.07
Nodes (38): highlightJson(), highlightPlain(), Base, CLAUSE, completeContext(), Ctx, findSchema(), findTable() (+30 more)

### Community 23 - "tauri.conf.json"
Cohesion: 0.08
Nodes (24): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+16 more)

### Community 24 - "redis.rs"
Cohesion: 0.14
Nodes (23): against_a_server(), b(), cell(), col(), entries(), escaped(), items(), KeyInfo (+15 more)

### Community 25 - "conns.rs"
Cohesion: 0.19
Nodes (23): clean_group(), conn(), ConnLock, copy_name(), copy_names_skip_taken_ones(), delete_connection(), duplicate_connection(), group_is_trimmed_and_blank_is_none() (+15 more)

### Community 26 - "UpdateChip.tsx"
Cohesion: 0.16
Nodes (14): releaseLink(), UpdatesPane(), UpdateChip(), checkForUpdate(), hasPendingUpdate(), installUpdate(), mb(), message() (+6 more)

### Community 27 - "erd.rs"
Cohesion: 0.19
Nodes (24): catalog(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of() (+16 more)

### Community 28 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 29 - "keychain.rs"
Cohesion: 0.13
Nodes (16): set_passphrase(), check_passphrase(), clear_passphrase(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 30 - "App.tsx"
Cohesion: 0.17
Nodes (20): App(), AppStrip(), SIDEBAR_DEFAULT, stack(), useTheme(), useTypeTokens(), beatOn(), LABEL (+12 more)

### Community 31 - "DbState"
Cohesion: 0.18
Nodes (21): find(), apply_edits(), cancel_query(), check_schema(), close_connection(), col(), DbState, err_text() (+13 more)

### Community 32 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 33 - "store.ts"
Cohesion: 0.11
Nodes (18): flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten, newQuery(), readWorkspace() (+10 more)

### Community 34 - "diagramTab.ts"
Cohesion: 0.15
Nodes (17): DiagramLayout, DiagramModel, diagramModel(), tableKey(), withMoves(), diagramCanSave(), diagramChanged(), diagramKey() (+9 more)

### Community 35 - "store.rs"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "SecurityLevel"
Cohesion: 0.14
Nodes (12): LegacyGuard, Confirm, Run, Verify, MongoTls, Insecure, Off, On (+4 more)

### Community 37 - "connect"
Cohesion: 0.25
Nodes (10): DbState, err_text(), heartbeat(), lost(), open_info(), redis_key(), redis_key_info(), redis_scan() (+2 more)

### Community 38 - "Engine"
Cohesion: 0.29
Nodes (6): Engine, Mongo, Mysql, Postgres, Redis, Sqlite

### Community 39 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 40 - "SslMode"
Cohesion: 0.33
Nodes (6): SslMode, Disable, Prefer, Require, VerifyCa, VerifyFull

### Community 41 - "Applied"
Cohesion: 0.40
Nodes (5): Applied, Done, Failed, Miss, TimedOut

### Community 42 - "SqlEditor.tsx"
Cohesion: 0.16
Nodes (6): Completer, ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON

### Community 43 - "connect"
Cohesion: 0.36
Nodes (9): client(), connect(), db_of(), group(), reads_the_database_number(), secs(), test(), trimmed() (+1 more)

### Community 44 - "paths.rs"
Cohesion: 0.24
Nodes (6): APP_DIR, base64(), config_path(), decode_base64(), expand_tilde(), write_binary_file()

### Community 47 - "TaskManager.tsx"
Cohesion: 0.09
Nodes (37): ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres() (+29 more)

### Community 48 - "verify"
Cohesion: 0.20
Nodes (10): authenticate(), authenticate_owner(), check_kinds(), disable_passphrase(), evaluate(), GuardState, Inner, lock_protect() (+2 more)

### Community 51 - "run"
Cohesion: 0.25
Nodes (8): query(), reader(), run(), Step, Cancelled, Done, Failed, summary()

### Community 52 - "SettingsState"
Cohesion: 0.14
Nodes (17): Conn, ConnFile, list_connections(), load(), old_guards_become_levels_never_weaker(), path(), store(), strict_to_low() (+9 more)

### Community 53 - "Sidebar.tsx"
Cohesion: 0.12
Nodes (32): EmptyState(), Keys(), QueryChip(), isJson(), JsonLine(), KeyPane(), KeyTtl(), looksBinary() (+24 more)

### Community 54 - "CollectionPane.tsx"
Cohesion: 0.11
Nodes (33): ConnWork(), Box(), CollectionPane(), Picker(), EmptyRow(), Obj(), CtxSelect(), Elapsed() (+25 more)

### Community 55 - "Exec"
Cohesion: 0.18
Nodes (8): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, ResultSet

### Community 56 - "Approval"
Cohesion: 0.33
Nodes (7): Approval, Confirm, Passphrase, TouchId, approve_default_lowering(), approve_lowering(), verify()

### Community 57 - "@tauri-apps/api"
Cohesion: 0.40
Nodes (4): @tauri-apps/api@^2.0.0, @tauri-apps/api, FontList, systemFonts()

### Community 66 - "classify"
Cohesion: 0.17
Nodes (15): big_limits_warn_above_100(), classify(), classify_tokens(), dialect(), fallback_tokenizer(), is_final(), kinds(), reads_never_ask() (+7 more)

### Community 67 - "start_heartbeat"
Cohesion: 0.48
Nodes (3): Beat, beat_pool!, start_heartbeat()

### Community 72 - "ResultGrid.tsx"
Cohesion: 0.06
Nodes (54): useEditTarget(), AnyFormat, Cell(), CellEditor(), CellMenu(), DocsActions(), GridEdit, GridRow (+46 more)

### Community 73 - "State"
Cohesion: 0.05
Nodes (4): Edits, State, Approval, Settings

### Community 76 - "TODO: Windows build (.msi / NSIS .exe)"
Cohesion: 0.13
Nodes (14): Already fine on Windows, CI (`.github/workflows/release.yml`), Code signing - owner decision, Home folder (`src-tauri/src/paths.rs`) - blocker, Keychain (`src-tauri/src/keychain.rs`), Path splitting in the frontend, Phase 1: the app must start, Phase 2: secrets and auth (+6 more)

### Community 78 - "Phase 1: usable build"
Cohesion: 0.14
Nodes (13): Already fine on Linux, CI and packaging (`.github/workflows/release.yml`), Copy, Keyboard shortcuts, Keychain (`src-tauri/src/keychain.rs`), Known WebKitGTK issues (not fixable in CSS), Passphrase reset (`src-tauri/src/guard.rs`), Phase 1: usable build (+5 more)

### Community 80 - "DocCards.tsx"
Cohesion: 0.07
Nodes (67): DocCards(), card(), example(), line(), removeUndo(), send(), DocEdit, EMPTY (+59 more)

### Community 102 - "db.rs"
Cohesion: 0.05
Nodes (20): Affected, BEAT_WAIT, ColumnBrief, EditRequest, HARD_CAP, Link, impl_affected!, impl_cells! (+12 more)

### Community 108 - "run_error"
Cohesion: 0.20
Nodes (10): capitalise(), host_of(), pg_position(), port_of(), run_error(), RunOutcome, Ask, Cancelled (+2 more)

## Knowledge Gaps
- **44 isolated node(s):** `ypacapy`, `Postgres`, `Mysql`, `Sqlite`, `Mongo` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 538 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SettingsState` connect `SettingsState` to `mongo.rs`, `classify`, `connect`, `db.rs`, `check`, `run`, `conns.rs`, `DbState`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `ypacapy`, `Postgres`, `Mysql` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mongo.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.058426966292134834 - nodes in this community are weakly interconnected._
- **Why does `run()` connect `run` to `store.rs`, `connect`, `db.rs`, `connect`, `run_error`, `redis_cli.rs`, `ROpen`, `verify`, `SettingsState`, `redis.rs`, `conns.rs`, `DbState`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `mongo_shell.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._
- **Why does `App()` connect `App.tsx` to `icoC`, `package.json`, `ypacapy`, `Sidebar.tsx`, `CollectionPane.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `Ask.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.053728949478749 - nodes in this community are weakly interconnected._