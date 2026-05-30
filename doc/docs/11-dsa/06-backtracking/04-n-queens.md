# 04 — N-Queens

> Backtracking • Position 4/6

## Problem
Place `n` queens on an `n × n` board so that no two share a row, column, or diagonal. Return all valid placements.

## Intuition
Each row gets **exactly one** queen — so the decision per row is "which column?" That reduces the problem from `n²` cells to `n` choices per row, and the depth of the recursion is exactly `n`. The **invariant** is that rows `[0..r)` already hold a partial valid placement, and three sets — used columns, used "↘" diagonals (`r-c`), and used "↙" diagonals (`r+c`) — record which cells the next queen *cannot* enter.

## Algorithm
Walk row by row. For each row, try every column that isn't blocked by the three guard sets; recurse, then undo.

```python
def solveNQueens(n):
    res, path = [], []
    cols, diag1, diag2 = set(), set(), set()   # c, r-c, r+c

    def dfs(r):
        if r == n:
            res.append(["." * c + "Q" + "." * (n - c - 1) for c in path])
            return
        for c in range(n):
            if c in cols or (r - c) in diag1 or (r + c) in diag2:
                continue
            cols.add(c); diag1.add(r - c); diag2.add(r + c)
            path.append(c)
            dfs(r + 1)
            path.pop()
            cols.remove(c); diag1.remove(r - c); diag2.remove(r + c)

    dfs(0)
    return res
```

## Walkthrough
The widget runs on `n = 5`:

1. **Row 0, col 0.** Place a queen at `(0, 0)`. Mark `cols={0}`, `↘={0}`, `↙={0}`. Recurse to row 1.
2. **Row 1.** Cols 0 and 1 are attacked (column + diagonal); col 2 is free → place at `(1, 2)`. Recurse to row 2.
3. **Row 2 cascades.** Col 4 is the only legal square (cols 0, 1, 2, 3 all blocked) → place at `(2, 4)`. Row 3 finds col 1 → place at `(3, 1)`.
4. **Row 4 — first solution.** Col 3 survives all three attack sets → place at `(4, 3)`. The frame `row == n` records the board `[0, 2, 4, 1, 3]`.
5. **End.** Backtracking continues — for `n = 5` there are **10** solutions. The "solutions" counter in the readout ticks up as each board is recorded.

<div class="dsa-viz" data-algo="n-queens"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n!)</strong> with diagonal pruning</span>
  <span>space <strong>O(n)</strong> path + 3 guard sets</span>
</div>

## Pitfalls
- Re-checking conflicts with an O(n) scan per cell instead of the three O(1) guard sets — works but TLEs at `n=12+`.
- Confusing the two diagonals: `↘` cells share `r - c`, `↙` cells share `r + c`.
- Forgetting to remove from `cols/diag1/diag2` on backtrack — false conflicts on sibling branches.
- Building the board string with concatenation inside the hot loop instead of joining a list once at the leaf.
- Returning the same `path` reference instead of a snapshot — every output ends up identical.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/n-queens/">51. N-Queens (Hard)</a> — return all boards.</li>
    <li><a href="https://leetcode.com/problems/n-queens-ii/">52. N-Queens II (Hard)</a> — count only, same backtracking.</li>
    <li><a href="https://leetcode.com/problems/sudoku-solver/">37. Sudoku Solver (Hard)</a> — same idea, three constraint sets.</li>
    <li><a href="https://leetcode.com/problems/valid-sudoku/">36. Valid Sudoku (Medium)</a> — checker that powers the solver.</li>
    <li><a href="https://leetcode.com/problems/unique-paths-iii/">980. Unique Paths III (Hard)</a> — backtrack with cell mask.</li>
    <li><a href="https://leetcode.com/problems/maximum-length-of-a-concatenated-string-with-unique-characters/">1239. Maximum Length of a Concatenated String with Unique Characters (Medium)</a> — bitmask backtracking.</li>
    <li><a href="https://leetcode.com/problems/partition-to-k-equal-sum-subsets/">698. Partition to K Equal Sum Subsets (Medium)</a> — assign items to k bins.</li>
    <li><a href="https://leetcode.com/problems/matchsticks-to-square/">473. Matchsticks to Square (Medium)</a> — k=4 partition variant.</li>
    <li><a href="https://leetcode.com/problems/maximum-score-words-formed-by-letters/">1255. Maximum Score Words Formed by Letters (Hard)</a> — include/exclude with letter budget.</li>
    <li><a href="https://leetcode.com/problems/splitting-a-string-into-descending-consecutive-values/">1849. Splitting a String Into Descending Consecutive Values (Medium)</a> — string-partition backtracking.</li>
  </ul>
</div>
