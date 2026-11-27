# Graph Report - ypacapy  (2026-11-27)

## Corpus Check
- 95 files · ~443,233 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 39 file(s) not represented in the graph (top: .css 34, (none) 4, .lock 1)
- WARNING: 39 of 176 files seen (22%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1950 nodes · 5074 edges · 88 communities (67 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 172 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8efedc89`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- run
- mongo_shell.rs
- RawExec
- Ask.tsx
- edit.ts
- TabsBar.tsx
- TaskManager.tsx
- themes.ts
- Modals.tsx
- package.json
- with
- redis_cli.rs
- build-window.mjs
- check_kinds
- Pool
- AboutModal.tsx
- redis.rs
- guard.rs
- types.ts
- console.rs
- ypacapy
- cache.yml
- SqlEditor.tsx
- tauri.conf.json
- QueryPane.tsx
- mongo.js
- UpdateChip.tsx
- erd.rs
- compilerOptions
- keychain.rs
- Sidebar.tsx
- DbState
- fonts.rs
- store.ts
- ConsoleHistory.tsx
- store.rs
- conns.rs
- Engine
- default.json
- conns.rs
- execute
- DiagramPane.tsx
- paths.rs
- mongo.rs
- exec
- verify
- ypacapy
- ConnectModal
- save_settings
- Sidebar.tsx
- CollectionPane.tsx
- diagramTab.ts
- AGENTS.md
- ResultGrid.tsx
- What to test where
- run_error
- Got
- redis.sh
- warnings
- .get
- kinds
- classify
- rediscli.ts
- diagram.ts
- State
- TODO: Windows build (.msi / NSIS .exe)
- Phase 1: usable build
- DocCards.tsx
- db.rs

## God Nodes (most connected - your core abstractions)
1. `State` - 60 edges
2. `useStore` - 55 edges
3. `icoC()` - 38 edges
4. `react` - 30 edges
5. `errText()` - 29 edges
6. `useCurrent()` - 29 edges
7. `DiagramPane()` - 29 edges
8. `EmptyState()` - 28 edges
9. `DbState` - 27 edges
10. `run()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Styles: one CSS file per component` --references--> `App()`  [INFERRED]
  CLAUDE.md → src/App.tsx
- `save_settings()` --references--> `strict`  [INFERRED]
  src-tauri/src/settings.rs → tsconfig.json
- `diagram()` --references--> `Pool`  [INFERRED]
  src-tauri/src/db/erd.rs → src-tauri/src/db.rs
- `links()` --references--> `Pool`  [INFERRED]
  src-tauri/src/db/erd.rs → src-tauri/src/db.rs
- `mysql()` --references--> `Pool`  [INFERRED]
  src-tauri/src/db/erd.rs → src-tauri/src/db.rs

## Import Cycles
- 1-file cycle: `src-tauri/src/db/redis.rs -> src-tauri/src/db/redis.rs`
- 1-file cycle: `src-tauri/src/keychain.rs -> src-tauri/src/keychain.rs`
- 1-file cycle: `src-tauri/src/paths.rs -> src-tauri/src/paths.rs`

## Communities (88 total, 21 thin omitted)

### Community 0 - "run"
Cohesion: 0.15
Nodes (25): count(), start(), capitalise(), code_name(), coll_text(), collections(), CollInfo, conn() (+17 more)

### Community 1 - "mongo_shell.rs"
Cohesion: 0.06
Nodes (42): ABOUT, build(), CHECK_UPDATES, CLOSE_TAB, CLOSE_WINDOW, on_event(), SETTINGS, command_kind() (+34 more)

### Community 3 - "Ask.tsx"
Cohesion: 0.06
Nodes (60): Actions(), Alt(), ConfirmAsk(), Effects(), FinalLine(), GuardAsk(), Ico(), ICONS (+52 more)

### Community 4 - "edit.ts"
Cohesion: 0.16
Nodes (19): useEditTarget(), AFTER_FROM, column(), editCount(), editStatements(), ident(), isName(), kw() (+11 more)

### Community 5 - "TabsBar.tsx"
Cohesion: 0.07
Nodes (29): lucide-react, react, GroupSelect(), address(), dropAttr(), DropKey, ENGINE_WORDS, GroupRename() (+21 more)

### Community 6 - "TaskManager.tsx"
Cohesion: 0.10
Nodes (35): ConnTile(), EngineIcon(), fill(), GLYPHS, ld(), Mongo(), Mysql(), Postgres() (+27 more)

### Community 7 - "themes.ts"
Cohesion: 0.17
Nodes (21): useTheme(), alpha(), BUILTIN, BuiltinId, contrast(), DEFAULT_SCHEME, FAMILIES, findScheme() (+13 more)

### Community 8 - "Modals.tsx"
Cohesion: 0.07
Nodes (27): ALL_KINDS, CONN_TABS, ConnTab, MONGO_ALL, MONGO_TLS, MONO_FONTS, MY_SSL, PORTS (+19 more)

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (45): dependencies, lucide-react@1.75.0, react@^18.3.1, react-dom@^18.3.1, sql-formatter@15.9.0, @tauri-apps/api@^2.0.0, @tauri-apps/plugin-dialog@^2.0.0, @tauri-apps/plugin-opener@^2 (+37 more)

### Community 10 - "with"
Cohesion: 0.05
Nodes (40): outputs, runs-on, steps, GITHUB_TOKEN, TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD, jobs, create-release (+32 more)

### Community 11 - "redis_cli.rs"
Cohesion: 0.09
Nodes (32): classifies_for_the_guard(), Cmd, EXPIRE, FLUSH, HASHES, is_final(), KEYS_W, Kind (+24 more)

### Community 12 - "build-window.mjs"
Cohesion: 0.20
Nodes (25): DARK, esc(), grid(), here, homeView(), icon(), iconCache, LIGHT (+17 more)

### Community 13 - "check_kinds"
Cohesion: 0.23
Nodes (11): Approval, Confirm, Passphrase, TouchId, approve_lowering(), Ask, authenticate(), check() (+3 more)

### Community 14 - "Pool"
Cohesion: 0.21
Nodes (18): conn(), connect(), execute(), fetch_raw(), first(), Open, open(), Pool (+10 more)

### Community 15 - "AboutModal.tsx"
Cohesion: 0.19
Nodes (20): DEV_BUILD, DevBuild, AboutModal(), BuildCard(), CheckSql(), InstallSql(), K(), Line() (+12 more)

### Community 16 - "redis.rs"
Cohesion: 0.06
Nodes (64): canonical(), against_a_server(), arg_text(), b(), c(), cell(), client(), connect() (+56 more)

### Community 17 - "guard.rs"
Cohesion: 0.06
Nodes (19): ALTER, available(), BIG_LIMIT, classify_stmt(), CREATE, DELETE, DROP, GRANT (+11 more)

### Community 18 - "types.ts"
Cohesion: 0.09
Nodes (28): KeyFolder, Ask, CollInfo, ColumnBrief, DEFAULT_LEVEL, DiagramTab, ErdColumn, ErdKey (+20 more)

### Community 19 - "console.rs"
Cohesion: 0.08
Nodes (23): again(), APP, binds_trail_as_a_comment(), Ctx, Entry, Flag, Cancel, Err (+15 more)

### Community 20 - "ypacapy"
Cohesion: 0.05
Nodes (37): [0.0.1] - 2026-11-18, [0.1.0] - 2026-11-19, [0.1.1] - 2026-11-20, [0.1.2] - 2026-11-25, [0.1.3] - 2026-11-26, Added, Added, Added (+29 more)

### Community 21 - "cache.yml"
Cohesion: 0.08
Nodes (24): jobs, macos, runs-on, steps, strategy, target, name, on (+16 more)

### Community 22 - "SqlEditor.tsx"
Cohesion: 0.11
Nodes (26): Base, CLAUSE, completeContext(), Ctx, findSchema(), findTable(), isName(), Item (+18 more)

### Community 23 - "tauri.conf.json"
Cohesion: 0.08
Nodes (24): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+16 more)

### Community 24 - "QueryPane.tsx"
Cohesion: 0.08
Nodes (32): highlightJson(), highlightPlain(), CtxSelect(), Elapsed(), QueryContext(), QueryPane(), QueryResults(), RunMeta() (+24 more)

### Community 25 - "mongo.js"
Cohesion: 0.10
Nodes (20): archive, at(), capybaras, capyIds, customerIds, events, feedFoods, feedings (+12 more)

### Community 26 - "UpdateChip.tsx"
Cohesion: 0.13
Nodes (14): Notes(), Notes(), UpdateChip(), checkForUpdate(), hasPendingUpdate(), installUpdate(), message(), NOTE_PREFIX (+6 more)

### Community 27 - "erd.rs"
Cohesion: 0.18
Nodes (26): catalog(), add_uniques(), among(), diagram(), ErdColumn, ErdKey, ErdTable, keys_of() (+18 more)

### Community 28 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 29 - "keychain.rs"
Cohesion: 0.13
Nodes (15): check_passphrase(), clear_passphrase(), derive(), get(), get_string(), has_passphrase(), hex(), ITERATIONS (+7 more)

### Community 30 - "Sidebar.tsx"
Cohesion: 0.18
Nodes (16): App(), AppStrip(), SIDEBAR_DEFAULT, stack(), useTypeTokens(), beatOn(), LABEL, LinkBar() (+8 more)

### Community 31 - "DbState"
Cohesion: 0.15
Nodes (19): apply_edits(), apply_edits_in(), close_connection(), DbState, EditRequest, guard_ask(), on_pool!, open_connection() (+11 more)

### Community 32 - "fonts.rs"
Cohesion: 0.33
Nodes (5): FontList, list_fonts(), mono_names(), named_mono(), scan()

### Community 33 - "store.ts"
Cohesion: 0.11
Nodes (20): RunItem, AskSubject, flushWorkspace(), keptDiagrams(), KeptKey, KeptQuery, KeptTable, lastWritten (+12 more)

### Community 34 - "ConsoleHistory.tsx"
Cohesion: 0.13
Nodes (11): clock(), ConsoleHistory(), keep(), kept(), NONE, p2(), Stmt(), ConsoleEntry (+3 more)

### Community 35 - "store.rs"
Cohesion: 0.23
Nodes (12): clear_history(), delete_saved(), HISTORY_MAX, HistoryEntry, list_history(), list_saved(), load_workspace(), LocalStore (+4 more)

### Community 36 - "conns.rs"
Cohesion: 0.31
Nodes (14): ConnLock, delete_connection(), duplicate_connection(), find(), new_id(), now_ms(), save_connection(), set_group() (+6 more)

### Community 38 - "Engine"
Cohesion: 0.29
Nodes (6): Engine, Mongo, Mysql, Postgres, Redis, Sqlite

### Community 39 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 40 - "conns.rs"
Cohesion: 0.08
Nodes (37): clean_group(), Conn, conn(), ConnFile, copy_name(), copy_names_skip_taken_ones(), group_is_trimmed_and_blank_is_none(), keep_history_overrides_settings_only_when_set() (+29 more)

### Community 41 - "execute"
Cohesion: 0.12
Nodes (18): Applied, Done, Failed, Miss, TimedOut, apply(), Collected, console_history_entries_per_statement() (+10 more)

### Community 42 - "DiagramPane.tsx"
Cohesion: 0.12
Nodes (23): blobBase64(), Box, BoxItem, BoxMenu(), clampZoom(), CODE, CodeDialog(), DETAILS (+15 more)

### Community 43 - "paths.rs"
Cohesion: 0.24
Nodes (5): APP_DIR, base64(), config_path(), decode_base64(), write_binary_file()

### Community 44 - "mongo.rs"
Cohesion: 0.09
Nodes (11): client_options(), connect(), err_text(), ESTIMATE_MAX, logged(), num(), plural_docs(), secs() (+3 more)

### Community 47 - "exec"
Cohesion: 0.19
Nodes (12): Args, collect(), exec(), exec_db(), explain(), is_true(), modifications(), MOpen (+4 more)

### Community 48 - "verify"
Cohesion: 0.16
Nodes (11): approve_default_lowering(), authenticate_owner(), disable_passphrase(), evaluate(), GuardState, Inner, lock_protect(), reset_passphrase() (+3 more)

### Community 51 - "ConnectModal"
Cohesion: 0.15
Nodes (24): AppearancePane(), ConnectModal(), ConnQueriesPane(), ConnSecurityPane(), connUrl(), DataPane(), FontRow(), fromTri() (+16 more)

### Community 52 - "save_settings"
Cohesion: 0.22
Nodes (7): config_dir(), write_atomic(), load_settings(), read_file(), save_settings(), SettingsState, strip_nulls()

### Community 53 - "Sidebar.tsx"
Cohesion: 0.12
Nodes (34): ConnWork(), EmptyState(), Keys(), QueryChip(), isJson(), JsonLine(), KeyPane(), KeyTtl() (+26 more)

### Community 54 - "CollectionPane.tsx"
Cohesion: 0.14
Nodes (19): Box(), CollectionPane(), EmptyRow(), ErrorState(), RefreshBtn(), RunGroup(), CellEditor(), DocsActions() (+11 more)

### Community 55 - "diagramTab.ts"
Cohesion: 0.15
Nodes (17): DiagramLayout, DiagramModel, diagramModel(), tableKey(), withMoves(), diagramCanSave(), diagramChanged(), diagramLayoutOf() (+9 more)

### Community 56 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): AGENTS.md, Project knowledge: read the graphify graph first, Styles: one CSS file per component

### Community 57 - "ResultGrid.tsx"
Cohesion: 0.08
Nodes (27): AnyFormat, Cell(), ColKey, GridEdit, GridRow, jsonHtml(), MenuItem, SaveError (+19 more)

### Community 58 - "What to test where"
Cohesion: 0.17
Nodes (11): Dummy data for live testing, ER diagrams, Load it, MongoDB (`capy`), Redis, Result grid and editing, Schema tree and connections, SQL console (+3 more)

### Community 59 - "run_error"
Cohesion: 0.29
Nodes (3): Cells, ColMeta, ResultSet

### Community 60 - "Got"
Cohesion: 0.33
Nodes (6): Got, Cancelled, Done, Failed, NoConn, Refused

### Community 61 - "redis.sh"
Cohesion: 0.83
Nodes (3): db(), rc(), redis.sh script

### Community 62 - "warnings"
Cohesion: 0.38
Nodes (7): big_limits_warn_above_100(), update_without_where_warns(), warned(), Warning, BigLimit, UpdateAll, warnings()

### Community 64 - ".get"
Cohesion: 0.14
Nodes (21): cancel_query(), check_schema(), col(), ColumnBrief, err_text(), host_of(), load_schema(), log_beat() (+13 more)

### Community 65 - "kinds"
Cohesion: 0.50
Nodes (4): kinds(), reads_never_ask(), strings_and_comments_do_not_count(), writes_and_ddl()

### Community 66 - "classify"
Cohesion: 0.28
Nodes (12): classify(), classify_tokens(), console_history_splits_and_names(), dialect(), fallback_tokenizer(), is_final(), is_query(), row_limit_target() (+4 more)

### Community 67 - "rediscli.ts"
Cohesion: 0.83
Nodes (3): esc(), highlightRedis(), line()

### Community 72 - "diagram.ts"
Cohesion: 0.10
Nodes (33): anchorY(), BODY_PAD, Box, boxSize(), Cardinality, cardinality(), DiagramColumn, DiagramDetail (+25 more)

### Community 73 - "State"
Cohesion: 0.04
Nodes (7): Edits, State, Approval, Saved, SecurityLevel, Settings, TableOrder

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
Nodes (18): Affected, Beat, BEAT_WAIT, HARD_CAP, Link, beat_pool!, impl_affected!, impl_cells! (+10 more)

## Knowledge Gaps
- **49 isolated node(s):** `Done`, `Ask`, `Error`, `Cancelled`, `Done` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 601 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `State` connect `State` to `store.ts`, `Ask.tsx`, `types.ts`, `ConnectModal`, `CollectionPane.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `Done`, `Ask`, `Error` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `run` be split into smaller, more focused modules?**
  _Cohesion score 0.14789915966386555 - nodes in this community are weakly interconnected._
- **Why does `react` connect `TabsBar.tsx` to `ConsoleHistory.tsx`, `Ask.tsx`, `TaskManager.tsx`, `Modals.tsx`, `package.json`, `DiagramPane.tsx`, `AboutModal.tsx`, `DocCards.tsx`, `Sidebar.tsx`, `CollectionPane.tsx`, `QueryPane.tsx`, `ResultGrid.tsx`, `UpdateChip.tsx`, `Sidebar.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `mongo_shell.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._
- **Why does `SettingsState` connect `save_settings` to `run`, `db.rs`, `conns.rs`, `check_kinds`, `redis.rs`, `warnings`, `DbState`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Should `Ask.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.062317429406037 - nodes in this community are weakly interconnected._