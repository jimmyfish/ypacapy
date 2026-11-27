# Graph Report - ypacapy  (2026-11-27)

## Corpus Check
- 86 files · ~406,179 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: .css 33, (none) 4, .lock 1)
- WARNING: 38 of 165 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1797 nodes · 4744 edges · 63 communities (58 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 142 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c5ab213a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mongo.rs
- mongo_shell.rs
- RawExec
- Ask.tsx
- diagram.ts
- icoC
- QueryPane.tsx
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
- conns.rs
- connect
- Engine
- default.json
- SslMode
- Applied
- EngineIcon.tsx
- TaskManager.tsx
- verify
- ypacapy
- run
- SettingsState
- Sidebar.tsx
- CollectionPane.tsx
- Exec
- Approval
- classify
- start_heartbeat
- ResultGrid.tsx
- State
- TODO: Windows build (.msi / NSIS .exe)
- Phase 1: usable build
- DocCards.tsx
- db.rs

## God Nodes (most connected - your core abstractions)
1. `State` - 60 edges
2. `useStore` - 54 edges
3. `icoC()` - 37 edges
4. `DiagramPane()` - 29 edges
5. `react` - 29 edges
6. `errText()` - 27 edges
7. `useCurrent()` - 27 edges
8. `DocCards()` - 27 edges
9. `run()` - 27 edges
10. `ResultGrid()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Styles: one CSS file per component` --references--> `App()`  [INFERRED]
  CLAUDE.md → src/App.tsx
- `save_settings()` --references--> `strict`  [INFERRED]
  src-tauri/src/settings.rs → tsconfig.json
- `DbState` --references--> `MOpen`  [INFERRED]
  src-tauri/src/db.rs → src-tauri/src/db/mongo.rs
- `run()` --references--> `RunRequest`  [INFERRED]
  src-tauri/src/db/mongo.rs → src-tauri/src/db.rs
- `run()` --references--> `RunRequest`  [INFERRED]
  src-tauri/src/db/redis.rs → src-tauri/src/db.rs

## Import Cycles
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`
- 1-file cycle: `src-tauri/src/paths.rs -> src-tauri/src/paths.rs`

## Communities (63 total, 5 thin omitted)

### Community 0 - "mongo.rs"
Cohesion: 0.06
Nodes (49): Args, canonical(), client_options(), code_name(), collect(), collections(), CollInfo, conn() (+41 more)

### Community 1 - "mongo_shell.rs"
Cohesion: 0.06
Nodes (42): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, command_kind() (+34 more)

### Community 3 - "Ask.tsx"
Cohesion: 0.06
Nodes (60): Actions(), Alt(), ConfirmAsk(), Effects(), FinalLine(), GuardAsk(), Ico(), ICONS (+52 more)

### Community 4 - "diagram.ts"
Cohesion: 0.11
Nodes (32): anchorY(), BODY_PAD, Box, boxSize(), Cardinality, cardinality(), DiagramColumn, DiagramDetail (+24 more)

### Community 5 - "icoC"
Cohesion: 0.08
Nodes (21): react, GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename(), haystack() (+13 more)

### Community 6 - "QueryPane.tsx"
Cohesion: 0.08
Nodes (41): CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunGroup(), RunMeta(), useEditTarget() (+33 more)

### Community 7 - "themes.ts"
Cohesion: 0.17
Nodes (21): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 8 - "Modals.tsx"
Cohesion: 0.06
Nodes (52): ALL_KINDS, AppearancePane(), CONN_TABS, ConnectModal(), ConnQueriesPane(), ConnSecurityPane(), ConnTab, connUrl() (+44 more)

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (44): dependencies, lucide-react@1.75.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-process@^2 (+36 more)

### Community 10 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 11 - "redis_cli.rs"
Cohesion: 0.08
Nodes (33): c(), query(), classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES, KEYS_W (+25 more)

### Community 12 - "build-window.mjs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 13 - "check"
Cohesion: 0.27
Nodes (8): Ask, check(), check_sql(), Classified, Warning, BigLimit, UpdateAll, warnings()

### Community 14 - "Pool"
Cohesion: 0.15
Nodes (27): apply(), catalog(), Collected, conn(), connect(), done(), Exec, Cancelled (+19 more)

### Community 15 - "AboutModal.tsx"
Cohesion: 0.18
Nodes (19): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+11 more)

### Community 16 - "ROpen"
Cohesion: 0.31
Nodes (3): open_one(), ROpen, server_of()

### Community 17 - "guard.rs"
Cohesion: 0.05
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "types.ts"
Cohesion: 0.10
Nodes (27): KeyFolder, Ask, CollInfo, ColumnBrief, DEFAULT_LEVEL, ErdColumn, ErdKey, HistoryEntry (+19 more)

### Community 19 - "DiagramPane.tsx"
Cohesion: 0.11
Nodes (19): blobBase64(), BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog(), DETAILS, DiagramPane() (+11 more)

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
Nodes (23): b(), cell(), col(), entries(), escaped(), items(), KeyPage, numbered() (+15 more)

### Community 25 - "conns.rs"
Cohesion: 0.32
Nodes (13): ConnLock, delete_connection(), duplicate_connection(), new_id(), now_ms(), save_connection(), set_group(), set_level() (+5 more)

### Community 26 - "UpdateChip.tsx"
Cohesion: 0.11
Nodes (17): @tauri-apps/plugin-opener@^2, @tauri-apps/plugin-opener, Notes(), Notes(), UpdateChip(), checkForUpdate(), hasPendingUpdate(), installUpdate() (+9 more)

### Community 27 - "erd.rs"
Cohesion: 0.18
Nodes (24): add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of(), kind_of() (+16 more)

### Community 28 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 29 - "keychain.rs"
Cohesion: 0.14
Nodes (13): check_passphrase(), clear_passphrase(), derive(), get(), get_string(), has_passphrase(), ITERATIONS, NOT_FOUND (+5 more)

### Community 30 - "App.tsx"
Cohesion: 0.17
Nodes (18): App(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), beatOn(), LABEL, LinkBar(), LinkNote() (+10 more)

### Community 31 - "DbState"
Cohesion: 0.18
Nodes (23): find(), apply_edits(), cancel_query(), capitalise(), check_schema(), close_connection(), col(), DbState (+15 more)

### Community 32 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 33 - "store.ts"
Cohesion: 0.09
Nodes (21): flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten, newQuery(), readWorkspace() (+13 more)

### Community 34 - "diagramTab.ts"
Cohesion: 0.16
Nodes (16): DiagramModel, diagramModel(), tableKey(), withMoves(), diagramCanSave(), diagramChanged(), diagramLayoutOf(), diagramModelOf() (+8 more)

### Community 35 - "store.rs"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "conns.rs"
Cohesion: 0.10
Nodes (31): clean_group(), Conn, conn(), ConnFile, copy_name(), copy_names_skip_taken_ones(), group_is_trimmed_and_blank_is_none(), keep_history_overrides_settings_only_when_set() (+23 more)

### Community 37 - "connect"
Cohesion: 0.18
Nodes (17): against_a_server(), client(), connect(), db_of(), DbState, err_text(), group(), KeyInfo (+9 more)

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

### Community 42 - "EngineIcon.tsx"
Cohesion: 0.44
Nodes (9): fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres(), Redis(), Sqlite() (+1 more)

### Community 47 - "TaskManager.tsx"
Cohesion: 0.11
Nodes (30): AppStrip(), ConnTile(), EngineIcon(), ColorPicker(), ENGINE_LABELS, EnginePicker(), ENGINES, Picker() (+22 more)

### Community 48 - "verify"
Cohesion: 0.20
Nodes (10): authenticate(), authenticate_owner(), check_kinds(), disable_passphrase(), evaluate(), GuardState, Inner, lock_protect() (+2 more)

### Community 51 - "run"
Cohesion: 0.29
Nodes (7): reader(), run(), Step, Cancelled, Done, Failed, summary()

### Community 52 - "SettingsState"
Cohesion: 0.14
Nodes (13): run(), APP_DIR, base64(), config_dir(), config_path(), decode_base64(), write_atomic(), write_binary_file() (+5 more)

### Community 53 - "Sidebar.tsx"
Cohesion: 0.12
Nodes (36): ConnWork(), EmptyState(), Keys(), isJson(), JsonLine(), KeyPane(), KeyTtl(), looksBinary() (+28 more)

### Community 54 - "CollectionPane.tsx"
Cohesion: 0.15
Nodes (17): Box(), CollectionPane(), Picker(), EmptyRow(), Obj(), QueryChip(), ErrorState(), ColKey (+9 more)

### Community 55 - "Exec"
Cohesion: 0.17
Nodes (8): Cells, ColMeta, ResultSet, RunOutcome, Ask, Cancelled, Done, Error

### Community 56 - "Approval"
Cohesion: 0.22
Nodes (10): Approval, Confirm, Passphrase, TouchId, approve_default_lowering(), approve_lowering(), set_passphrase(), verify() (+2 more)

### Community 66 - "classify"
Cohesion: 0.17
Nodes (15): big_limits_warn_above_100(), classify(), classify_tokens(), dialect(), fallback_tokenizer(), is_final(), kinds(), reads_never_ask() (+7 more)

### Community 67 - "start_heartbeat"
Cohesion: 0.39
Nodes (5): Beat, beat_pool!, heartbeat(), heartbeat(), start_heartbeat()

### Community 72 - "ResultGrid.tsx"
Cohesion: 0.06
Nodes (36): Box, AnyFormat, Cell(), CellEditor(), CellMenu(), DocsActions(), GridRow, jsonHtml() (+28 more)

### Community 73 - "State"
Cohesion: 0.05
Nodes (3): Edits, State, Approval

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
Nodes (22): Affected, BEAT_WAIT, ColumnBrief, EditRequest, HARD_CAP, Link, impl_affected!, impl_cells! (+14 more)

## Knowledge Gaps
- **44 isolated node(s):** `Cancelled`, `Done`, `Failed`, `Refused`, `Db` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 537 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `State` connect `State` to `store.ts`, `Ask.tsx`, `Modals.tsx`, `ResultGrid.tsx`, `AboutModal.tsx`, `DocCards.tsx`, `TaskManager.tsx`, `types.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `Cancelled`, `Done`, `Failed` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mongo.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05613951266125179 - nodes in this community are weakly interconnected._
- **Why does `react` connect `icoC` to `Ask.tsx`, `QueryPane.tsx`, `Modals.tsx`, `package.json`, `EngineIcon.tsx`, `ResultGrid.tsx`, `AboutModal.tsx`, `DocCards.tsx`, `TaskManager.tsx`, `DiagramPane.tsx`, `Sidebar.tsx`, `CollectionPane.tsx`, `UpdateChip.tsx`, `App.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `mongo_shell.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._
- **Why does `App()` connect `App.tsx` to `Ask.tsx`, `icoC`, `themes.ts`, `package.json`, `TaskManager.tsx`, `ypacapy`, `Sidebar.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Ask.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0595679012345679 - nodes in this community are weakly interconnected._