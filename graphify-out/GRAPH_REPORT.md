# Graph Report - ypacapy  (2026-11-24)

## Corpus Check
- 81 files · ~362,289 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 36 file(s) not represented in the graph (top: .css 31, (none) 4, .lock 1)
- WARNING: 36 of 156 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 132 nodes · 67 edges · 81 communities (4 shown, 77 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3850310c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ypacapy
- Keychain
- paths.rs
- <img src="docs/assets/icons/sparkles.svg" width="24" height="24" align="top" alt="" /> What it does

## God Nodes (most connected - your core abstractions)
1. `ypacapy` - 10 edges
2. `<img src="docs/assets/icons/sparkles.svg" width="24" height="24" align="top" alt="" /> What it does` - 9 edges
3. `opts()` - 5 edges
4. `get()` - 4 edges
5. `check_passphrase()` - 4 edges
6. `delete()` - 3 edges
7. `get_string()` - 3 edges
8. `derive()` - 3 edges
9. `set_passphrase()` - 3 edges
10. `decode_base64()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- 1-file cycle: `src/keychain.rs -> src/keychain.rs`
- 1-file cycle: `src/paths.rs -> src/paths.rs`

## Communities (81 total, 77 thin omitted)

### Community 20 - "ypacapy"
Cohesion: 0.20
Nodes (9): <img src="docs/assets/icons/ban.svg" width="24" height="24" align="top" alt="" /> Never on the wishlist, <img src="docs/assets/icons/circle-help.svg" width="24" height="24" align="top" alt="" /> Why another database client?, <img src="docs/assets/icons/code-xml.svg" width="24" height="24" align="top" alt="" /> Hack on it, <img src="docs/assets/icons/database.svg" width="24" height="24" align="top" alt="" /> Where's my data?, <img src="docs/assets/icons/download.svg" width="24" height="24" align="top" alt="" /> Get it, <img src="docs/assets/icons/keyboard.svg" width="24" height="24" align="top" alt="" /> Shortcuts, <img src="docs/assets/icons/shield-check.svg" width="24" height="24" align="top" alt="" /> The write guard, <img src="docs/assets/icons/users.svg" width="24" height="24" align="top" alt="" /> Come soak with us (+1 more)

### Community 29 - "Keychain"
Cohesion: 0.13
Nodes (16): check_passphrase(), clear_passphrase(), delete(), derive(), get(), get_string(), has_passphrase(), hex() (+8 more)

### Community 68 - "paths.rs"
Cohesion: 0.21
Nodes (6): APP_DIR, base64(), config_dir(), config_path(), decode_base64(), write_binary_file()

### Community 72 - "<img src="docs/assets/icons/sparkles.svg" width="24" height="24" align="top" alt="" /> What it does"
Cohesion: 0.22
Nodes (9): <img src="docs/assets/icons/code-xml.svg" width="20" height="20" align="top" alt="" /> The SQL console, <img src="docs/assets/icons/database.svg" width="20" height="20" align="top" alt="" /> Results, tables and editing, <img src="docs/assets/icons/folder-tree.svg" width="20" height="20" align="top" alt="" /> Connections and the schema tree, <img src="docs/assets/icons/history.svg" width="20" height="20" align="top" alt="" /> History and saved queries, <img src="docs/assets/icons/key-round.svg" width="20" height="20" align="top" alt="" /> Redis, <img src="docs/assets/icons/leaf.svg" width="20" height="20" align="top" alt="" /> MongoDB, <img src="docs/assets/icons/network.svg" width="20" height="20" align="top" alt="" /> ER diagrams, <img src="docs/assets/icons/palette.svg" width="20" height="20" align="top" alt="" /> Make it yours (+1 more)

## Knowledge Gaps
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ypacapy` connect `ypacapy` to `<img src="docs/assets/icons/sparkles.svg" width="24" height="24" align="top" alt="" /> What it does`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `Keychain` be split into smaller, more focused modules?**
  _Cohesion score 0.12681159420289856 - nodes in this community are weakly interconnected._
- **Why does `<img src="docs/assets/icons/sparkles.svg" width="24" height="24" align="top" alt="" /> What it does` connect `<img src="docs/assets/icons/sparkles.svg" width="24" height="24" align="top" alt="" /> What it does` to `ypacapy`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._