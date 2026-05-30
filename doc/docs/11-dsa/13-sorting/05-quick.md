# 05 — Quick Sort (Lomuto)

> Sorting • Position 5/8

## Problem
Sort an array in ascending order with the lowest constant factors of any comparison sort.

## Intuition
Pick a pivot, partition the array so that elements less than the pivot are on the left and the rest on the right, then recurse on both sides. **Invariant** (Lomuto partition): at index `i`, the slice `a[lo..i]` holds every element ≤ pivot found so far, and `a[i+1..j-1]` holds elements > pivot. After partition the pivot sits in its final sorted position. Average case is O(n log n) because the pivot splits roughly evenly, but pathological pivots (e.g., always the largest) degrade to O(n²). Randomizing or median-of-three pivot selection makes the bad case astronomically unlikely.

## Algorithm
Lomuto partition + recurse on both sides.

```python
def quick_sort(a, lo=0, hi=None):
    if hi is None: hi = len(a) - 1
    if lo < hi:
        p = partition(a, lo, hi)
        quick_sort(a, lo, p - 1)
        quick_sort(a, p + 1, hi)

def partition(a, lo, hi):
    pivot = a[hi]                        # randomize for safety
    i = lo - 1
    for j in range(lo, hi):
        if a[j] <= pivot:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[hi] = a[hi], a[i + 1]
    return i + 1
```

## Walkthrough
Sort `[3, 6, 8, 2, 5]` with pivot = last element.

1. `partition(lo=0, hi=4)`, pivot = `5`. Scan: `3 ≤ 5` swap with itself → `i = 0`. `6 > 5` skip. `8 > 5` skip. `2 ≤ 5` swap `a[1]↔a[3]` → `[3, 2, 8, 6, 5]`, `i = 1`. Finalize: swap `a[2]↔a[4]` → `[3, 2, 5, 6, 8]`. Pivot lands at index 2.
2. Recurse left on `[3, 2]` with pivot `2`: scan finds `i = -1`, swap → `[2, 3]`.
3. Recurse right on `[6, 8]` with pivot `8`: scan finds `i = 0`, swap with itself → unchanged.
4. Final array: `[2, 3, 5, 6, 8]`.

<div class="dsa-viz" data-algo="quick-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log n) avg, O(n²) worst</strong></span>
  <span>space <strong>O(log n) stack avg</strong></span>
  <span>stable? <strong>no</strong></span>
  <span>in-place? <strong>yes</strong></span>
</div>

## Pitfalls
- **Always choosing the last (or first) element as pivot is the textbook way to get O(n²) on sorted input.** Randomize or pick median-of-three.
- Recursing on both halves without tail-call optimization can blow the stack on adversarial input — recurse on the smaller side, iterate on the larger.
- Lomuto is simpler but does more swaps than Hoare partitioning — both are correct.
- Quick sort is *not* stable — partitioning leapfrogs equal keys.
- The same partition routine, run recursively on only one side, gives you **Quickselect** for the k-th order statistic in O(n) average.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/sort-an-array/">Sort an Array (Med)</a> — bring your own implementation.</li>
    <li><a href="https://leetcode.com/problems/kth-largest-element-in-an-array/">Kth Largest Element in an Array (Med)</a> — quickselect, average O(n).</li>
    <li><a href="https://leetcode.com/problems/sort-colors/">Sort Colors (Med)</a> — three-way partition (Dutch flag).</li>
    <li><a href="https://leetcode.com/problems/wiggle-sort-ii/">Wiggle Sort II (Med)</a> — quickselect + virtual indexing.</li>
    <li><a href="https://leetcode.com/problems/sort-characters-by-frequency/">Sort Characters By Frequency (Med)</a> — bucket or sort by count.</li>
    <li><a href="https://leetcode.com/problems/k-closest-points-to-origin/">K Closest Points to Origin (Med)</a> — quickselect by distance.</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-elements/">Top K Frequent Elements (Med)</a> — quickselect on (count, value) pairs.</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-words/">Top K Frequent Words (Med)</a> — same with lexicographic tiebreaker.</li>
    <li><a href="https://leetcode.com/problems/wiggle-sort/">Wiggle Sort (Med)</a> — local fix in one pass.</li>
    <li><a href="https://leetcode.com/problems/find-the-kth-largest-integer-in-the-array/">Find the Kth Largest Integer in the Array (Med)</a> — quickselect with string compare.</li>
  </ul>
</div>
