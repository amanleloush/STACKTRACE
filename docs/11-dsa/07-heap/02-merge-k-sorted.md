# 02 — Merge K Sorted Lists

> Heap / Priority Queue • Position 2/5

## Problem
Merge K sorted linked lists (or arrays) into one sorted output.

## Intuition
At any moment, the next element of the merged output must be the smallest among the **current heads** of all K lists. A min-heap of those K heads gives the next element in O(log K), and after popping we push the popped head's successor. The invariant: **the heap always contains at most one live pointer per list, namely the smallest unmerged element of that list.**

## Algorithm
Seed the heap with `(value, list_index, node)` for every non-empty head. Loop: pop the smallest, append it to the result, and if the popped node has a successor, push that successor. Stop when the heap is empty.

```python
import heapq

def merge_k_sorted(lists):
    heap, out = [], []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst[0], i, 0))  # (val, list_idx, pos)
    while heap:
        val, i, j = heapq.heappop(heap)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out
```

## Walkthrough
Example: `lists = [[1, 4, 7], [2, 5, 8], [3, 6, 9]]`.

1. **Seed.** Push each list's head into a min-heap of `(val, list_idx, pos)`: heap = `[(1, L0, 0), (2, L1, 0), (3, L2, 0)]`, output empty.
2. **Pop 1, push 4.** Pop root `(1, L0, 0)` → `out = [1]`. List 0 has a successor → push `(4, L0, 1)`. Heap = `[(2, L1, 0), (3, L2, 0), (4, L0, 1)]`.
3. **Pop 2, push 5.** Root is `(2, L1, 0)` → `out = [1, 2]`, push `(5, L1, 1)`. Heap = `[(3, L2, 0), (4, L0, 1), (5, L1, 1)]`.
4. **Keep popping the next-smallest.** Repeating the pop-then-push step gives `out = [1, 2, 3, 4, 5, 6, 7, 8, 9]`. Each list's pointer advances exactly when its head was the latest pop.
5. **End.** Heap drains to empty after all 9 values are emitted; output is the fully merged sorted list.

<div class="dsa-viz" data-algo="merge-k-sorted"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(N log K)</strong></span>
  <span>space <strong>O(K)</strong></span>
</div>

Where N is the total number of elements across all K lists.

## Pitfalls
- **Tuples must be comparable** — for linked-list nodes, include a tiebreaker like the list index so Python doesn't try to compare nodes.
- **Don't reseed** — only push the *successor* of the popped element, not all heads on every iteration.
- **Pairwise merge** is O(N log K) too but uses O(1) extra space — prefer it when memory matters.
- **Empty input lists** — skip them at seed time or guard inside the loop.
- For **streaming** K-way merge (infinite lists), generators + heap let you yield lazily.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/merge-k-sorted-lists/">23 Merge k Sorted Lists (Hard)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/merge-two-sorted-lists/">21 Merge Two Sorted Lists (Easy)</a> — the K=2 base case, no heap needed.</li>
    <li><a href="https://leetcode.com/problems/merge-sorted-array/">88 Merge Sorted Array (Easy)</a> — in-place pointer variant.</li>
    <li><a href="https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/">378 Kth Smallest in Sorted Matrix (Med)</a> — rows act as sorted lists.</li>
    <li><a href="https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/">632 Smallest Range Covering Elements from K Lists (Hard)</a> — heap + sliding max.</li>
    <li><a href="https://leetcode.com/problems/find-median-from-data-stream/">295 Find Median from Data Stream (Hard)</a> — two-heap pattern.</li>
    <li><a href="https://leetcode.com/problems/find-k-pairs-with-smallest-sums/">373 Find K Pairs with Smallest Sums (Med)</a> — heap over pairs (i, j).</li>
    <li><a href="https://leetcode.com/problems/minimize-deviation-in-array/">1675 Minimize Deviation in Array (Hard)</a> — heap of transformable max values.</li>
    <li><a href="https://leetcode.com/problems/maximum-number-of-weeks-for-which-you-can-work/">1953 Maximum Number of Weeks for Which You Can Work (Med)</a> — scheduling with priority.</li>
    <li><a href="https://leetcode.com/problems/process-tasks-using-servers/">1882 Process Tasks Using Servers (Med)</a> — two heaps: free and busy servers.</li>
  </ul>
</div>
