# 02 — Dijkstra Shortest Path

> Graph Algorithms • Position 2/8

## Problem
Given a weighted graph with **non-negative** edge weights and a source node, find the shortest distance from source to every other node.

## Intuition
Greedy BFS with a priority queue: always extend from the closest unfinalized node. Because weights are non-negative, **once you pop a node from the heap, its distance is finalized** — no later path can improve it. The invariant: **the heap holds tentative distances; every popped node's distance is optimal.** The proof rests on non-negativity: any unexplored path to an already-popped node would have to detour through a node currently in the heap, whose distance is already ≥ the one we popped.

## Algorithm
Initialize `dist[source] = 0`, everything else infinity. Push `(0, source)`. While the heap is non-empty: pop `(d, u)`. Skip if `d > dist[u]` (stale entry). For each neighbor `v` with edge weight `w`, if `d + w < dist[v]`, update and push `(d + w, v)`.

```python
import heapq

def dijkstra(n, graph, src):
    dist = [float('inf')] * n
    dist[src] = 0
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue                  # stale
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist
```

## Walkthrough
Example: nodes 0–4, edges `0→1 (4), 0→2 (1), 2→1 (2), 1→3 (1), 2→3 (5), 3→4 (3)`. Source = 0.

1. Push (0, 0). dist=[0, ∞, ∞, ∞, ∞].
2. Pop (0, 0). Relax 1 → dist[1]=4, push (4, 1). Relax 2 → dist[2]=1, push (1, 2).
3. Pop (1, 2). Relax 1 → 1+2=3 < 4 → dist[1]=3, push (3, 1). Relax 3 → dist[3]=6, push (6, 3).
4. Pop (3, 1). Relax 3 → 3+1=4 < 6 → dist[3]=4, push (4, 3). Stale (4, 1) will be discarded later.
5. Pop (4, 3). Relax 4 → dist[4]=7. Pop remaining stale entries. Final: [0, 3, 1, 4, 7].

<div class="dsa-viz" data-algo="dijkstra"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O((V + E) log V)</strong></span>
  <span>space <strong>O(V + E)</strong></span>
</div>

With a Fibonacci heap, this drops to O(E + V log V), but interview answers use a binary heap.

## Pitfalls
- **Non-negative weights only** — Dijkstra produces wrong answers on negative edges. Use Bellman-Ford.
- **Stale entries** — `heapq` doesn't support decrease-key, so duplicates pile up. Check `d > dist[u]` and skip.
- **0-1 BFS** is faster (O(V+E)) when weights are only 0 or 1 — use a deque.
- **Track path** by storing `parent[v] = u` on each successful relaxation; reconstruct by walking back.
- **Multi-source** — push `(0, s)` for every source `s` at init; the algorithm handles it.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/network-delay-time/">743 Network Delay Time (Med)</a> — the canonical single-source.</li>
    <li><a href="https://leetcode.com/problems/cheapest-flights-within-k-stops/">787 Cheapest Flights Within K Stops (Med)</a> — Dijkstra with state (node, stops).</li>
    <li><a href="https://leetcode.com/problems/path-with-minimum-effort/">1631 Path With Minimum Effort (Med)</a> — relax on max along path, not sum.</li>
    <li><a href="https://leetcode.com/problems/path-with-maximum-probability/">1514 Path with Maximum Probability (Med)</a> — max-heap on product.</li>
    <li><a href="https://leetcode.com/problems/swim-in-rising-water/">778 Swim in Rising Water (Hard)</a> — grid Dijkstra on max-elevation.</li>
    <li><a href="https://leetcode.com/problems/number-of-ways-to-arrive-at-destination/">1976 Number of Ways to Arrive at Destination (Med)</a> — Dijkstra + path count DP.</li>
    <li><a href="https://leetcode.com/problems/reachable-nodes-in-subdivided-graph/">882 Reachable Nodes In Subdivided Graph (Hard)</a> — Dijkstra on inflated graph.</li>
    <li><a href="https://leetcode.com/problems/minimum-cost-to-reach-destination-in-time/">1928 Minimum Cost to Reach Destination in Time (Hard)</a> — two-dim Dijkstra.</li>
    <li><a href="https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/">1334 Find the City With the Smallest Number of Neighbors (Med)</a> — Dijkstra from every node.</li>
    <li><a href="https://leetcode.com/problems/second-minimum-time-to-reach-destination/">2045 Second Minimum Time to Reach Destination (Hard)</a> — track top-2 distances.</li>
  </ul>
</div>
