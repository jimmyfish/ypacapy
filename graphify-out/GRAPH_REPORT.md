# Graph Report - ypacapy  (2026-11-26)

## Corpus Check
- 86 files · ~401,462 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: .css 33, (none) 4, .lock 1)
- WARNING: 38 of 165 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1792 nodes · 4702 edges · 69 communities (60 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 142 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b8780dd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mongo.rs
- mongo_shell.rs
- RawExec
- Ask.tsx
- DiagramPane.tsx
- icoC
- diagram.ts
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
- load
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
- QueryPane.tsx
- ConnectModal
- store.rs
- Conn
- connect
- Engine
- default.json
- SslMode
- Applied
- Pool
- diagramTab.ts
- SecurityLevel
- TaskManager.tsx
- GuardState
- ypacapy
- connect
- SettingsState
- KeyPane.tsx
- CollectionPane.tsx
- classify
- Beat
- store.ts
- ResultGrid.tsx
- State
- TODO: Windows build (.msi / NSIS .exe)
- Phase 1: usable build
- DocCards.tsx
- db.rs
- ResultSet

## God Nodes (most connected - your core abstractions)
1. `State` - 58 edges
2. `useStore` - 54 edges
3. `icoC()` - 37 edges
4. `DiagramPane()` - 29 edges
5. `react` - 29 edges
6. `useCurrent()` - 27 edges
7. `errText()` - 27 edges
8. `DocCards()` - 27 edges
9. `ico` - 26 edges
10. `EmptyState()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Styles: one CSS file per component` --references--> `App()`  [INFERRED]
  CLAUDE.md → src/App.tsx
- `save_settings()` --references--> `strict`  [INFERRED]
  src-tauri/src/settings.rs → tsconfig.json
- `DbState` --references--> `MOpen`  [INFERRED]
  src-tauri/src/db.rs → src-tauri/src/db/mongo.rs
- `explain()` --references--> `Call`  [INFERRED]
  src-tauri/src/db/mongo.rs → src-tauri/src/mongo_shell.rs
- `run()` --references--> `RunRequest`  [INFERRED]
  src-tauri/src/db/mongo.rs → src-tauri/src/db.rs

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`
- 1-file cycle: `src-tauri/src/paths.rs -> src-tauri/src/paths.rs`

## Communities (69 total, 9 thin omitted)

### Community 0 - "mongo.rs"
Cohesion: 0.06
Nodes (47): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+39 more)

### Community 1 - "mongo_shell.rs"
Cohesion: 0.06
Nodes (44): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, Call (+36 more)

### Community 3 - "Ask.tsx"
Cohesion: 0.06
Nodes (60): Actions(), Alt(), ConfirmAsk(), Effects(), FinalLine(), GuardAsk(), Ico(), ICONS (+52 more)

### Community 4 - "DiagramPane.tsx"
Cohesion: 0.10
Nodes (26): blobBase64(), Box, BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog(), DETAILS (+18 more)

### Community 5 - "icoC"
Cohesion: 0.09
Nodes (24): lucide-react, react, GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename() (+16 more)

### Community 6 - "diagram.ts"
Cohesion: 0.12
Nodes (27): BODY_PAD, Box, boxSize(), Cardinality, cardinality(), DiagramColumn, DiagramDetail, DiagramEdge (+19 more)

### Community 7 - "themes.ts"
Cohesion: 0.17
Nodes (20): alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme(), fit() (+12 more)

### Community 8 - "Modals.tsx"
Cohesion: 0.07
Nodes (27): ALL_KINDS, CollInfoModal(), CONN_TABS, ConnTab, MONGO_ALL, MONGO_TLS, MONO_FONTS, MY_SSL (+19 more)

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (45): dependencies, lucide-react@1.75.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+37 more)

### Community 10 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 11 - "redis_cli.rs"
Cohesion: 0.08
Nodes (35): c(), query(), is_final(), classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES (+27 more)

### Community 12 - "build-window.mjs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 13 - "check"
Cohesion: 0.27
Nodes (8): Ask, check(), check_sql(), Classified, Warning, BigLimit, UpdateAll, warnings()

### Community 14 - "Pool"
Cohesion: 0.19
Nodes (21): apply(), Collected, conn(), done(), Exec, Cancelled, Done, execute() (+13 more)

### Community 15 - "AboutModal.tsx"
Cohesion: 0.19
Nodes (20): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+12 more)

### Community 16 - "ROpen"
Cohesion: 0.20
Nodes (7): open_one(), ROpen, server_of(), Step, Cancelled, Done, Failed

### Community 17 - "guard.rs"
Cohesion: 0.06
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "types.ts"
Cohesion: 0.09
Nodes (29): KeyFolder, Ask, CollInfo, ColumnBrief, DEFAULT_LEVEL, DiagramTab, ErdColumn, ErdKey (+21 more)

### Community 19 - "load"
Cohesion: 0.38
Nodes (7): list_connections(), load(), old_guards_become_levels_never_weaker(), path(), store(), strict_to_low(), to_level()

### Community 20 - "ypacapy"
Cohesion: 0.05
Nodes (36): [0.0.1] - 2026-11-18, [0.1.0] - 2026-11-19, [0.1.1] - 2026-11-20, [0.1.2] - 2026-11-25, Added, Added, Added, Added (+28 more)

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
Cohesion: 0.13
Nodes (22): plural(), b(), cell(), entries(), escaped(), items(), KeyPage, numbered() (+14 more)

### Community 25 - "conns.rs"
Cohesion: 0.20
Nodes (22): clean_group(), conn(), ConnLock, copy_name(), copy_names_skip_taken_ones(), delete_connection(), duplicate_connection(), find() (+14 more)

### Community 26 - "UpdateChip.tsx"
Cohesion: 0.13
Nodes (14): Notes(), Notes(), UpdateChip(), checkForUpdate(), hasPendingUpdate(), installUpdate(), message(), NOTE_PREFIX (+6 more)

### Community 27 - "erd.rs"
Cohesion: 0.19
Nodes (25): catalog(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of() (+17 more)

### Community 28 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 29 - "keychain.rs"
Cohesion: 0.12
Nodes (17): set_passphrase(), check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase() (+9 more)

### Community 30 - "App.tsx"
Cohesion: 0.14
Nodes (20): App(), AppStrip(), SIDEBAR_DEFAULT, stack(), useTheme(), useTypeTokens(), beatOn(), LABEL (+12 more)

### Community 31 - "DbState"
Cohesion: 0.12
Nodes (24): apply_edits(), cancel_query(), check_schema(), close_connection(), col(), ColumnBrief, DbState, err_text() (+16 more)

### Community 32 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 33 - "QueryPane.tsx"
Cohesion: 0.08
Nodes (39): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunMeta(), useEditTarget(), GridEdit (+31 more)

### Community 34 - "ConnectModal"
Cohesion: 0.14
Nodes (24): AppearancePane(), ConnectModal(), ConnQueriesPane(), ConnSecurityPane(), connUrl(), DataPane(), FontRow(), fromTri() (+16 more)

### Community 35 - "store.rs"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "Conn"
Cohesion: 0.13
Nodes (11): Conn, ConnFile, LegacyGuard, Confirm, Run, Verify, MongoTls, Insecure (+3 more)

### Community 37 - "connect"
Cohesion: 0.21
Nodes (12): DbState, err_text(), heartbeat(), KeyInfo, KeyRequest, lost(), open_info(), redis_key() (+4 more)

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

### Community 42 - "Pool"
Cohesion: 0.18
Nodes (13): capitalise(), connect(), host_of(), password_for(), pg_position(), Pool, Lite, My (+5 more)

### Community 43 - "diagramTab.ts"
Cohesion: 0.17
Nodes (15): diagramModel(), tableKey(), withMoves(), diagramCanSave(), diagramChanged(), diagramLayoutOf(), diagramModelOf(), diagramViews (+7 more)

### Community 44 - "SecurityLevel"
Cohesion: 0.50
Nodes (4): SecurityLevel, Low, None, Strict

### Community 47 - "TaskManager.tsx"
Cohesion: 0.10
Nodes (35): ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres() (+27 more)

### Community 48 - "GuardState"
Cohesion: 0.13
Nodes (18): run(), Approval, Confirm, Passphrase, TouchId, approve_default_lowering(), approve_lowering(), authenticate() (+10 more)

### Community 51 - "connect"
Cohesion: 0.36
Nodes (9): against_a_server(), client(), connect(), db_of(), group(), reads_the_database_number(), secs(), test() (+1 more)

### Community 52 - "SettingsState"
Cohesion: 0.17
Nodes (12): APP_DIR, base64(), config_dir(), config_path(), decode_base64(), expand_tilde(), write_atomic(), write_binary_file() (+4 more)

### Community 53 - "KeyPane.tsx"
Cohesion: 0.10
Nodes (36): ConnWork(), EmptyState(), Keys(), isJson(), JsonLine(), KeyPane(), KeyTtl(), looksBinary() (+28 more)

### Community 54 - "CollectionPane.tsx"
Cohesion: 0.17
Nodes (17): Box(), CollectionPane(), Picker(), EmptyRow(), Obj(), QueryChip(), ErrorState(), RunGroup() (+9 more)

### Community 66 - "classify"
Cohesion: 0.21
Nodes (13): big_limits_warn_above_100(), classify(), classify_tokens(), dialect(), fallback_tokenizer(), kinds(), reads_never_ask(), row_limit_target() (+5 more)

### Community 67 - "Beat"
Cohesion: 0.39
Nodes (4): Beat, beat_pool!, start_heartbeat(), run()

### Community 68 - "store.ts"
Cohesion: 0.11
Nodes (20): RunItem, AskSubject, flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten (+12 more)

### Community 72 - "ResultGrid.tsx"
Cohesion: 0.06
Nodes (36): AnyFormat, Cell(), CellEditor(), CellMenu(), ColKey, DocsActions(), GridRow, jsonHtml() (+28 more)

### Community 73 - "State"
Cohesion: 0.05
Nodes (4): State, Approval, Saved, Settings

### Community 76 - "TODO: Windows build (.msi / NSIS .exe)"
Cohesion: 0.13
Nodes (14): Already fine on Windows, CI (`.github/workflows/release.yml`), Code signing - owner decision, Home folder (`src-tauri/src/paths.rs`) - blocker, Keychain (`src-tauri/src/keychain.rs`), Path splitting in the frontend, Phase 1: the app must start, Phase 2: secrets and auth (+6 more)

### Community 78 - "Phase 1: usable build"
Cohesion: 0.14
Nodes (13): Already fine on Linux, CI and packaging (`.github/workflows/release.yml`), Copy, Keyboard shortcuts, Keychain (`src-tauri/src/keychain.rs`), Known WebKitGTK issues (not fixable in CSS), Passphrase reset (`src-tauri/src/guard.rs`), Phase 1: usable build (+5 more)

### Community 80 - "DocCards.tsx"
Cohesion: 0.07
Nodes (69): DocCards(), card(), example(), line(), removeUndo(), send(), DocEdit, EMPTY (+61 more)

### Community 102 - "db.rs"
Cohesion: 0.05
Nodes (17): Affected, BEAT_WAIT, EditRequest, HARD_CAP, Link, impl_affected!, impl_cells!, impl_raw! (+9 more)

### Community 108 - "ResultSet"
Cohesion: 0.29
Nodes (3): Cells, ColMeta, ResultSet

## Knowledge Gaps
- **44 isolated node(s):** `Cancelled`, `Done`, `Failed`, `Refused`, `Db` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 533 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useStore` connect `App.tsx` to `QueryPane.tsx`, `ConnectModal`, `Ask.tsx`, `DiagramPane.tsx`, `icoC`, `store.ts`, `Modals.tsx`, `ResultGrid.tsx`, `AboutModal.tsx`, `DocCards.tsx`, `TaskManager.tsx`, `KeyPane.tsx`, `CollectionPane.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `Cancelled`, `Done`, `Failed` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mongo.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.059822361546499475 - nodes in this community are weakly interconnected._
- **Why does `App()` connect `App.tsx` to `Ask.tsx`, `icoC`, `package.json`, `ypacapy`, `KeyPane.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `mongo_shell.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05909351692484223 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `QueryPane.tsx`, `ConnectModal`, `Ask.tsx`, `store.ts`, `ResultGrid.tsx`, `types.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `Ask.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06080246913580247 - nodes in this community are weakly interconnected._