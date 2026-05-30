# 05 — Search 2D Matrix (Staircase Walk)

> Binary Search • Position 5/6

## Problem
Given an `m × n` matrix where each row is sorted left-to-right and each column is sorted top-to-bottom, return whether a target exists in the matrix.

## Intuition
Start at a corner where one direction increases and the other decreases — the **top-right** (`(0, n-1)`) is the canonical choice. From there: if the current cell is **bigger** than target, you can drop the entire column (move left); if it's **smaller**, you can drop the entire row (move down). Each step eliminates an entire row or column, so the walk visits at most `m + n` cells. It looks like a staircase descending from the top-right corner.

## Algorithm
1. Start at `(r, c) = (0, n - 1)`.
2. While `r < m` and `c >= 0`:
   - If `matrix[r][c] == target`, return true.
   - If `matrix[r][c] > target`, move left (`c -= 1`).
   - Else move down (`r += 1`).
3. Return false.

```python
def search_matrix(matrix, target):
    if not matrix or not matrix[0]:
        return False
    m, n = len(matrix), len(matrix[0])
    r, c = 0, n - 1
    while r < m and c >= 0:
        if matrix[r][c] == target:
            return True
        if matrix[r][c] > target:
            c -= 1
        else:
            r += 1
    return False
```

## Walkthrough
On the 4×4 matrix with `target = 5`:

```
[ 1,  4,  7, 11]
[ 2,  5,  8, 12]
[ 3,  6,  9, 16]
[10, 13, 14, 17]
```

1. **Start at top-right** `(0, 3) = 11`. `11 > 5` → column 3 eliminated, step left to `(0, 2)`.
2. `(0, 2) = 7 > 5` → column 2 eliminated, step left to `(0, 1)`.
3. `(0, 1) = 4 < 5` → row 0 eliminated, step down to `(1, 1)`.
4. `(1, 1) = 5 == target` — return `true`. Four cell visits on a 16-cell matrix.

<div class="dsa-viz" data-algo="2d-matrix"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(m + n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

For the stricter LC 74 variant (every row starts after the previous row's end), a true O(log(m·n)) binary search is possible by treating the matrix as a flat sorted array.

## Pitfalls
- **Starting at `(0, 0)` or `(m-1, n-1)`** doesn't work — both directions either increase or decrease, so you can't eliminate.
- The bottom-left corner `(m-1, 0)` is equally valid (swap directions) — but pick one and stick with it.
- For LC 74 (strictly increasing across row boundaries), staircase is correct but suboptimal — use flattened binary search for O(log(m·n)).
- Don't confuse this with "kth smallest in sorted matrix" (LC 378) — that's binary search on the answer with `count_le(mid)` as the predicate.
- Bounds-check inside the loop — `r < m and c >= 0`, not `r <= m`.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/search-a-2d-matrix/">74. Search a 2D Matrix (Medium)</a> — flattened binary search variant.</li>
    <li><a href="https://leetcode.com/problems/search-a-2d-matrix-ii/">240. Search a 2D Matrix II (Medium)</a> — the canonical staircase problem.</li>
    <li><a href="https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/">378. Kth Smallest Element in a Sorted Matrix (Medium)</a> — search on answer with staircase counter.</li>
    <li><a href="https://leetcode.com/problems/kth-smallest-number-in-multiplication-table/">668. Kth Smallest Number in Multiplication Table (Hard)</a> — same idea, virtual matrix.</li>
    <li><a href="https://leetcode.com/problems/median-of-two-sorted-arrays/">4. Median of Two Sorted Arrays (Hard)</a> — partition-based binary search.</li>
    <li><a href="https://leetcode.com/problems/find-k-th-smallest-pair-distance/">719. Find K-th Smallest Pair Distance (Hard)</a> — search on the gap.</li>
    <li><a href="https://leetcode.com/problems/count-negative-numbers-in-a-sorted-matrix/">1351. Count Negative Numbers in a Sorted Matrix (Easy)</a> — staircase counting.</li>
    <li><a href="https://leetcode.com/problems/leftmost-column-with-at-least-a-one/">1428. Leftmost Column With at Least a One (Medium)</a> — interactive matrix staircase.</li>
    <li><a href="https://leetcode.com/problems/find-peak-element/">162. Find Peak Element (Medium)</a> — 1D peak finder, prereq for 2D.</li>
    <li><a href="https://leetcode.com/problems/find-a-peak-element-ii/">1901. Find a Peak Element II (Medium)</a> — 2D binary search on the column with max.</li>
  </ul>
</div>
