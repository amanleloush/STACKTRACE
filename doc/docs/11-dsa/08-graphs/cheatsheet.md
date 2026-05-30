---
title: Graphs — cheatsheet
---

# Graphs · Cheatsheet

> One-page recall. Print, paste in Notion, glance before the interview.

## Trigger
**You see in the problem:** "shortest path with weights", "topological order / course schedule", "MST / connect with minimum cost", "all-pairs shortest path", "strongly connected components", "merge groups / detect connectivity online".

**Reach for this pattern when:**
- The structure is a **graph** — explicit, or implicit (states + transitions).
- You need weighted shortest path → **Dijkstra** (non-negative) or **Bellman-Ford** (negative edges).
- Dependency / ordering / DAG → **topological sort**.
- Dynamic connectivity, merge operations → **union-find**.
- Build a minimum-cost spanning structure → **Kruskal** or **Prim**.

**Don't reach for it when:**
- The graph is unweighted shortest-path → plain BFS suffices.
- The graph is a tree — tree-specific algorithms (LCA, tree DP) are usually simpler.

## The mental model
Pick the right algorithm by **what you're optimizing for**:
- Visit all → BFS/DFS (see those cheatsheets).
- Shortest path (weighted ≥ 0) → Dijkstra (heap-based BFS).
- Shortest path (negative ok) → Bellman-Ford; detect neg cycles.
- All-pairs → Floyd-Warshall (n ≤ 400-ish).
- Order with deps → topo sort (Kahn or DFS post-order reversed).
- Connectivity / cycles online → union-find with path compression.
- Min spanning tree → Kruskal (edges + DSU) or Prim (heap).
- SCC → Tarjan or Kosaraju.

## Skeleton

```python
import heapq
from collections import defaultdict, deque

# Dijkstra — non-negative weights
def dijkstra(graph, src):
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue          # stale entry
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist

# Topological sort (Kahn)
def topo(graph, n):
    indeg = [0] * n
    for u in graph:
        for v in graph[u]: indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == n else []     # [] = has cycle

# Union-Find (DSU)
class DSU:
    def __init__(self, n):
        self.p = list(range(n)); self.r = [0] * n
    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]   # path compression
            x = self.p[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return False
        if self.r[ra] < self.r[rb]: ra, rb = rb, ra
        self.p[rb] = ra
        if self.r[ra] == self.r[rb]: self.r[ra] += 1
        return True
```

## Complexity
- **Dijkstra**: O((V + E) log V) with binary heap.
- **Bellman-Ford**: O(V · E).
- **Floyd-Warshall**: O(V³).
- **Topo sort**: O(V + E).
- **Union-Find**: ~O(α(n)) ≈ O(1) per op with both heuristics.
- **Kruskal**: O(E log E) (sort) + DSU.
- **Prim** with heap: O((V + E) log V).
- **Tarjan SCC**: O(V + E).

## Variants in this pattern
1. **Dijkstra** — single-source, non-negative weights.
2. **Bellman-Ford** — handles negatives, detects negative cycles.
3. **Floyd-Warshall** — all-pairs, dense graphs only (n ≤ ~400).
4. **Topo sort (Kahn / DFS)** — orderings, course schedule, build deps.
5. **Union-Find** — components, Kruskal, account merge, redundant connection.
6. **Kruskal / Prim** — minimum spanning tree.
7. **Tarjan / Kosaraju** — SCCs in directed graph.
8. **Bridges & articulation points** — Tarjan low-link variants.

## Top problems
- [LC 743 — Network Delay Time](https://leetcode.com/problems/network-delay-time/) (Med) — Dijkstra.
- [LC 207 — Course Schedule](https://leetcode.com/problems/course-schedule/) (Med) — topo / cycle detect.
- [LC 210 — Course Schedule II](https://leetcode.com/problems/course-schedule-ii/) (Med) — topo order itself.
- [LC 547 — Number of Provinces](https://leetcode.com/problems/number-of-provinces/) (Med) — union-find on adjacency.
- [LC 684 — Redundant Connection](https://leetcode.com/problems/redundant-connection/) (Med) — DSU detect cycle in edge stream.
- [LC 1584 — Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) (Med) — Kruskal or Prim, MST.
- [LC 787 — Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) (Med) — Bellman-Ford-ish with hop limit.

## Common bugs / pitfalls
- **Dijkstra with negative edges** — wrong answer, no error. Use Bellman-Ford.
- **Stale heap entries** in Dijkstra — guard with `if d > dist[u]: continue` after pop.
- **Topo sort and cycles** — Kahn ends with `len(order) < n` if a cycle exists; check it.
- **Forgetting path compression** in DSU → O(log n) per op, sometimes O(n).
- **Bidirectional graph but `graph[v]` not populated** when adding `(u, v)` — also push `(v, u)`.
- **Floyd-Warshall loop order**: `k` (intermediate) must be the **outermost** loop.
- **MST on disconnected graph** — Kruskal stops with E < V-1 edges → no MST exists.

## In 30 seconds
Pick by goal: weighted shortest = Dijkstra, ordering = topo, connectivity = DSU, spanning = Kruskal/Prim. Memorize when each fails (Dijkstra hates negatives; Floyd hates large n).
