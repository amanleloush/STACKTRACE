# 06 — Heap Sort

> Sorting • Position 6/8

## Problem
Sort an array in ascending order in-place with guaranteed O(n log n) time.

## Intuition
Treat the array as a binary max-heap (parent ≥ children), then repeatedly swap the root (the current max) with the last unsorted element and sift the new root down. **Invariant**: after `k` extracts the last `k` slots of the array hold the `k` largest elements in sorted order, and the prefix `a[0..n-k-1]` is still a valid max-heap. Building the initial heap is O(n) — surprisingly tight — and each of the `n − 1` extractions costs O(log n). Heap sort is the only O(n log n) algorithm that's both in-place and worst-case guaranteed.

## Algorithm
Heapify bottom-up, then repeatedly swap-and-sift.

```python
def heap_sort(a):
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):  # build max-heap
        sift_down(a, i, n)
    for end in range(n - 1, 0, -1):      # extract max
        a[0], a[end] = a[end], a[0]
        sift_down(a, 0, end)

def sift_down(a, i, n):
    while True:
        l, r, largest = 2 * i + 1, 2 * i + 2, i
        if l < n and a[l] > a[largest]: largest = l
        if r < n and a[r] > a[largest]: largest = r
        if largest == i: return
        a[i], a[largest] = a[largest], a[i]
        i = largest
```

## Walkthrough
The widget starts with the **already-built max-heap** `[9, 4, 5, 1, 3, 2]` (the build phase is collapsed so the extract loop is the focus):

1. **Extract 9.** Swap `a[0] ↔ a[5]` → `[2, 4, 5, 1, 3, 9]`. The sorted region is now the single tail `[9]`. Sift the new root 2 down: child 5 beats it → swap → `[5, 4, 2, 1, 3, 9]`. Shrink heap to 5.
2. **Extract 5.** Swap `a[0] ↔ a[4]` → `[3, 4, 2, 1, 5, 9]`; sorted tail = `[5, 9]`. Sift 3: child 4 wins → swap → `[4, 3, 2, 1, 5, 9]`. Shrink to 4.
3. **Extract 4.** Swap `a[0] ↔ a[3]` → `[1, 3, 2, 4, 5, 9]`; sorted tail = `[4, 5, 9]`. Sift 1: child 3 wins → swap → `[3, 1, 2, 4, 5, 9]`. Shrink to 3.
4. **Extract 3.** Swap `a[0] ↔ a[2]` → `[2, 1, 3, 4, 5, 9]`. Sift 2 — its only child (`a[1]=1`) is smaller, no swap. Shrink to 2.
5. **End.** One more extract: swap `a[0] ↔ a[1]` → `[1, 2, 3, 4, 5, 9]`. Sorted region covers the whole array.

<div class="dsa-viz" data-algo="heap-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log n)</strong></span>
  <span>space <strong>O(1)</strong></span>
  <span>stable? <strong>no</strong></span>
  <span>in-place? <strong>yes</strong></span>
</div>

## Pitfalls
- Building the heap top-down (siftUp on each element) is O(n log n); building bottom-up (siftDown from `n/2 − 1`) is O(n) — use the latter.
- Mixing up min-heap vs max-heap — for ascending sort you need a **max**-heap.
- Index math: with 0-based arrays, children of `i` are `2i+1` and `2i+2`, parent is `(i-1)//2`. With 1-based arrays, children are `2i` and `2i+1`. Pick one and stick with it.
- Cache locality is poor — heap sort touches non-adjacent indices, which is why it's slower in practice than quicksort despite identical asymptotics.
- Not stable; for a stable O(n log n) in-place sort, you need block merge sort, which is genuinely hard to implement.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/sort-an-array/">Sort an Array (Med)</a> — implement heap sort.</li>
    <li><a href="https://leetcode.com/problems/kth-largest-element-in-an-array/">Kth Largest Element in an Array (Med)</a> — min-heap of size k.</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-elements/">Top K Frequent Elements (Med)</a> — heap on (count, value).</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-words/">Top K Frequent Words (Med)</a> — heap with custom comparator.</li>
    <li><a href="https://leetcode.com/problems/sort-characters-by-frequency/">Sort Characters By Frequency (Med)</a> — max-heap by count.</li>
    <li><a href="https://leetcode.com/problems/k-closest-points-to-origin/">K Closest Points to Origin (Med)</a> — max-heap of size k by distance.</li>
    <li><a href="https://leetcode.com/problems/find-median-from-data-stream/">Find Median from Data Stream (Hard)</a> — two heaps.</li>
    <li><a href="https://leetcode.com/problems/merge-k-sorted-lists/">Merge k Sorted Lists (Hard)</a> — min-heap of list heads.</li>
    <li><a href="https://leetcode.com/problems/ipo/">IPO (Hard)</a> — two heaps for capital and profit.</li>
    <li><a href="https://leetcode.com/problems/minimize-deviation-in-array/">Minimize Deviation in Array (Hard)</a> — max-heap with conditional halving.</li>
  </ul>
</div>
