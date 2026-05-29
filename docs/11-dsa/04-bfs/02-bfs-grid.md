# 02 — BFS on Grid

> BFS • Position 2/5

## Problem
Given an `m × n` grid with open cells and obstacles, find the shortest path (in cell hops) from a start cell to a target cell — or compute distances to every reachable cell.

## Intuition
A grid is just a graph in disguise: each cell is a node, and each cell has up to 4 (or 8) neighbours. Run BFS exactly as on a graph — the only difference is generating neighbours on the fly via direction vectors, and pruning out-of-bounds or obstacle cells. Marking visited as soon as you enqueue keeps the queue size bounded by O(m·n) and ensures O(m·n) total work.

## Algorithm
1. Define `DIRS = [(-1,0), (1,0), (0,-1), (0,1)]` for 4-connectivity (or include diagonals for 8).
2. Push the start cell into the queue, mark it visited.
3. While the queue is non-empty:
   - Pop `(r, c)`. If it's the target, return its distance.
   - For each `(dr, dc)` in `DIRS`, compute `(nr, nc)`. If it's in bounds, not an obstacle, and not visited, enqueue it and mark visited.

```python
from collections import deque

DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def shortest_path(grid, start, target):
    m, n = len(grid), len(grid[0])
    q = deque([(*start, 0)])
    seen = {start}
    while q:
        r, c, d = q.popleft()
        if (r, c) == target:
            return d
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] != '#' and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append((nr, nc, d + 1))
    return -1
```

## Walkthrough
3×3 grid, `.` open, `#` wall, start `(0,0)`, target `(2,2)`:

```
. . .
. # .
. . .
```

1. Enqueue `(0,0,0)`. Pop → expand to `(0,1)` and `(1,0)`, both at dist 1.
2. Pop `(0,1,1)` → expand to `(0,2)` at dist 2. `(1,1)` is a wall, skip.
3. Pop `(1,0,1)` → expand to `(2,0)` at dist 2.
4. Pop `(0,2,2)` → expand to `(1,2)` at dist 3.
5. Pop `(2,0,2)` → expand to `(2,1)` at dist 3.
6. Pop `(1,2,3)` → expand to `(2,2)` at dist 4. Target reached — return 4.

<div class="dsa-viz" data-algo="grid-bfs"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(m · n)</strong></span>
  <span>space <strong>O(m · n)</strong></span>
</div>

## Pitfalls
- **Bounds-check before indexing** — `0 <= nr < m and 0 <= nc < n`. Python lists with negative indices silently wrap around and corrupt results.
- **Mark visited on enqueue, not dequeue** — otherwise the same cell ends up in the queue multiple times.
- For **8-connectivity**, double-check whether the problem actually allows diagonal moves — many do not.
- **Multi-source BFS** is just BFS with all sources seeded at distance 0 — don't write a loop running BFS once per source (that's O(s · m · n)).
- For **weighted grid moves** (e.g. some cells cost 5, some cost 1), BFS is wrong — use Dijkstra or 0-1 BFS depending on weight values.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/number-of-islands/">200. Number of Islands (Medium)</a> — flood-fill components.</li>
    <li><a href="https://leetcode.com/problems/rotting-oranges/">994. Rotting Oranges (Medium)</a> — multi-source BFS with time.</li>
    <li><a href="https://leetcode.com/problems/shortest-path-in-binary-matrix/">1091. Shortest Path in Binary Matrix (Medium)</a> — 8-directional BFS.</li>
    <li><a href="https://leetcode.com/problems/01-matrix/">542. 01 Matrix (Medium)</a> — multi-source from every 0.</li>
    <li><a href="https://leetcode.com/problems/walls-and-gates/">286. Walls and Gates (Medium)</a> — multi-source from every gate.</li>
    <li><a href="https://leetcode.com/problems/surrounded-regions/">130. Surrounded Regions (Medium)</a> — BFS from border to mark safe cells.</li>
    <li><a href="https://leetcode.com/problems/max-area-of-island/">695. Max Area of Island (Medium)</a> — flood-fill with size tracking.</li>
    <li><a href="https://leetcode.com/problems/as-far-from-land-as-possible/">1162. As Far from Land as Possible (Medium)</a> — multi-source BFS for max distance.</li>
    <li><a href="https://leetcode.com/problems/shortest-bridge/">934. Shortest Bridge (Medium)</a> — DFS to find first island, BFS to expand.</li>
    <li><a href="https://leetcode.com/problems/bus-routes/">815. Bus Routes (Hard)</a> — BFS on bus-route-as-node abstraction.</li>
  </ul>
</div>
