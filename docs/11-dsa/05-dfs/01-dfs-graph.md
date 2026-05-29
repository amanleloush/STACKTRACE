# 01 — DFS on graph

> DFS • Position 1/5

## Problem
Visit every node reachable from a starting vertex, exploring as deep as possible before backtracking.

## Intuition
DFS commits to one neighbour and follows it all the way down before trying the next. The **invariant** is that every node on the current recursion stack is on the path from the source to the deepest frontier — when the call returns, that node is fully explored. A `visited` set prevents re-entry, which turns the search graph into a DFS tree.

## Algorithm
Mark the start visited, recurse into each unvisited neighbour. The recursion stack itself records the current path; you can hook work into the *pre* position (before recursing) or the *post* position (after all children return) depending on what you want to compute.

```python
def dfs(node, graph, visited):
    visited.add(node)
    # pre-order work goes here
    for nei in graph[node]:
        if nei not in visited:
            dfs(nei, graph, visited)
    # post-order work goes here
```

## Walkthrough
1. Graph: `0 — 1 — 3` and `0 — 2`. Start at `0`.
2. Mark `0` visited. Pick neighbour `1`, recurse.
3. Mark `1` visited. Recurse into `3`. `3` has no new neighbours — return.
4. Back at `1` — no more neighbours, return to `0`.
5. From `0`, recurse into `2`. Mark `2`, return. Done.

<div class="dsa-viz" data-algo="dfs-graph"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(V + E)</strong></span>
  <span>space <strong>O(V)</strong> recursion + visited</span>
</div>

## Pitfalls
- Forgetting to mark the node visited **before** recursing — leads to infinite loops on cycles.
- Stack overflow on long chains (10⁵+ depth) — convert to iterative with an explicit stack.
- On undirected graphs, treating a back-edge to the parent as a cycle — pass parent or use edge IDs.
- Mutating shared state in pre-order without undoing it in post-order when you need backtracking.
- Building `graph` as a list of edges and re-scanning it each call instead of an adjacency map.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/number-of-islands/">200. Number of Islands (Medium)</a> — 2D DFS, the canonical flood fill.</li>
    <li><a href="https://leetcode.com/problems/number-of-provinces/">547. Number of Provinces (Medium)</a> — count connected components via DFS.</li>
    <li><a href="https://leetcode.com/problems/max-area-of-island/">695. Max Area of Island (Medium)</a> — return a value from each DFS call.</li>
    <li><a href="https://leetcode.com/problems/course-schedule/">207. Course Schedule (Medium)</a> — cycle detection in a directed graph.</li>
    <li><a href="https://leetcode.com/problems/course-schedule-ii/">210. Course Schedule II (Medium)</a> — topological order via post-order DFS.</li>
    <li><a href="https://leetcode.com/problems/surrounded-regions/">130. Surrounded Regions (Medium)</a> — DFS from borders inward.</li>
    <li><a href="https://leetcode.com/problems/pacific-atlantic-water-flow/">417. Pacific Atlantic Water Flow (Medium)</a> — two DFS passes from each ocean.</li>
    <li><a href="https://leetcode.com/problems/time-needed-to-inform-all-employees/">1376. Time Needed to Inform All Employees (Medium)</a> — DFS on a tree, take max.</li>
    <li><a href="https://leetcode.com/problems/keys-and-rooms/">841. Keys and Rooms (Medium)</a> — reachability from room 0.</li>
    <li><a href="https://leetcode.com/problems/find-if-path-exists-in-graph/">1971. Find if Path Exists in Graph (Easy)</a> — warm-up DFS reachability.</li>
  </ul>
</div>
