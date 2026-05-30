# 01 — BFS on Graph

> BFS • Position 1/5

## Problem
Given an undirected (or directed) graph and a start node `s`, compute the shortest distance from `s` to every reachable node — where every edge has weight 1.

## Intuition
BFS explores nodes in **non-decreasing order of distance** from the source. The first time you dequeue a node, you've arrived via a shortest path — and you never need to re-enqueue it. This is why a `visited` set (or a distance map initialized to `-1`/`∞`) is enough; you don't need a priority queue like Dijkstra. The queue itself encodes the frontier of "currently expanding" nodes.

## Algorithm
1. Initialize `dist[s] = 0` and a queue containing `s`. All other nodes have `dist = ∞`.
2. While the queue is non-empty:
   - Pop `u`.
   - For each neighbour `v` of `u`: if `dist[v] == ∞`, set `dist[v] = dist[u] + 1` and enqueue `v`.
3. Return `dist`.

```python
from collections import deque

def bfs(graph, start):
    dist = {start: 0}
    q = deque([start])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist
```

## Walkthrough
Graph: `0 — 1 — 2`, `0 — 3`, `3 — 4`. Start at `0`:

1. Init: `dist = {0: 0}`, `q = [0]`.
2. Pop `0`. Visit `1`, `3`. `dist = {0:0, 1:1, 3:1}`, `q = [1, 3]`.
3. Pop `1`. Visit `2` (skip `0`). `dist = {0:0, 1:1, 3:1, 2:2}`, `q = [3, 2]`.
4. Pop `3`. Visit `4` (skip `0`). `dist = {..., 4:2}`, `q = [2, 4]`.
5. Pop `2`, `4`. No new neighbours. Done.

<div class="dsa-viz" data-algo="bfs-graph"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(V + E)</strong></span>
  <span>space <strong>O(V)</strong></span>
</div>

## Pitfalls
- **Marking visited on pop, not push.** This lets a node enter the queue multiple times, blowing up time complexity. Always mark when you enqueue.
- **Using a list as the queue** in Python — `list.pop(0)` is O(n). Always `collections.deque`.
- For **weighted graphs with non-unit weights**, BFS gives wrong answers — switch to Dijkstra.
- Don't confuse "reachable" with "shortest path" — BFS gives both, but the predicate for early termination differs.
- For **bidirectional BFS**, you must check intersection *between* the frontiers at each level — checking only the visited sets misses the meet.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/find-if-path-exists-in-graph/">1971. Find if Path Exists in Graph (Easy)</a> — pure reachability.</li>
    <li><a href="https://leetcode.com/problems/rotting-oranges/">994. Rotting Oranges (Medium)</a> — multi-source BFS on grid.</li>
    <li><a href="https://leetcode.com/problems/walls-and-gates/">286. Walls and Gates (Medium)</a> — multi-source BFS from every gate.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-level-order-traversal/">102. Binary Tree Level Order Traversal (Medium)</a> — BFS on trees.</li>
    <li><a href="https://leetcode.com/problems/word-ladder/">127. Word Ladder (Hard)</a> — abstract BFS on string transformations.</li>
    <li><a href="https://leetcode.com/problems/number-of-islands/">200. Number of Islands (Medium)</a> — BFS or DFS to count components.</li>
    <li><a href="https://leetcode.com/problems/open-the-lock/">752. Open the Lock (Medium)</a> — BFS on 4-digit lock state space.</li>
    <li><a href="https://leetcode.com/problems/01-matrix/">542. 01 Matrix (Medium)</a> — multi-source BFS from every 0.</li>
    <li><a href="https://leetcode.com/problems/as-far-from-land-as-possible/">1162. As Far from Land as Possible (Medium)</a> — multi-source BFS, take max.</li>
    <li><a href="https://leetcode.com/problems/minimum-genetic-mutation/">433. Minimum Genetic Mutation (Medium)</a> — Word Ladder twin.</li>
  </ul>
</div>
