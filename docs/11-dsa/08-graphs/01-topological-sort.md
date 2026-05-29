# 01 — Topological Sort (Kahn)

> Graph Algorithms • Position 1/8

## Problem
Given a directed acyclic graph (DAG), output a linear ordering of nodes such that every edge `u → v` has `u` before `v`. If the graph has a cycle, report it.

## Intuition
A node is "ready" once all of its prerequisites have been emitted — i.e., when its **in-degree drops to zero**. Kahn's algorithm peels off zero-in-degree nodes one at a time, like leaves off a tree, decrementing in-degrees as it goes. The invariant: **at every step, the queue contains exactly the nodes whose prerequisites are all already emitted.** If the loop ends without visiting every node, the leftover nodes form a cycle.

## Algorithm
Build the in-degree map. Seed a queue with every zero-in-degree node. Pop, append to output, and decrement each neighbor's in-degree; when a neighbor hits zero, enqueue it. If the output length equals V, return it; otherwise the graph has a cycle.

```python
from collections import deque, defaultdict

def topo_sort(n, edges):
    g = defaultdict(list)
    indeg = [0] * n
    for u, v in edges:
        g[u].append(v)
        indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    out = []
    while q:
        u = q.popleft()
        out.append(u)
        for v in g[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return out if len(out) == n else []   # [] signals a cycle
```

## Walkthrough
Example: `n = 6`, edges `[(5,2), (5,0), (4,0), (4,1), (2,3), (3,1)]`.

1. In-degrees: 0→1, 1→2, 2→1, 3→1, 4→0, 5→0. Queue starts with [4, 5].
2. Pop 4 → out=[4]. Decrement 0 (→0) and 1 (→1). Queue=[5, 0].
3. Pop 5 → out=[4, 5]. Decrement 2 (→0) and 0 (already 0). Queue=[0, 2].
4. Pop 0 → out=[4, 5, 0]. No outgoing edges. Pop 2 → out=[4, 5, 0, 2]. Decrement 3 (→0). Queue=[3].
5. Pop 3 → decrement 1 (→0). Pop 1 → out=[4, 5, 0, 2, 3, 1]. Length = 6 → done.

<div class="dsa-viz" data-algo="topo-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(V + E)</strong></span>
  <span>space <strong>O(V + E)</strong></span>
</div>

## Pitfalls
- **Cycle detection comes for free** — if `len(out) < n`, you have a cycle. Don't add a separate DFS pass.
- **Multiple valid orderings exist** — use a min-heap instead of a queue if the problem demands the lexicographically smallest.
- **DFS-based topo** (post-order + reverse) is equally valid and sometimes cleaner; know both.
- **Self-loops** count as a cycle (in-degree 1 from the get-go and never reachable from zero).
- **Disconnected DAG** — works fine; every connected component contributes its zero-in-degree nodes.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/course-schedule/">207 Course Schedule (Med)</a> — pure cycle detection via topo.</li>
    <li><a href="https://leetcode.com/problems/course-schedule-ii/">210 Course Schedule II (Med)</a> — emit the order, not just feasibility.</li>
    <li><a href="https://leetcode.com/problems/alien-dictionary/">269 Alien Dictionary (Hard)</a> — derive edges from adjacent word pairs.</li>
    <li><a href="https://leetcode.com/problems/sequence-reconstruction/">444 Sequence Reconstruction (Med)</a> — unique topo order check.</li>
    <li><a href="https://leetcode.com/problems/find-eventual-safe-states/">802 Find Eventual Safe States (Med)</a> — reverse-graph topo.</li>
    <li><a href="https://leetcode.com/problems/parallel-courses/">1136 Parallel Courses (Med)</a> — topo with semester levels.</li>
    <li><a href="https://leetcode.com/problems/sort-items-by-groups-respecting-dependencies/">1203 Sort Items by Groups Respecting Dependencies (Hard)</a> — two-level topo.</li>
    <li><a href="https://leetcode.com/problems/maximum-employees-to-be-invited-to-a-meeting/">2127 Maximum Employees to Be Invited (Hard)</a> — topo to peel off chains, then handle cycles.</li>
    <li><a href="https://leetcode.com/problems/minimum-height-trees/">310 Minimum Height Trees (Med)</a> — peel leaves (degree-1) inward.</li>
    <li><a href="https://leetcode.com/problems/longest-increasing-path-in-a-matrix/">329 Longest Increasing Path in a Matrix (Hard)</a> — topo on implicit DAG.</li>
  </ul>
</div>
