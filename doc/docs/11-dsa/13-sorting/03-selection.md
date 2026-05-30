# 03 — Selection Sort

> Sorting • Position 3/8

## Problem
Sort an array in ascending order by repeatedly selecting the smallest remaining element.

## Intuition
On pass `i` you scan the suffix `a[i..n-1]`, find its minimum, and swap it into position `i`. **Invariant**: after pass `i`, `a[0..i]` contains the `i + 1` smallest elements in sorted order, and they are all ≤ every element in the unsorted suffix. Unlike bubble sort it makes at most `n − 1` swaps total — useful when writes are expensive (e.g., flash memory).

## Algorithm
Find min in suffix, swap to front of suffix, repeat.

```python
def selection_sort(a):
    n = len(a)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if a[j] < a[min_idx]:
                min_idx = j
        if min_idx != i:
            a[i], a[min_idx] = a[min_idx], a[i]
```

## Walkthrough
The widget sorts `[29, 10, 14, 37, 13, 25, 8]`:

1. **i = 0.** Scan indices 1..6 for the min. `m` ratchets down: `1 (10)` → ends at `6 (8)`. Swap `a[0] ↔ a[6]` → `[8, 10, 14, 37, 13, 25, 29]`.
2. **i = 1.** Scan suffix `[10, 14, 37, 13, 25, 29]`. The min is already at index 1 (value 10), so `m` never moves and the swap is a no-op.
3. **i = 2.** Scan finds `13` at index 4 (beats `14`). Swap `a[2] ↔ a[4]` → `[8, 10, 13, 37, 14, 25, 29]`.
4. **i = 3.** Scan finds `14` at index 4 (beats `37`). Swap → `[8, 10, 13, 14, 37, 25, 29]`. The sorted prefix grows one element per pass regardless of how scrambled the tail is.
5. **End.** Two more passes finish placing `25` and `29` → `[8, 10, 13, 14, 25, 29, 37]`. Total: 5 swaps (one per pass, minus the no-op).

<div class="dsa-viz" data-algo="selection-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n²)</strong></span>
  <span>space <strong>O(1)</strong></span>
  <span>stable? <strong>no</strong></span>
  <span>in-place? <strong>yes</strong></span>
</div>

## Pitfalls
- **Not stable** — swapping the min into position can leapfrog over an equal key, breaking original order. Example: `[5a, 5b, 3]` becomes `[3, 5b, 5a]`.
- Always O(n²) — even on sorted input, you still scan every suffix to confirm the minimum.
- Forgetting to `if min_idx != i` before swapping is a micro-optimization, not a correctness bug.
- Confusing selection with quickselect — quickselect finds *one* order statistic in O(n) average; selection sort finds *all* of them in O(n²).
- Useful when minimizing writes matters more than minimizing comparisons.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/kth-largest-element-in-an-array/">Kth Largest Element in an Array (Med)</a> — partial selection sort works.</li>
    <li><a href="https://leetcode.com/problems/sort-an-array/">Sort an Array (Med)</a> — benchmark.</li>
    <li><a href="https://leetcode.com/problems/sort-integers-by-the-power-value/">Sort Integers by The Power Value (Med)</a> — compute key, sort.</li>
    <li><a href="https://leetcode.com/problems/sort-integers-by-the-number-of-1-bits/">Sort Integers by The Number of 1 Bits (Easy)</a> — sort by popcount.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-increasing-frequency/">Sort Array by Increasing Frequency (Easy)</a> — frequency comparator.</li>
    <li><a href="https://leetcode.com/problems/sorting-the-sentence/">Sorting the Sentence (Easy)</a> — index-based placement.</li>
    <li><a href="https://leetcode.com/problems/least-number-of-unique-integers-after-k-removals/">Least Number of Unique Integers (Med)</a> — count, sort by frequency.</li>
    <li><a href="https://leetcode.com/problems/array-partition/">Array Partition I (Easy)</a> — sort and sum every other.</li>
    <li><a href="https://leetcode.com/problems/rank-transform-of-an-array/">Rank Transform of an Array (Easy)</a> — sort to assign ranks.</li>
    <li><a href="https://leetcode.com/problems/sort-colors/">Sort Colors (Med)</a> — Dutch flag generalizes selection.</li>
  </ul>
</div>
