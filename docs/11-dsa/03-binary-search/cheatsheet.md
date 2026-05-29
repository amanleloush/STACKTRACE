---
title: Binary Search — cheatsheet
---

# Binary Search · Cheatsheet

> One-page recall. Print, paste in Notion, glance before the interview.

## Trigger
**You see in the problem:** "sorted array + find X", "first / last occurrence", "smallest value such that condition holds", "rotated sorted array", "minimize the max" / "maximize the min".

**Reach for this pattern when:**
- Input is **sorted** (or partially / rotationally sorted).
- There's a **monotone predicate** `f(x)`: `False, False, ..., True, True` — and you want the boundary.
- Search space is huge (10^9, 10^18) but the **answer space is monotone** → binary search on the answer.

**Don't reach for it when:**
- The array isn't sorted *and* you can't define a monotone predicate.
- You need every occurrence in O(n) — just scan.

## The mental model
Maintain `[lo, hi]` such that the answer lives inside. Each step **halves** the range based on a monotone test at `mid`. Two flavors: (a) find exact value, (b) find the **first** (or last) index where a predicate flips. Get the `lo`/`hi` update rule and the final return right — it's all about the invariant.

## Skeleton

```python
# Classic: find target, return index or -1
def search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: lo = mid + 1
        else: hi = mid - 1
    return -1

# First-true (lower_bound): smallest i with predicate(i) == True
def lower_bound(lo, hi, predicate):
    # Invariant: predicate(hi) is True (or hi is the sentinel one past the last True)
    while lo < hi:
        mid = (lo + hi) // 2
        if predicate(mid): hi = mid
        else:              lo = mid + 1
    return lo  # smallest True index, or hi if none

# Binary search on answer (parametric search)
def min_feasible(lo, hi, feasible):
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid): hi = mid
        else:             lo = mid + 1
    return lo
```

## Complexity
- Time: **O(log n)** (or O(log(answer-range) × check-cost) for parametric).
- Space: **O(1)**.

## Variants in this pattern
1. **Classic search** — exact match in sorted array.
2. **First / last occurrence** — `lower_bound` / `upper_bound`-style boundary search.
3. **Rotated sorted array** — one half is always sorted; pick the side containing target.
4. **Binary search on answer** — answer is monotone in feasibility; search the value space, not the array.
5. **2D matrix search** — flatten or staircase (top-right corner walk).
6. **Median of two sorted arrays** — partition both arrays so left halves combined = right halves.

## Top problems
- [LC 704 — Binary Search](https://leetcode.com/problems/binary-search/) (Easy) — the baseline; nail it cold.
- [LC 34 — First and Last Position](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) (Med) — two `lower_bound` calls.
- [LC 33 — Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/) (Med) — figure out which half is sorted.
- [LC 153 — Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) (Med) — compare mid to hi.
- [LC 875 — Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/) (Med) — binary search on the eating speed.
- [LC 1011 — Capacity to Ship Packages](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) (Med) — minimum capacity such that days ≤ D.
- [LC 4 — Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/) (Hard) — partition the smaller array.

## Common bugs / pitfalls
- **Infinite loop**: `lo = mid` (not `mid + 1`) when range has 2 elements → never shrinks. Use `lo = mid + 1` or `hi = mid` consistently per flavor.
- **Integer overflow**: in Java/C++ use `lo + (hi - lo) // 2`. Python is fine but write it that way for habit.
- **Wrong return value**: classic returns `-1` if not found; `lower_bound` returns the insertion point (could be `n`).
- **Off-by-one on hi**: `hi = len(arr)` (exclusive, for `lower_bound`) vs `hi = len(arr) - 1` (inclusive, for classic). Pick one and stick.
- **Rotated array — equal elements**: with dupes (LC 81), worst case degrades to O(n).
- **Parametric search direction**: when does `feasible(x)` become True — as x grows or shrinks? Sketch the predicate first.

## In 30 seconds
Find the boundary in a monotone array — or the smallest value satisfying a monotone predicate. Pick a flavor (exact / first-true), write the loop, return the right thing.
