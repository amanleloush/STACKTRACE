---
title: Sorting — cheatsheet
---

# Sorting · Cheatsheet

> One-page recall. Print, paste in Notion, glance before the interview.

## Trigger
**You see in the problem:** "sort an array", "Kth smallest/largest" (quickselect partition), "merge two sorted lists", "count inversions", "external sort", "stable order required", "integer keys in a bounded range".

**Reach for this pattern when:**
- You actually need a sorted order — for two-pointer, binary search, greedy.
- You need a custom comparator (objects, tuples) — `sort(key=...)`.
- Keys are bounded integers and you want **O(n)** — counting / radix / bucket.
- Linked list sort — merge sort fits nicely, O(1) extra space.

**Don't reach for it when:**
- You only need the **top K** or **Kth** — partial sort (heap) or quickselect is faster.
- The array is already nearly-sorted — insertion sort beats fancy ones for small/nearly-sorted input.

## Comparison table

| Algorithm     | Time (avg)   | Time (worst) | Space     | Stable | In-place | Notes                                            |
|---------------|--------------|--------------|-----------|--------|----------|--------------------------------------------------|
| **Bubble**    | O(n²)        | O(n²)        | O(1)      | Yes    | Yes      | Educational; never use in practice.              |
| **Insertion** | O(n²)        | O(n²)        | O(1)      | Yes    | Yes      | Great for tiny n or nearly-sorted (~O(n)).       |
| **Selection** | O(n²)        | O(n²)        | O(1)      | No     | Yes      | Minimum swaps (n-1). Otherwise unimpressive.     |
| **Merge**     | O(n log n)   | O(n log n)   | O(n)      | Yes    | No       | Predictable worst-case; preferred for linked lists / external sort. |
| **Quick**     | O(n log n)   | O(n²)        | O(log n)  | No     | Yes      | Fast in practice; pick a good pivot.             |
| **Heap**      | O(n log n)   | O(n log n)   | O(1)      | No     | Yes      | Worst-case bound + in-place; cache-unfriendly.   |
| **Counting**  | O(n + k)     | O(n + k)     | O(n + k)  | Yes    | No       | Only for small-range integers (k = key range).   |
| **Radix**     | O(d·(n + b)) | O(d·(n + b)) | O(n + b)  | Yes    | No       | d = digits, b = base. Integer / fixed-length keys. |
| **Bucket**    | O(n + k)     | O(n²)        | O(n + k)  | Yes*   | No       | Uniform distribution; *stability depends on inner sort. |
| **Timsort**   | O(n log n)   | O(n log n)   | O(n)      | Yes    | No       | Python's / Java's default. Hybrid merge + insertion. |

## The mental model
**Comparison-based sorts** are bounded below by O(n log n) (decision-tree lower bound). To beat it, exploit structure of the keys (counting/radix/bucket — non-comparison). Choose based on: stability needed? In-place required? Worst-case guarantee? Keys are bounded ints?

## Skeleton

```python
# Quicksort (Lomuto partition)
def quicksort(a, lo, hi):
    if lo >= hi: return
    pivot = a[hi]
    i = lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]
    quicksort(a, lo, i - 1)
    quicksort(a, i + 1, hi)

# Mergesort
def mergesort(a):
    if len(a) <= 1: return a
    mid = len(a) // 2
    L, R = mergesort(a[:mid]), mergesort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(L) and j < len(R):
        if L[i] <= R[j]: out.append(L[i]); i += 1
        else:             out.append(R[j]); j += 1
    out.extend(L[i:]); out.extend(R[j:])
    return out

# Counting sort (non-negative ints, range k)
def counting_sort(a, k):
    cnt = [0] * (k + 1)
    for x in a: cnt[x] += 1
    out, idx = [0] * len(a), 0
    for v, c in enumerate(cnt):
        for _ in range(c):
            out[idx] = v; idx += 1
    return out
```

## Complexity
- Comparison sorts: best **O(n log n)** lower bound.
- Counting / radix / bucket: linear in n when key range is bounded.
- Quickselect (for Kth element): **O(n)** average, O(n²) worst.

## Variants in this pattern
1. **Quicksort** — randomize pivot to avoid O(n²); 3-way partition for many duplicates (Dutch flag).
2. **Mergesort** — natural for linked lists (O(1) extra link-rewiring); used in inversion counting.
3. **Heapsort** — when you need O(n log n) worst case + O(1) extra space.
4. **Counting / radix / bucket** — sub-O(n log n) when key range is bounded.
5. **Quickselect** — partition once, recurse into the half containing the Kth; avg O(n).
6. **Hybrid (Timsort)** — what Python/Java use; great for partially-ordered data.

## Top problems
- [LC 912 — Sort an Array](https://leetcode.com/problems/sort-an-array/) (Med) — implement merge or quicksort from scratch.
- [LC 215 — Kth Largest Element](https://leetcode.com/problems/kth-largest-element-in-an-array/) (Med) — quickselect or heap.
- [LC 75 — Sort Colors](https://leetcode.com/problems/sort-colors/) (Med) — Dutch national flag (3-way partition).
- [LC 148 — Sort List](https://leetcode.com/problems/sort-list/) (Med) — merge sort on linked list, O(1) space.
- [LC 493 — Reverse Pairs](https://leetcode.com/problems/reverse-pairs/) (Hard) — modified merge sort to count.
- [LC 274 — H-Index](https://leetcode.com/problems/h-index/) (Med) — counting sort beats comparison sort here.
- [LC 1122 — Relative Sort Array](https://leetcode.com/problems/relative-sort-array/) (Easy) — custom comparator / counting.

## Common bugs / pitfalls
- **Quicksort worst case** on already-sorted input with naïve pivot — randomize or pick median-of-three.
- **Mergesort stability requires `<=`** in the merge step (`if L[i] <= R[j]`); using `<` makes it stable only sometimes.
- **Counting sort on negatives** — shift by `min` so indices are non-negative.
- **Recursion depth** — quicksort with bad pivot blows stack; iterative or random pivot.
- **Stable sort vs unstable** — when a problem says "preserve original order on ties", you must use a stable algorithm (or sort by `(key, original_index)`).
- **In-place ≠ no extra memory** — quicksort uses O(log n) recursion stack on average.
- **Quickselect off-by-one** — partitioning, `k` is 0-indexed; `arr[k]` after partition is the (k+1)-th smallest.

## In 30 seconds
For interview: know quicksort + mergesort cold, know when counting/radix beats O(n log n), and remember Python's `sort` is stable Timsort. For "Kth element", quickselect or heap, not full sort.
