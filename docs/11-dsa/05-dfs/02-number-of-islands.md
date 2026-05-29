# 02 — Number of Islands

> DFS • Position 2/5

## Problem
Given a 2D grid of `'1'` (land) and `'0'` (water), count the number of islands. Cells connect 4-directionally.

## Intuition
Walk the grid. Every time you find a `'1'`, you've found a brand-new island — increment the count, then **sink the whole island** by DFS-flooding every connected `'1'` to `'0'` (or marking it visited). The **invariant** is that once a cell has been touched by the flood, it will never start a new island again — so the total cell-visits sum to `O(m·n)`.

## Algorithm
Two nested loops scan for unflooded land. Each find triggers a 4-directional DFS that overwrites land with water as it goes.

```python
def numIslands(grid):
    if not grid: return 0
    m, n = len(grid), len(grid[0])

    def dfs(r, c):
        if r < 0 or r >= m or c < 0 or c >= n: return
        if grid[r][c] != '1': return
        grid[r][c] = '0'                  # sink
        dfs(r+1, c); dfs(r-1, c)
        dfs(r, c+1); dfs(r, c-1)

    count = 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count
```

## Walkthrough
1. Grid: two L-shaped land masses separated by water. Scanner starts at (0,0).
2. Hit `'1'` at (0,0): `count = 1`, DFS floods the entire first island — every connected cell becomes `'0'`.
3. Scanner continues, skipping the now-watered cells.
4. Hit `'1'` at (2,3): `count = 2`, DFS floods the second island.
5. No more `'1'`s. Return `2`.

<div class="dsa-viz" data-algo="number-of-islands"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(m·n)</strong></span>
  <span>space <strong>O(m·n)</strong> recursion worst case</span>
</div>

## Pitfalls
- Comparing to integer `1` when the grid holds character `'1'` — silent bug, count stays 0.
- Forgetting to bound-check before reading `grid[r][c]` — `IndexError` on the edges.
- Mutating the input grid when the caller needs it pristine — use a `visited` set instead.
- Including diagonal moves when the problem says 4-directional (or vice versa).
- Recursion depth on a 1000×1000 all-land grid — switch to BFS or iterative stack.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/number-of-islands/">200. Number of Islands (Medium)</a> — the original.</li>
    <li><a href="https://leetcode.com/problems/max-area-of-island/">695. Max Area of Island (Medium)</a> — return area from DFS.</li>
    <li><a href="https://leetcode.com/problems/island-perimeter/">463. Island Perimeter (Easy)</a> — count exposed edges.</li>
    <li><a href="https://leetcode.com/problems/number-of-closed-islands/">1254. Number of Closed Islands (Medium)</a> — exclude border-touching islands.</li>
    <li><a href="https://leetcode.com/problems/number-of-enclaves/">1020. Number of Enclaves (Medium)</a> — flood from borders, count interior land.</li>
    <li><a href="https://leetcode.com/problems/number-of-islands-ii/">305. Number of Islands II (Hard)</a> — online with union-find.</li>
    <li><a href="https://leetcode.com/problems/number-of-distinct-islands/">694. Number of Distinct Islands (Medium)</a> — canonical shape via DFS path.</li>
    <li><a href="https://leetcode.com/problems/surrounded-regions/">130. Surrounded Regions (Medium)</a> — DFS from borders to mark safe.</li>
    <li><a href="https://leetcode.com/problems/count-sub-islands/">1905. Count Sub Islands (Medium)</a> — two-grid DFS with AND condition.</li>
    <li><a href="https://leetcode.com/problems/making-a-large-island/">827. Making A Large Island (Hard)</a> — DFS to size each island, then try flips.</li>
  </ul>
</div>
