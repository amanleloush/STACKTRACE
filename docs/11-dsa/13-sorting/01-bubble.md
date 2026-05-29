# 01 — Bubble Sort

> Sorting • Position 1/8

## Problem
Sort an array in ascending order using only adjacent swaps.

## Intuition
Walk the array left to right; whenever two adjacent elements are out of order, swap them. The largest element "bubbles" to the end on every pass. **Invariant**: after pass `i`, the last `i` elements are in their final sorted positions. After at most `n − 1` passes the entire array is sorted, and if a pass finishes without a swap the array is already sorted.

## Algorithm
Repeated adjacent comparison with an early-exit flag.

```python
def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):       # last i are sorted
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:                  # already sorted
            return
```

## Walkthrough
Sort `[5, 1, 4, 2, 8]`.

1. Pass 1 compares pairs `(5,1) (5,4) (5,2) (5,8)` — three swaps land `8` at the end: `[1, 4, 2, 5, 8]`.
2. Pass 2 ignores the trailing `8`, swaps `(4,2)`: `[1, 2, 4, 5, 8]`.
3. Pass 3 makes no swaps — the `swapped` flag stays false, so the algorithm terminates early.
4. Final array: `[1, 2, 4, 5, 8]`. Total: 4 swaps, 9 comparisons.

<div class="dsa-viz" data-algo="bubble-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n²)</strong></span>
  <span>space <strong>O(1)</strong></span>
  <span>stable? <strong>yes</strong></span>
  <span>in-place? <strong>yes</strong></span>
</div>

## Pitfalls
- Forgetting the `swapped` flag — without it you always do `n − 1` passes even on sorted input.
- Iterating `j` to `n − 1` instead of `n − 1 − i` — wastes comparisons over the already-sorted tail.
- Using `<` instead of `>` flips the order; use `>` for ascending, `<` for descending.
- Treating bubble sort as a serious production algorithm — it isn't. It's a teaching tool.
- Confusing "stable" with "sorted" — bubble sort is stable because it only swaps strictly greater pairs.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/sort-an-array/">Sort an Array (Med)</a> — try every algo here against the same input.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-parity-ii/">Sort Array By Parity II (Easy)</a> — two pointers, but adjacent swaps fix parity locally.</li>
    <li><a href="https://leetcode.com/problems/sort-colors/">Sort Colors (Med)</a> — Dutch national flag is essentially specialized bubble.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-parity/">Sort Array By Parity (Easy)</a> — partition warm-up.</li>
    <li><a href="https://leetcode.com/problems/squares-of-a-sorted-array/">Squares of a Sorted Array (Easy)</a> — two pointers beats sort.</li>
    <li><a href="https://leetcode.com/problems/wiggle-sort/">Wiggle Sort (Med)</a> — single pass of conditional adjacent swaps.</li>
    <li><a href="https://leetcode.com/problems/wiggle-sort-ii/">Wiggle Sort II (Med)</a> — harder; needs sort + interleave.</li>
    <li><a href="https://leetcode.com/problems/sort-characters-by-frequency/">Sort Characters By Frequency (Med)</a> — sort by count.</li>
    <li><a href="https://leetcode.com/problems/meeting-rooms/">Meeting Rooms (Easy)</a> — sort intervals, scan.</li>
    <li><a href="https://leetcode.com/problems/sorting-the-sentence/">Sorting the Sentence (Easy)</a> — index-based placement.</li>
  </ul>
</div>
