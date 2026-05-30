# 06 — Median of Two Sorted Arrays

> Binary Search • Position 6/6

## Problem
Given two sorted arrays `A` and `B` of sizes `m` and `n`, find the median of the combined sorted array in O(log min(m, n)).

## Intuition
The median splits the combined array of `m + n` elements into two halves of equal size where every element in the left half is `<=` every element in the right half. We don't actually merge — we *partition*. Pick a cut `i` in `A` (0..m); the matching cut in `B` is `j = (m + n + 1) // 2 - i`. The cut is valid when `A[i-1] <= B[j]` **and** `B[j-1] <= A[i]`. Binary-search `i` on the smaller array. When the cut is valid, the median is `max(A[i-1], B[j-1])` (odd total) or its average with `min(A[i], B[j])` (even total).

## Algorithm
1. Ensure `A` is the smaller array — swap if not.
2. Binary search `i` in `[0, m]`. Let `j = (m + n + 1) // 2 - i`.
3. Use sentinels `-∞` and `+∞` for out-of-bound indices.
4. If `A[i-1] > B[j]`, the cut in `A` is too far right — move left (`hi = i - 1`).
5. If `B[j-1] > A[i]`, the cut in `A` is too far left — move right (`lo = i + 1`).
6. Otherwise the cut is valid — compute the median from the four boundary values.

```python
def find_median(A, B):
    if len(A) > len(B):
        A, B = B, A
    m, n = len(A), len(B)
    half = (m + n + 1) // 2
    lo, hi = 0, m
    while lo <= hi:
        i = (lo + hi) // 2
        j = half - i
        a_left  = A[i - 1] if i > 0 else float('-inf')
        a_right = A[i]     if i < m else float('inf')
        b_left  = B[j - 1] if j > 0 else float('-inf')
        b_right = B[j]     if j < n else float('inf')
        if a_left <= b_right and b_left <= a_right:
            if (m + n) % 2:
                return max(a_left, b_left)
            return (max(a_left, b_left) + min(a_right, b_right)) / 2
        if a_left > b_right:
            hi = i - 1
        else:
            lo = i + 1
```

## Walkthrough
`A = [1, 3, 8]`, `B = [7, 9, 10, 11]`. `m=3, n=4`, total = 7 (odd), `half = 4`.

1. `lo=0, hi=3` → `i=1, j=3`. Boundaries: `maxLA=1, minRA=3, maxLB=10, minRB=11`. `maxLB=10 > minRA=3` → `i` too small, push `lo=2`.
2. `lo=2, hi=3` → `i=2, j=2`. Boundaries: `maxLA=3, minRA=8, maxLB=9, minRB=10`. `maxLB=9 > minRA=8` → still too small, push `lo=3`.
3. `lo=3, hi=3` → `i=3, j=1`. Boundaries: `maxLA=8, minRA=+∞, maxLB=7, minRB=9`. Both checks pass — **valid partition**.
4. Odd total → median = `max(maxLA, maxLB) = max(8, 7) = 8`.

<div class="dsa-viz" data-algo="median-of-two"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(log min(m, n))</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- **Always binary-search the smaller array** — otherwise `j` can go negative or beyond `n`.
- The sentinel trick (`±∞`) is what makes the boundary cases (cut at 0 or at the end) collapse into the same code. Don't try to special-case them.
- `half = (m + n + 1) // 2` is correct for both odd and even totals — derive it on paper before trusting it.
- Off-by-one between `i` (size of left part of A) and `i-1` (last index of left part) is the most common bug — use clear variable names.
- For the "kth element" generalization, the same partition trick works with `k` instead of `half` — but the median problem is the cleanest case.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/median-of-two-sorted-arrays/">4. Median of Two Sorted Arrays (Hard)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/merge-sorted-array/">88. Merge Sorted Array (Easy)</a> — warm-up for two-array sorted merging.</li>
    <li><a href="https://leetcode.com/problems/find-median-from-data-stream/">295. Find Median from Data Stream (Hard)</a> — heap-based median, complementary skill.</li>
    <li><a href="https://leetcode.com/problems/statistics-from-a-large-sample/">1093. Statistics from a Large Sample (Medium)</a> — median via cumulative frequency.</li>
    <li><a href="https://leetcode.com/problems/k-th-smallest-prime-fraction/">786. K-th Smallest Prime Fraction (Medium)</a> — binary search on fraction value.</li>
    <li><a href="https://leetcode.com/problems/kth-smallest-subarray-sum/">1918. Kth Smallest Subarray Sum (Medium)</a> — search on answer with sliding-window counter.</li>
    <li><a href="https://leetcode.com/problems/closest-subsequence-sum/">1755. Closest Subsequence Sum (Hard)</a> — meet-in-the-middle plus binary search.</li>
    <li><a href="https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/">378. Kth Smallest Element in a Sorted Matrix (Medium)</a> — kth-smallest via predicate.</li>
    <li><a href="https://leetcode.com/problems/kth-smallest-number-in-multiplication-table/">668. Kth Smallest Number in Multiplication Table (Hard)</a> — virtual sorted matrix.</li>
    <li><a href="https://leetcode.com/problems/find-k-th-smallest-pair-distance/">719. Find K-th Smallest Pair Distance (Hard)</a> — binary search on the gap.</li>
  </ul>
</div>
