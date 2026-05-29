# 08 — Tarjan SCC

> Graph Algorithms • Position 8/8

## Problem
Find all **strongly connected components** (SCCs) of a directed graph — maximal sets of nodes where every pair has a path each way. The undirected sibling: find **bridges** (edges whose removal disconnects the graph).

## Intuition
DFS assigns each node a **discovery time** `disc[u]`. We also track `low[u]` — the smallest `disc` reachable from u's DFS subtree via at most one back-edge. When `low[u] == disc[u]`, **u is the root of an SCC**: nothing in its subtree could reach an ancestor, so the subtree (held in a stack) is exactly that SCC. The invariant: **after DFS returns from u, `low[u]` is correct, and an unfinished node remains on the SCC stack iff it hasn't been emitted yet**.

## Algorithm
DFS from every unvisited node. On entry, set `disc[u] = low[u] = timer++` and push u on the stack. For each neighbor v: if unvisited, recurse and `low[u] = min(low[u], low[v])`; if v is on the stack, `low[u] = min(low[u], disc[v])`. After exploring, if `low[u] == disc[u]`, pop until u — that's an SCC.

```python
def tarjan_scc(n, graph):
    disc = [-1] * n
    low = [0] * n
    on_stack = [False] * n
    stack, sccs = [], []
    timer = [0]

    def dfs(u):
        disc[u] = low[u] = timer[0]; timer[0] += 1
        stack.append(u); on_stack[u] = True
        for v in graph[u]:
            if disc[v] == -1:
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:
                low[u] = min(low[u], disc[v])
        if low[u] == disc[u]:
            comp = []
            while True:
                w = stack.pop(); on_stack[w] = False
                comp.append(w)
                if w == u:
                    break
            sccs.append(comp)

    for u in range(n):
        if disc[u] == -1:
            dfs(u)
    return sccs
```

## Walkthrough
Example: 6 nodes `A–F`, directed edges `A→B, B→C, C→A, B→D, D→E, E→D, E→F`.

1. **Descend A→B→C.** DFS from A: assign `A: 0/0`, push. Tree-edge to B: `B: 1/1`, push. Tree-edge to C: `C: 2/2`, push.
2. **Back-edge closes {A,B,C}.** `C→A` and A is on-stack → `low[C] = min(2, index[A]=0) = 0`. Returning to B: `low[B] = min(1, low[C]=0) = 0`.
3. **Branch into D→E, then back-edge.** Tree-edge `B→D`: `D: 3/3`, push. Tree-edge `D→E`: `E: 4/4`, push. Back-edge `E→D` (D on stack) → `low[E] = min(4, 3) = 3`.
4. **Pop {F}, then pop {D,E}.** Tree-edge `E→F`: `F: 5/5`, push. F has no outgoing edges → `low[F] == index[F]` → pop SCC **{F}**. Return to E (`low[E]=3`), return to D: `low[D] = min(3, 3) = 3` and `low[D] == index[D]` → pop SCC **{E, D}**.
5. **Pop {A,B,C} and finish.** Return to B (`low[B]=0`), return to A: `low[A] = 0 == index[A]` → pop SCC **{C, B, A}**. Three SCCs total: `{A,B,C}`, `{D,E}`, `{F}`.

<div class="dsa-viz" data-algo="tarjan-scc"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(V + E)</strong></span>
  <span>space <strong>O(V)</strong></span>
</div>

## Pitfalls
- **`on_stack` is required** — without it, you'd treat cross-edges into already-finished SCCs as back-edges and merge wrongly.
- **`disc[v]` vs `low[v]`** on the back-edge branch — use `disc[v]` (Tarjan's specification); `low[v]` is wrong here even though it often happens to work.
- **Recursion depth** — Python hits its limit on graphs with V ≈ 10⁴. Convert to an iterative DFS for big inputs.
- **For bridges** (undirected), track `parent` and check `low[v] > disc[u]` on the edge u-v; don't go back to the parent edge.
- **Kosaraju** (two DFS passes on G and reverse-G) is an alternative SCC algorithm — often easier to remember in an interview but slightly slower in constant factor.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/critical-connections-in-a-network/">1192 Critical Connections in a Network (Hard)</a> — the canonical bridges problem.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-days-to-disconnect-island/">1568 Minimum Number of Days to Disconnect Island (Hard)</a> — articulation points on grid.</li>
    <li><a href="https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/">1489 Find Critical and Pseudo-Critical Edges in MST (Hard)</a> — adjacent topic; Kruskal-based.</li>
    <li><a href="https://leetcode.com/problems/find-eventual-safe-states/">802 Find Eventual Safe States (Med)</a> — SCC + condensation reasoning.</li>
    <li><a href="https://leetcode.com/problems/redundant-connection-ii/">685 Redundant Connection II (Hard)</a> — directed cycles; Tarjan helps.</li>
    <li><a href="https://leetcode.com/problems/detect-cycles-in-2d-grid/">1559 Detect Cycles in 2D Grid (Med)</a> — DFS with parent tracking.</li>
    <li><a href="https://leetcode.com/problems/course-schedule/">207 Course Schedule (Med)</a> — cycle = non-trivial SCC.</li>
    <li><a href="https://leetcode.com/problems/course-schedule-ii/">210 Course Schedule II (Med)</a> — SCC on a DAG must all be singletons.</li>
    <li><a href="https://leetcode.com/problems/most-stones-removed-with-same-row-or-column/">947 Most Stones Removed (Med)</a> — components via DSU; SCC overkill but instructive.</li>
    <li><a href="https://leetcode.com/problems/minimize-malware-spread-ii/">928 Minimize Malware Spread II (Hard)</a> — articulation-point flavored.</li>
  </ul>
</div>
