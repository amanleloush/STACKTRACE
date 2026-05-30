# 04 — Merge Sort

> Sorting • Position 4/8

## Problem
Sort an array in ascending order with guaranteed O(n log n) time.

## Intuition
Divide the array in half, sort each half recursively, then merge the two sorted halves in linear time. **Invariant**: every recursive call returns a sorted subarray; the merge step assumes both inputs are sorted and produces a sorted output by repeatedly taking the smaller front element. The recursion tree has log n levels each doing O(n) work — hence O(n log n). Merge sort is the canonical example of "divide and conquer" and is the basis of Python's Timsort and Java's `Arrays.sort` for objects.

## Algorithm
Split, recurse, merge into an auxiliary buffer.

```python
def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left  = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    return merge(left, right)

def merge(L, R):
    out, i, j = [], 0, 0
    while i < len(L) and j < len(R):
        if L[i] <= R[j]:                 # <= preserves stability
            out.append(L[i]); i += 1
        else:
            out.append(R[j]); j += 1
    out.extend(L[i:]); out.extend(R[j:])
    return out
```

## Walkthrough
Sort `[38, 27, 43, 3, 9, 82, 10]`.

1. Split into `[38, 27, 43, 3]` and `[9, 82, 10]`.
2. Recurse left: split → `[38, 27]` and `[43, 3]` → both merge to `[27, 38]` and `[3, 43]` → merge to `[3, 27, 38, 43]`.
3. Recurse right: split → `[9]` and `[82, 10]` → right merges to `[10, 82]` → merge to `[9, 10, 82]`.
4. Final merge: walk pointers across `[3, 27, 38, 43]` and `[9, 10, 82]` taking the smaller head each time → `[3, 9, 10, 27, 38, 43, 82]`.
5. Total: 3 levels of recursion, ~7 comparisons per level.

<div class="dsa-viz" data-algo="merge-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log n)</strong></span>
  <span>space <strong>O(n)</strong></span>
  <span>stable? <strong>yes</strong></span>
  <span>in-place? <strong>no</strong></span>
</div>

## Pitfalls
- Allocating new lists at every level is convenient but doubles peak memory — production implementations preallocate one O(n) buffer and ping-pong.
- Using `<` in the merge breaks stability when keys tie — always use `<=` to take from the left first.
- Forgetting the `out.extend(L[i:])` tail copy — one side will have leftovers when the other empties.
- The base case must include `len(a) == 1`, not just `len(a) == 0`.
- For linked lists, merge sort is the right answer because it doesn't need random access — see [Sort List](https://leetcode.com/problems/sort-list/).

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/sort-an-array/">Sort an Array (Med)</a> — implement from scratch.</li>
    <li><a href="https://leetcode.com/problems/sort-list/">Sort List (Med)</a> — merge sort on a linked list.</li>
    <li><a href="https://leetcode.com/problems/merge-sorted-array/">Merge Sorted Array (Easy)</a> — the merge step in isolation.</li>
    <li><a href="https://leetcode.com/problems/merge-k-sorted-lists/">Merge k Sorted Lists (Hard)</a> — k-way merge with a heap or pairwise.</li>
    <li><a href="https://leetcode.com/problems/merge-two-sorted-lists/">Merge Two Sorted Lists (Easy)</a> — linked-list merge.</li>
    <li><a href="https://leetcode.com/problems/count-of-smaller-numbers-after-self/">Count of Smaller Numbers After Self (Hard)</a> — count inversions during merge.</li>
    <li><a href="https://leetcode.com/problems/count-of-range-sum/">Count of Range Sum (Hard)</a> — merge sort on prefix sums.</li>
    <li><a href="https://leetcode.com/problems/reverse-pairs/">Reverse Pairs (Hard)</a> — variant of counting inversions.</li>
    <li><a href="https://leetcode.com/problems/median-of-two-sorted-arrays/">Median of Two Sorted Arrays (Hard)</a> — virtual merge with binary search.</li>
    <li><a href="https://leetcode.com/problems/intersection-of-three-sorted-arrays/">Intersection of Three Sorted Arrays (Easy)</a> — three-pointer merge.</li>
  </ul>
</div>
