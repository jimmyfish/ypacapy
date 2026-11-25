# Graph Report - ypacapy  (2026-11-25)

## Corpus Check
- 84 files · ~368,441 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 36 file(s) not represented in the graph (top: .css 31, (none) 4, .lock 1)
- WARNING: 36 of 159 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1757 nodes · 4562 edges · 67 communities (60 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 142 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba071cf1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mongo.rs
- mongo_shell.rs
- RawExec
- Ask.tsx
- DiagramPane.tsx
- App.tsx
- QueryPane.tsx
- themes.ts
- Modals.tsx
- package.json
- with
- redis_cli.rs
- build-window.mjs
- table
- Pool
- AboutModal.tsx
- ROpen
- guard.rs
- types.ts
- conns.rs
- ypacapy
- cache.yml
- complete.ts
- tauri.conf.json
- redis.rs
- find
- updater.ts
- erd.rs
- compilerOptions
- keychain.rs
- ConnStatus.tsx
- DbState
- fonts.rs
- paths.rs
- Approval
- store.rs
- Engine
- connect
- Engine
- default.json
- SslMode
- Applied
- @tauri-apps/api
- esc
- SecurityLevel
- check
- GuardState
- ypacapy
- SettingsState
- run
- classify
- start_heartbeat
- store.ts
- ResultGrid.tsx
- State
- Sidebar.tsx
- TODO: Windows build (.msi / NSIS .exe)
- SqlEditor.tsx
- Phase 1: usable build
- useStore
- DocCards.tsx
- main.tsx
- db.rs
- postgres_runs

## God Nodes (most connected - your core abstractions)
1. `State` - 57 edges
2. `useStore` - 52 edges
3. `icoC()` - 37 edges
4. `react` - 27 edges
5. `run()` - 27 edges
6. `DiagramPane()` - 27 edges
7. `DocCards()` - 27 edges
8. `errText()` - 27 edges
9. `useCurrent()` - 27 edges
10. `ResultGrid()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Styles: one CSS file per component` --references--> `App()`  [INFERRED]
  CLAUDE.md → src/App.tsx
- `save_settings()` --references--> `strict`  [INFERRED]
  src-tauri/src/settings.rs → tsconfig.json
- `path()` --calls--> `config_dir()`  [INFERRED]
  src-tauri/src/conns.rs → src-tauri/src/paths.rs
- `store()` --calls--> `write_atomic()`  [INFERRED]
  src-tauri/src/conns.rs → src-tauri/src/paths.rs
- `save_query()` --calls--> `now_ms()`  [INFERRED]
  src-tauri/src/store.rs → src-tauri/src/conns.rs

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`
- 1-file cycle: `src-tauri/src/paths.rs -> src-tauri/src/paths.rs`

## Communities (67 total, 7 thin omitted)

### Community 0 - "mongo.rs"
Cohesion: 0.05
Nodes (51): capitalise(), Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo (+43 more)

### Community 1 - "mongo_shell.rs"
Cohesion: 0.06
Nodes (42): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, command_kind() (+34 more)

### Community 3 - "Ask.tsx"
Cohesion: 0.06
Nodes (58): Actions(), Alt(), ConfirmAsk(), Effects(), FinalLine(), GuardAsk(), Ico(), ICONS (+50 more)

### Community 4 - "DiagramPane.tsx"
Cohesion: 0.06
Nodes (68): blobBase64(), Box, BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog(), DETAILS (+60 more)

### Community 5 - "App.tsx"
Cohesion: 0.07
Nodes (28): react, SIDEBAR_DEFAULT, stack(), useTypeTokens(), address(), dropAttr(), DropKey, ENGINE_WORDS (+20 more)

### Community 6 - "QueryPane.tsx"
Cohesion: 0.07
Nodes (46): CtxSelect(), Elapsed(), ErrorState(), QueryContext(), QueryPane(), QueryResults(), RunMeta(), useEditTarget() (+38 more)

### Community 7 - "themes.ts"
Cohesion: 0.08
Nodes (44): useTheme(), ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mongo(), Mysql() (+36 more)

### Community 8 - "Modals.tsx"
Cohesion: 0.07
Nodes (43): GroupSelect(), ALL_KINDS, AppearancePane(), CONN_TABS, ConnectModal(), ConnQueriesPane(), ConnSecurityPane(), ConnTab (+35 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@1.75.0, react@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-process@^2 (+32 more)

### Community 10 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 11 - "redis_cli.rs"
Cohesion: 0.08
Nodes (32): query(), classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES, KEYS_W, Kind (+24 more)

### Community 12 - "build-window.mjs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 13 - "table"
Cohesion: 0.37
Nodes (11): cell(), col(), entries(), escaped(), items(), KeyPage, pairs(), read_key() (+3 more)

### Community 14 - "Pool"
Cohesion: 0.16
Nodes (21): apply(), conn(), connect(), execute(), first(), on_pool!, Open, open() (+13 more)

### Community 15 - "AboutModal.tsx"
Cohesion: 0.15
Nodes (21): @tauri-apps/plugin-opener, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line(), Notes() (+13 more)

### Community 16 - "ROpen"
Cohesion: 0.31
Nodes (3): open_one(), ROpen, server_of()

### Community 17 - "guard.rs"
Cohesion: 0.05
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "types.ts"
Cohesion: 0.10
Nodes (27): KeyFolder, api, AskSubject, Ask, CollInfo, ColumnBrief, Conn, DEFAULT_LEVEL (+19 more)

### Community 19 - "conns.rs"
Cohesion: 0.14
Nodes (26): Conn, conn(), ConnFile, copy_name(), copy_names_skip_taken_ones(), group_is_trimmed_and_blank_is_none(), keep_history_overrides_settings_only_when_set(), LegacyGuard (+18 more)

### Community 20 - "ypacapy"
Cohesion: 0.05
Nodes (36): [0.0.1] - 2026-11-18, [0.1.0] - 2026-11-19, [0.1.1] - 2026-11-20, [0.1.2] - 2026-11-25, Added, Added, Added, Added (+28 more)

### Community 21 - "cache.yml"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 22 - "complete.ts"
Cohesion: 0.13
Nodes (23): Base, CLAUSE, completeContext(), Ctx, findSchema(), findTable(), isName(), Item (+15 more)

### Community 23 - "tauri.conf.json"
Cohesion: 0.08
Nodes (24): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+16 more)

### Community 24 - "redis.rs"
Cohesion: 0.13
Nodes (15): b(), c(), group(), numbered(), prints_like_redis_cli(), quoted(), raw(), raw_lines() (+7 more)

### Community 25 - "find"
Cohesion: 0.27
Nodes (14): clean_group(), ConnLock, delete_connection(), duplicate_connection(), find(), new_id(), now_ms(), save_connection() (+6 more)

### Community 26 - "updater.ts"
Cohesion: 0.15
Nodes (13): DEV_BUILD, DevBuild, UpdateChip(), checkForUpdate(), hasPendingUpdate(), installUpdate(), message(), NOTE_PREFIX (+5 more)

### Community 27 - "erd.rs"
Cohesion: 0.17
Nodes (26): catalog(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of() (+18 more)

### Community 28 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 29 - "keychain.rs"
Cohesion: 0.13
Nodes (16): set_passphrase(), check_passphrase(), clear_passphrase(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 30 - "ConnStatus.tsx"
Cohesion: 0.27
Nodes (10): beatOn(), LABEL, LinkBar(), LinkNote(), Mark(), SideLink(), TabLink(), useLink() (+2 more)

### Community 31 - "DbState"
Cohesion: 0.15
Nodes (25): apply_edits(), cancel_query(), check_schema(), close_connection(), col(), DbState, err_text(), host_of() (+17 more)

### Community 32 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 33 - "paths.rs"
Cohesion: 0.28
Nodes (5): APP_DIR, base64(), config_path(), decode_base64(), write_binary_file()

### Community 35 - "store.rs"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "Engine"
Cohesion: 0.29
Nodes (6): UrlParts, Source, ColumnsEntry, Engine, ReadPref, SslMode

### Community 37 - "connect"
Cohesion: 0.18
Nodes (17): against_a_server(), client(), connect(), db_of(), DbState, err_text(), heartbeat(), KeyInfo (+9 more)

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

### Community 42 - "@tauri-apps/api"
Cohesion: 0.50
Nodes (3): @tauri-apps/api, FontList, systemFonts()

### Community 43 - "esc"
Cohesion: 0.50
Nodes (4): highlightJson(), highlightPlain(), esc(), highlightSql()

### Community 44 - "SecurityLevel"
Cohesion: 0.50
Nodes (4): SecurityLevel, Low, None, Strict

### Community 47 - "check"
Cohesion: 0.27
Nodes (8): Ask, check(), check_sql(), Classified, Warning, BigLimit, UpdateAll, warnings()

### Community 48 - "GuardState"
Cohesion: 0.14
Nodes (17): Approval, Confirm, Passphrase, TouchId, approve_default_lowering(), approve_lowering(), authenticate(), authenticate_owner() (+9 more)

### Community 52 - "SettingsState"
Cohesion: 0.21
Nodes (8): run(), config_dir(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 58 - "run"
Cohesion: 0.33
Nodes (6): run(), Step, Cancelled, Done, Failed, summary()

### Community 66 - "classify"
Cohesion: 0.16
Nodes (16): guard_ask(), big_limits_warn_above_100(), classify(), classify_tokens(), dialect(), fallback_tokenizer(), is_final(), kinds() (+8 more)

### Community 67 - "start_heartbeat"
Cohesion: 0.43
Nodes (4): Beat, beat_pool!, heartbeat(), start_heartbeat()

### Community 68 - "store.ts"
Cohesion: 0.10
Nodes (21): flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten, newQuery(), readWorkspace() (+13 more)

### Community 72 - "ResultGrid.tsx"
Cohesion: 0.08
Nodes (32): AnyFormat, Cell(), CellEditor(), CellMenu(), DocsActions(), GridRow, jsonHtml(), MenuButton() (+24 more)

### Community 73 - "State"
Cohesion: 0.05
Nodes (3): Edits, State, Saved

### Community 75 - "Sidebar.tsx"
Cohesion: 0.09
Nodes (41): ConnWork(), Box(), CollectionPane(), isJson(), JsonLine(), KeyPane(), KeyTtl(), looksBinary() (+33 more)

### Community 76 - "TODO: Windows build (.msi / NSIS .exe)"
Cohesion: 0.13
Nodes (14): Already fine on Windows, CI (`.github/workflows/release.yml`), Code signing - owner decision, Home folder (`src-tauri/src/paths.rs`) - blocker, Keychain (`src-tauri/src/keychain.rs`), Path splitting in the frontend, Phase 1: the app must start, Phase 2: secrets and auth (+6 more)

### Community 77 - "SqlEditor.tsx"
Cohesion: 0.13
Nodes (8): react-dom@^18.3.1, react-dom, Completer, ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON

### Community 78 - "Phase 1: usable build"
Cohesion: 0.14
Nodes (13): Already fine on Linux, CI and packaging (`.github/workflows/release.yml`), Copy, Keyboard shortcuts, Keychain (`src-tauri/src/keychain.rs`), Known WebKitGTK issues (not fixable in CSS), Passphrase reset (`src-tauri/src/guard.rs`), Phase 1: usable build (+5 more)

### Community 79 - "useStore"
Cohesion: 0.23
Nodes (15): App(), AppStrip(), CollInfoModal(), DataPane(), KeyInfoModal(), Modals(), PassphraseManager(), QueriesPane() (+7 more)

### Community 80 - "DocCards.tsx"
Cohesion: 0.07
Nodes (69): DocCards(), card(), example(), line(), removeUndo(), send(), DocEdit, EMPTY (+61 more)

### Community 102 - "db.rs"
Cohesion: 0.05
Nodes (19): Affected, BEAT_WAIT, ColumnBrief, EditRequest, HARD_CAP, Link, impl_affected!, impl_cells! (+11 more)

### Community 108 - "postgres_runs"
Cohesion: 0.17
Nodes (9): Cells, Collected, ColMeta, done(), Exec, Cancelled, Done, postgres_runs() (+1 more)

## Knowledge Gaps
- **44 isolated node(s):** `ypacapy`, `Postgres`, `Mysql`, `Sqlite`, `Mongo` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 524 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SettingsState` connect `SettingsState` to `mongo.rs`, `classify`, `connect`, `db.rs`, `check`, `conns.rs`, `run`, `DbState`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `run()` (e.g. with `capitalise()` and `summary()`) actually correct?**
  _`run()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ypacapy`, `Postgres`, `Mysql` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mongo.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05422100205902539 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `Approval`, `Ask.tsx`, `store.ts`, `QueryPane.tsx`, `Modals.tsx`, `ResultGrid.tsx`, `types.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `mongo_shell.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._
- **Why does `App()` connect `useStore` to `App.tsx`, `themes.ts`, `Sidebar.tsx`, `ypacapy`, `main.tsx`, `ConnStatus.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._