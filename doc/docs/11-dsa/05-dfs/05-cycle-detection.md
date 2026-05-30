# 05 — Cycle detection (DFS three-color)

> DFS • Position 5/5

## Problem
Given a directed graph, return `True` if it contains a cycle. Equivalently, decide whether a topological order exists.

## Intuition
A boolean `visited` set isn't enough for directed graphs — revisiting a previously-finished node is *not* a cycle. You need to distinguish three states: **white** (never seen), **gray** (currently on the DFS stack), and **black** (finished, subtree fully explored). The **invariant** is that hitting a **gray** node means you've closed a loop on the current recursion path — that's a back-edge and proves a cycle.

## Algorithm
Walk every node. For each white node, run a DFS that flips it gray, recurses on neighbours, and flips it black on return. Any neighbour found gray is the cycle witness.

```python
WHITE, GRAY, BLACK = 0, 1, 2

def hasCycle(graph, n):
    color = [WHITE] * n

    def dfs(u):
        color[u] = GRAY
        for v in graph[u]:
            if color[v] == GRAY:   # back-edge → cycle
                return True
            if color[v] == WHITE and dfs(v):
                return True
        color[u] = BLACK
        return False

    return any(color[u] == WHITE and dfs(u) for u in range(n))
```

For undirected graphs, replace the gray-check with a parent-pointer test: a cycle exists iff DFS hits a visited node that isn't the immediate parent.

## Walkthrough
Graph: `A→B, A→C, B→D, C→D, D→E, D→F, E→B` (back-edge). All nodes start `white`.

1. **Enter `A`** — paint gray. Take edge `A→B`.
2. **Enter `B`** (white → gray). Take edge `B→D`. **Enter `D`** (gray). Take edge `D→E`.
3. **Enter `E`** (gray). Inspect edge `E→B`. `B` is **gray** → this is a **back edge** on the active DFS stack `A→B→D→E`.
4. **Cycle detected** at `E→B`. Stop and return `True`. The cycle is `B → D → E → B`.

<div class="dsa-viz" data-algo="cycle-detection-graph"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(V + E)</strong></span>
  <span>space <strong>O(V)</strong> colors + recursion</span>
</div>

## Pitfalls
- Using a single `visited` boolean on a **directed** graph — false positives on diamonds (two paths meeting at a sink).
- Forgetting to flip gray → black on return — every node will look like a cycle.
- On undirected graphs, calling the trivial back-edge to parent a cycle — pass parent or track edge IDs.
- Iterating only from one source — must restart DFS from every unseen node to cover disconnected components.
- Mutating the graph during traversal (e.g., adding edges from a callback) — corrupts the invariant.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/course-schedule/">207. Course Schedule (Medium)</a> — cycle = can't finish.</li>
    <li><a href="https://leetcode.com/problems/course-schedule-ii/">210. Course Schedule II (Medium)</a> — topo order via post-order DFS.</li>
    <li><a href="https://leetcode.com/problems/find-eventual-safe-states/">802. Find Eventual Safe States (Medium)</a> — nodes not on any cycle.</li>
    <li><a href="https://leetcode.com/problems/graph-valid-tree/">261. Graph Valid Tree (Medium)</a> — connected + no cycle.</li>
    <li><a href="https://leetcode.com/problems/redundant-connection/">684. Redundant Connection (Medium)</a> — find the edge that closes the cycle.</li>
    <li><a href="https://leetcode.com/problems/redundant-connection-ii/">685. Redundant Connection II (Hard)</a> — directed variant, in-degree + cycle.</li>
    <li><a href="https://leetcode.com/problems/all-paths-from-source-lead-to-destination/">1059. All Paths from Source Lead to Destination (Medium)</a> — color-based DFS with leaf check.</li>
    <li><a href="https://leetcode.com/problems/critical-connections-in-a-network/">1192. Critical Connections in a Network (Hard)</a> — Tarjan's bridges via DFS low-link.</li>
    <li><a href="https://leetcode.com/problems/possible-bipartition/">886. Possible Bipartition (Medium)</a> — 2-coloring via DFS.</li>
    <li><a href="https://leetcode.com/problems/is-graph-bipartite/">785. Is Graph Bipartite? (Medium)</a> — alternating colors, conflict = odd cycle.</li>
  </ul>
</div>
