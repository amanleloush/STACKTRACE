# 04 — Multi-Source BFS — Rotting Oranges

> BFS • Position 4/5

## Problem
LC 994: an `m × n` grid contains empty cells (`0`), fresh oranges (`1`), and rotten oranges (`2`). Every minute, each rotten orange rots its 4-directional fresh neighbours. Return the minimum minutes until no fresh oranges remain, or `-1` if impossible.

## Intuition
Running BFS from each rotten orange independently and merging distances is wasteful. Instead, **seed every source into the queue at distance 0** and let them expand in parallel. Because BFS only updates a cell the first time it's reached, every fresh orange gets stamped with the distance to its *nearest* rotten source — exactly what we want. The answer is the maximum distance assigned, since all rotten oranges spread simultaneously.

## Algorithm
1. Scan the grid. Enqueue every rotten orange as `(r, c, 0)`. Count fresh oranges.
2. Run BFS. For each pop, expand to 4-directional fresh neighbours; flip them rotten, decrement fresh count, enqueue with `t + 1`. Track the max `t` seen.
3. After BFS, return `max_t` if `fresh == 0`, else `-1`.

```python
from collections import deque

def oranges_rotting(grid):
    m, n = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 2:
                q.append((r, c, 0))
            elif grid[r][c] == 1:
                fresh += 1

    max_t = 0
    while q:
        r, c, t = q.popleft()
        max_t = max(max_t, t)
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                q.append((nr, nc, t + 1))

    return max_t if fresh == 0 else -1
```

## Walkthrough
5×5 grid with two rotten sources `O` at `(0,0)` and `(4,4)`, fresh oranges `F` elsewhere, walls `#` at `(0,3), (1,2), (3,1), (3,3)`:

```
O F F # F
F F # F F
F F F F F
F # F # F
F F F F O
```

1. **Init.** Queue seeded with `[(0,0,0), (4,4,0)]` — both sources stamped time 0.
2. **t=0.** Pop `(0,0,0)` → rot `(0,1)` and `(1,0)` at `t=1`. Pop `(4,4,0)` → rot `(3,4)` and `(4,3)` at `t=1`.
3. **t=1 wavefront.** Pop the four `t=1` cells; each rots its fresh 4-neighbours at `t=2` — e.g. `(0,1)` rots `(1,1)`, `(1,0)` rots `(2,0)`, etc.
4. **Spread continues** wave by wave. Walls block propagation, so the two fronts meet across the middle row at `t=4`.
5. **End.** Queue empties with every reachable `F` flipped to `R`. `maxTime = 4` — the answer.

<div class="dsa-viz" data-algo="multi-source-bfs"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(m · n)</strong></span>
  <span>space <strong>O(m · n)</strong></span>
</div>

## Pitfalls
- **Don't run BFS once per source.** That's O(s · m · n) — multi-source BFS is O(m · n) regardless of source count.
- Count fresh oranges **before** BFS starts so you can detect "unreachable fresh" cases cleanly.
- **Mutating the grid in place** is fine here (it's the "visited" mark), but document it or use a separate visited set if the grid must be preserved.
- If the queue is empty at start because there are no rotten oranges, return 0 if `fresh == 0`, else `-1`. Edge case.
- For "all fresh must be reached" (this problem) the answer is the max distance — not the queue size or the number of pops.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/rotting-oranges/">994. Rotting Oranges (Medium)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/01-matrix/">542. 01 Matrix (Medium)</a> — multi-source from every 0.</li>
    <li><a href="https://leetcode.com/problems/walls-and-gates/">286. Walls and Gates (Medium)</a> — multi-source from every gate.</li>
    <li><a href="https://leetcode.com/problems/as-far-from-land-as-possible/">1162. As Far from Land as Possible (Medium)</a> — multi-source, take max distance.</li>
    <li><a href="https://leetcode.com/problems/map-of-highest-peak/">1765. Map of Highest Peak (Medium)</a> — multi-source from every water cell.</li>
    <li><a href="https://leetcode.com/problems/shortest-bridge/">934. Shortest Bridge (Medium)</a> — DFS to seed one island, BFS to expand.</li>
    <li><a href="https://leetcode.com/problems/bus-routes/">815. Bus Routes (Hard)</a> — multi-source on bus-route graph.</li>
    <li><a href="https://leetcode.com/problems/pacific-atlantic-water-flow/">417. Pacific Atlantic Water Flow (Medium)</a> — two multi-source BFS / DFS passes.</li>
    <li><a href="https://leetcode.com/problems/shortest-path-with-alternating-colors/">1129. Shortest Path with Alternating Colors (Medium)</a> — BFS with edge-color state.</li>
    <li><a href="https://leetcode.com/problems/k-similar-strings/">854. K-Similar Strings (Hard)</a> — BFS on string state.</li>
  </ul>
</div>
