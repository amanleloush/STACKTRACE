# 03 — Search in Rotated Sorted Array

> Binary Search • Position 3/6

## Problem
A sorted array of distinct values was rotated at an unknown pivot, e.g. `[4, 5, 6, 7, 0, 1, 2]`. Given a target, return its index or `-1` — in O(log n).

## Intuition
The crucial observation: at any `mid`, **at least one of the two halves `[lo, mid]` or `[mid, hi]` is still sorted**. Compare `arr[mid]` with `arr[lo]` to figure out which half is sorted, then ask whether the target lies inside the sorted half (use plain range check) or outside it. Discard the wrong half. The invariant is preserved across iterations because the sorted-half property is local.

## Algorithm
1. Initialize `lo = 0`, `hi = n - 1`.
2. While `lo <= hi`:
   - Compute `mid`. If `arr[mid] == target`, return `mid`.
   - **Left half sorted** (`arr[lo] <= arr[mid]`): if `arr[lo] <= target < arr[mid]`, go left; else go right.
   - **Right half sorted** (else): if `arr[mid] < target <= arr[hi]`, go right; else go left.
3. Return `-1`.

```python
def search_rotated(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] == target:
            return mid
        if arr[lo] <= arr[mid]:                  # left half sorted
            if arr[lo] <= target < arr[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                                     # right half sorted
            if arr[mid] < target <= arr[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
```

## Walkthrough
On `arr = [4, 5, 6, 7, 0, 1, 2, 3]`, `target = 1`:

1. `lo=0, hi=7` → `mid=3`, `arr[3]=7`. `a[lo]=4 ≤ a[mid]=7` → **LEFT half** `[4..7]` is sorted. Target `1` is not in `[4, 7)` → descend right, `lo=4`.
2. `lo=4, hi=7` → `mid=5`, `arr[5]=1 == target` — **found at index 5**, return immediately.

<div class="dsa-viz" data-algo="rotated-search"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(log n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- The comparison `arr[lo] <= arr[mid]` must be `<=` (not `<`) to handle the case when `lo == mid`.
- The range check inside the sorted half uses `<` on the open end and `<=` on the closed end — flipping either breaks the algorithm.
- **Duplicates change the worst case.** If `arr[lo] == arr[mid] == arr[hi]`, you can't tell which half is sorted — fall back to `lo += 1` and the worst case becomes O(n) (LC 81).
- Be careful with single-element and two-element arrays — trace them by hand.
- For "find minimum in rotated sorted" (LC 153), the template flips: compare `arr[mid]` against `arr[hi]` to find the inflection point.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/search-in-rotated-sorted-array/">33. Search in Rotated Sorted Array (Medium)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/search-in-rotated-sorted-array-ii/">81. Search in Rotated Sorted Array II (Medium)</a> — with duplicates.</li>
    <li><a href="https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/">153. Find Minimum in Rotated Sorted Array (Medium)</a> — locate the pivot.</li>
    <li><a href="https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii/">154. Find Minimum in Rotated Sorted Array II (Hard)</a> — with duplicates.</li>
    <li><a href="https://leetcode.com/problems/find-peak-element/">162. Find Peak Element (Medium)</a> — local-max binary search.</li>
    <li><a href="https://leetcode.com/problems/peak-index-in-a-mountain-array/">852. Peak Index in a Mountain Array (Medium)</a> — easier peak finder.</li>
    <li><a href="https://leetcode.com/problems/search-a-2d-matrix-ii/">240. Search a 2D Matrix II (Medium)</a> — staircase variant.</li>
    <li><a href="https://leetcode.com/problems/search-a-2d-matrix/">74. Search a 2D Matrix (Medium)</a> — treat as flattened sorted array.</li>
    <li><a href="https://leetcode.com/problems/find-in-mountain-array/">1095. Find in Mountain Array (Hard)</a> — peak first, then two halves.</li>
    <li><a href="https://leetcode.com/problems/median-of-two-sorted-arrays/">4. Median of Two Sorted Arrays (Hard)</a> — partition-based binary search.</li>
  </ul>
</div>
