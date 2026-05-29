# 06 — Kruskal MST

> Graph Algorithms • Position 6/8

## Problem
Given a weighted undirected graph, find a **minimum spanning tree** — a subset of edges that connects every node with the lowest total weight.

## Intuition
Greedy: sort edges by weight and add each one **unless it would form a cycle**. Cycle detection is exactly what Union-Find gives you in near-constant time. The invariant: **the chosen edges always form a forest that is a subset of some MST**. The exchange argument (cut property) proves it — at every step the cheapest edge crossing some cut must be in *an* MST, and we pick exactly such edges.

## Algorithm
Sort the edges by weight ascending. Initialize DSU over V nodes. For each edge `(u, v, w)`, if `find(u) != find(v)`, union and add to the MST. Stop when you've added V−1 edges.

```python
def kruskal(n, edges):
    edges.sort(key=lambda e: e[2])
    dsu = DSU(n)
    mst, total = [], 0
    for u, v, w in edges:
        if dsu.union(u, v):
            mst.append((u, v, w))
            total += w
            if len(mst) == n - 1:
                break
    return total, mst
```

## Walkthrough
Example: 6 nodes `A–F`, 8 undirected edges `A-B(4), A-D(1), B-C(3), B-E(2), C-F(5), D-E(6), E-F(7), B-D(8)`.

1. **Sort by weight.** `A-D(1), B-E(2), B-C(3), A-B(4), C-F(5), D-E(6), E-F(7), B-D(8)`. Initialize DSU with every node its own root.
2. **Accept the cheap edges.** `A-D(1)` — different components, union → MST. `B-E(2)` — different, union. `B-C(3)` — different, union. `A-B(4)` — different (merges `{A,D}` with `{B,C,E}`), union. Running weight = 1+2+3+4 = 10.
3. **Pick the bridge to F.** `C-F(5)` — different components, union → MST. Now all 6 nodes share one root; the MST has V−1 = 5 edges, total weight = **15**.
4. **Reject the rest.** `D-E(6)`, `E-F(7)`, `B-D(8)` — for each, `find(u) == find(v)`, so adding would close a cycle. All rejected.
5. **End.** MST = `{A-D, B-E, B-C, A-B, C-F}`, total weight **15**.

<div class="dsa-viz" data-algo="kruskal"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(E log E)</strong></span>
  <span>space <strong>O(V + E)</strong></span>
</div>

The sort dominates; DSU adds α(V) per edge, negligible.

## Pitfalls
- **Disconnected graphs** — Kruskal returns a *minimum spanning forest*; check `len(mst) == V − 1` to confirm a spanning tree exists.
- **Duplicate-weight edges** — any valid choice is optimal; the algorithm is correct under any deterministic tie-break.
- **Direction is ignored** — MSTs are an undirected concept; if the input is directed, dedupe to undirected first.
- **Edge-list representation is required** — Kruskal needs the edges, not the adjacency list. Prim is better when you only have adjacency.
- **Critical / pseudo-critical** edges (LC 1489) — re-run Kruskal forcing each edge in or out to classify.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/connecting-cities-with-minimum-cost/">1135 Connecting Cities With Minimum Cost (Med)</a> — the canonical MST problem.</li>
    <li><a href="https://leetcode.com/problems/min-cost-to-connect-all-points/">1584 Min Cost to Connect All Points (Med)</a> — complete graph; Manhattan distances.</li>
    <li><a href="https://leetcode.com/problems/optimize-water-distribution-in-a-village/">1168 Optimize Water Distribution (Hard)</a> — virtual-node trick.</li>
    <li><a href="https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/">1489 Find Critical and Pseudo-Critical Edges in MST (Hard)</a> — run Kruskal with/without each edge.</li>
    <li><a href="https://leetcode.com/problems/path-with-minimum-effort/">1631 Path With Minimum Effort (Med)</a> — MST-flavored on grid.</li>
    <li><a href="https://leetcode.com/problems/path-with-maximum-minimum-value/">1102 Path With Maximum Minimum Value (Med)</a> — sort-descend variant.</li>
    <li><a href="https://leetcode.com/problems/checking-existence-of-edge-length-limited-paths/">1697 Checking Existence of Edge Length Limited Paths (Hard)</a> — offline queries + sorted edges.</li>
    <li><a href="https://leetcode.com/problems/checking-existence-of-edge-length-limited-paths-ii/">1724 Checking Existence of Edge Length Limited Paths II (Hard)</a> — online version; needs persistent DSU.</li>
    <li><a href="https://leetcode.com/problems/course-schedule-iv/">1462 Course Schedule IV (Med)</a> — reachability via repeated union.</li>
    <li><a href="https://leetcode.com/problems/swim-in-rising-water/">778 Swim in Rising Water (Hard)</a> — Kruskal-on-cells alternative to Dijkstra.</li>
  </ul>
</div>
