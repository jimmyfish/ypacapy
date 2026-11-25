# Graph Report - ypacapy  (2026-11-25)

## Corpus Check
- 84 files · ~368,165 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 36 file(s) not represented in the graph (top: .css 31, (none) 4, .lock 1)
- WARNING: 36 of 159 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 382 nodes · 382 edges · 92 communities (11 shown, 81 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cc5a63c5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ypacapy
- store.ts
- ResultGrid.tsx
- State
- KeyPane.tsx
- TODO: Windows build (.msi / NSIS .exe)
- SqlEditor.tsx
- Phase 1: usable build
- ResultGrid
- Cell
- readWorkspace
- flushWorkspace
- Changelog
- main.tsx

## God Nodes (most connected - your core abstractions)
1. `State` - 50 edges
2. `ypacapy` - 10 edges
3. `KeyPane()` - 9 edges
4. `ResultGrid()` - 9 edges
5. `<img src="docs/assets/icons/sparkles.svg" width="24" height="24" align="top" alt="" /> What it does` - 9 edges
6. `TODO: Windows build (.msi / NSIS .exe)` - 7 edges
7. `useStore` - 7 edges
8. `useCurrent()` - 5 edges
9. `DocsActions()` - 5 edges
10. `Changelog` - 5 edges

## Surprising Connections (you probably didn't know these)
- `KeyPane()` --calls--> `ResultGrid()`  [EXTRACTED]
  src/components/KeyPane.tsx → src/components/ResultGrid.tsx
- `KeyPane()` --calls--> `useCurrent()`  [EXTRACTED]
  src/components/KeyPane.tsx → src/store.ts
- `KeyTtl()` --calls--> `useCurrent()`  [EXTRACTED]
  src/components/KeyPane.tsx → src/store.ts
- `DocsActions()` --calls--> `useStore`  [EXTRACTED]
  src/components/ResultGrid.tsx → src/store.ts
- `ResultGrid()` --calls--> `useStore`  [EXTRACTED]
  src/components/ResultGrid.tsx → src/store.ts

## Import Cycles
- None detected.

## Communities (92 total, 81 thin omitted)

### Community 20 - "ypacapy"
Cohesion: 0.11
Nodes (18): <img src="docs/assets/icons/ban.svg" width="24" height="24" align="top" alt="" /> Never on the wishlist, <img src="docs/assets/icons/circle-help.svg" width="24" height="24" align="top" alt="" /> Why another database client?, <img src="docs/assets/icons/code-xml.svg" width="20" height="20" align="top" alt="" /> The SQL console, <img src="docs/assets/icons/code-xml.svg" width="24" height="24" align="top" alt="" /> Hack on it, <img src="docs/assets/icons/database.svg" width="20" height="20" align="top" alt="" /> Results, tables and editing, <img src="docs/assets/icons/database.svg" width="24" height="24" align="top" alt="" /> Where's my data?, <img src="docs/assets/icons/download.svg" width="24" height="24" align="top" alt="" /> Get it, <img src="docs/assets/icons/folder-tree.svg" width="20" height="20" align="top" alt="" /> Connections and the schema tree (+10 more)

### Community 68 - "store.ts"
Cohesion: 0.04
Nodes (17): AskAlt, AskEffect, AskIcon, AskSubject, AskTone, DEFAULT_ROW_LIMIT, KeptKey, KeptQuery (+9 more)

### Community 72 - "ResultGrid.tsx"
Cohesion: 0.05
Nodes (5): AnyFormat, ColKey, MenuItem, SaveError, TYPE_ICON

### Community 75 - "KeyPane.tsx"
Cohesion: 0.06
Nodes (11): isJson(), JsonLine(), KeyPane(), KeyTtl(), looksBinary(), minifyJson(), PARTS, prettyJson() (+3 more)

### Community 76 - "TODO: Windows build (.msi / NSIS .exe)"
Cohesion: 0.13
Nodes (14): Already fine on Windows, CI (`.github/workflows/release.yml`), Code signing - owner decision, Home folder (`src-tauri/src/paths.rs`) - blocker, Keychain (`src-tauri/src/keychain.rs`), Path splitting in the frontend, Phase 1: the app must start, Phase 2: secrets and auth (+6 more)

### Community 77 - "SqlEditor.tsx"
Cohesion: 0.07
Nodes (6): Completer, ItemIcon(), Marked(), Props, SqlEditor, TYPE_ICON

### Community 78 - "Phase 1: usable build"
Cohesion: 0.14
Nodes (13): Already fine on Linux, CI and packaging (`.github/workflows/release.yml`), Copy, Keyboard shortcuts, Keychain (`src-tauri/src/keychain.rs`), Known WebKitGTK issues (not fixable in CSS), Passphrase reset (`src-tauri/src/guard.rs`), Phase 1: usable build (+5 more)

### Community 79 - "ResultGrid"
Cohesion: 0.28
Nodes (7): CellEditor(), CellMenu(), DocsActions(), MenuButton(), ResultGrid(), tabSubject(), useStore

### Community 80 - "Cell"
Cohesion: 0.50
Nodes (4): Cell(), GridRow, jsonHtml(), ShellText()

### Community 81 - "readWorkspace"
Cohesion: 0.50
Nodes (4): keptDiagrams(), newQuery(), readWorkspace(), uid()

### Community 83 - "Changelog"
Cohesion: 0.13
Nodes (13): [0.0.1] - 2026-11-18, [0.1.0] - 2026-11-19, [0.1.1] - 2026-11-20, Added, Added, Added, Added, Changed (+5 more)

## Knowledge Gaps
- **81 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `State` connect `State` to `store.ts`, `ResultGrid`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Should `ypacapy` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `ypacapy` connect `ypacapy` to `Changelog`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Why does `ResultGrid()` connect `ResultGrid` to `ResultGrid.tsx`, `Cell`, `KeyPane.tsx`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `ResultGrid.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._