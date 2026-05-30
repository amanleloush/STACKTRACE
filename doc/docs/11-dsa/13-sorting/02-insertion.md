# 02 — Insertion Sort

> Sorting • Position 2/8

## Problem
Sort an array in ascending order by growing a sorted prefix one element at a time.

## Intuition
Imagine sorting a hand of cards: pick up the next card and slide it left past every larger card already in your hand. **Invariant**: at the start of iteration `i`, the subarray `a[0..i-1]` is sorted (a permutation of the original first `i` elements). On each iteration you insert `a[i]` into that prefix by shifting larger elements right. Best case (nearly sorted input) is O(n) because the inner loop rarely shifts.

## Algorithm
Right-shift larger elements; drop the current key into its place.

```python
def insertion_sort(a):
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]              # shift right
            j -= 1
        a[j + 1] = key                   # insert
```

## Walkthrough
The widget sorts `[5, 2, 4, 6, 1, 3]`:

1. **i = 1, key = 2.** `a[0] = 5 > 2` → shift 5 right → `[2, 5, 4, 6, 1, 3]`. Sorted prefix grows to length 2.
2. **i = 2, key = 4.** `a[1] = 5 > 4` → shift; `a[0] = 2 ≤ 4` stops the loop → drop key at index 1 → `[2, 4, 5, 6, 1, 3]`.
3. **i = 3, key = 6.** First compare `a[2] = 5 ≤ 6` — no shifts, the element is already in place.
4. **i = 4, key = 1.** The expensive case: shift `6, 5, 4, 2` all one slot right → drop `1` at index 0 → `[1, 2, 4, 5, 6, 3]`.
5. **End — i = 5, key = 3.** Shift `6, 5, 4`, then `a[1] = 2 ≤ 3` stops → final array `[1, 2, 3, 4, 5, 6]`. Sorted region covers the whole array.

<div class="dsa-viz" data-algo="insertion-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n²)</strong></span>
  <span>space <strong>O(1)</strong></span>
  <span>stable? <strong>yes</strong></span>
  <span>in-place? <strong>yes</strong></span>
</div>

## Pitfalls
- Off-by-one on `a[j + 1] = key` — you wrote `key` into the slot *after* the smallest larger element.
- Using strict `>` keeps stability; flipping to `>=` would break it by shifting equal keys past their original order.
- Starting `i` at `0` instead of `1` — the prefix of length 1 is already sorted.
- Quadratic in the worst case — don't reach for it on adversarial input.
- Despite the bad asymptotics, insertion sort is the *fastest* sort for very small or nearly-sorted arrays — that's why Timsort uses it for runs of length ≤ 32.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/insertion-sort-list/">Insertion Sort List (Med)</a> — insertion sort on a linked list.</li>
    <li><a href="https://leetcode.com/problems/sort-an-array/">Sort an Array (Med)</a> — benchmark all sorts.</li>
    <li><a href="https://leetcode.com/problems/merge-sorted-array/">Merge Sorted Array (Easy)</a> — in-place merge from the end.</li>
    <li><a href="https://leetcode.com/problems/height-checker/">Height Checker (Easy)</a> — count out-of-place positions.</li>
    <li><a href="https://leetcode.com/problems/wiggle-sort/">Wiggle Sort (Med)</a> — local swaps reach the goal in one pass.</li>
    <li><a href="https://leetcode.com/problems/h-index/">H-Index (Med)</a> — sort then scan.</li>
    <li><a href="https://leetcode.com/problems/longest-word-in-dictionary-through-deleting/">Longest Word in Dictionary through Deleting (Med)</a> — sort dictionary by length/lexicographic.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-increasing-frequency/">Sort Array by Increasing Frequency (Easy)</a> — sort with a custom comparator.</li>
    <li><a href="https://leetcode.com/problems/sort-integers-by-the-number-of-1-bits/">Sort Integers by The Number of 1 Bits (Easy)</a> — popcount then sort.</li>
    <li><a href="https://leetcode.com/problems/car-fleet/">Car Fleet (Med)</a> — sort by position, scan from the right.</li>
  </ul>
</div>
