# AGENTS.md

## Project knowledge: read the graphify graph first

This repo has a graphify knowledge graph in `graphify-out/`. Read it before you explore the code.

1. At the start of every task, read `graphify-out/GRAPH_REPORT.md`. It lists the communities, the most connected nodes ("god nodes"), the links between modules, and the group relationships.
2. To answer a question about structure, ownership, call flow or data flow, query the graph before you grep or open files:
   - `graphify query "<question>"`: broad context (BFS)
   - `graphify query "<question>" --dfs`: follow one specific path
   - `graphify path "A" "B"`: shortest path between two nodes
   - `graphify explain "X"`: a node and its neighbors
3. Use the graph to find the right files, then read those files to confirm. Edges marked INFERRED or AMBIGUOUS are guesses that need checking. Treat only EXTRACTED edges as facts.
4. Keep the graph current whenever a file in the project changes:
   - Claude Code does this automatically. A `PostToolUse` hook in `.claude/settings.json` runs `graphify update .` after every Edit or Write.
   - A git `post-commit` hook runs the same update after every commit, which covers changes made outside Claude Code.
   - Any other agent, or any change made with shell commands, must run `graphify update .` itself after changing files.
   - `graphify update` only re-reads code and document structure. After a large change to README.md or other docs, run `/graphify . --update` so the LLM-extracted concepts are refreshed too.
   - After changing `package.json` or `tsconfig.json`, graphify rebuilds the whole code graph and can drop LLM-extracted concepts. Run `/graphify . --update` afterwards to restore them.
5. If `graphify-out/graph.json` is missing, run `/graphify .` to build it before relying on the graph.

