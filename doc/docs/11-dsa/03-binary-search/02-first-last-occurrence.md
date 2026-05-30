# 02 — First / Last Occurrence

> Binary Search • Position 2/6

## Problem
Given a sorted array `arr` with possible duplicates and a target value, return the index of the **first** and **last** occurrence of the target. If the target is absent, return `[-1, -1]`.

## Intuition
Classic binary search returns *some* index that matches — but with duplicates we want a specific boundary. The trick is to bias the search: when `arr[mid] == target`, don't stop — keep narrowing toward the boundary. For the leftmost match, push `hi = mid - 1` even on a hit; for the rightmost, push `lo = mid + 1`. The predicate is no longer "found / not found" — it's `FFFTTT` (or `TTTFFF`) and we're hunting the flip.

## Algorithm
1. Run binary search twice — once biased left, once biased right.
2. For the leftmost: when `arr[mid] >= target`, narrow `hi = mid - 1`; else `lo = mid + 1`. After the loop, check `arr[lo] == target`.
3. For the rightmost: when `arr[mid] <= target`, narrow `lo = mid + 1`; else `hi = mid - 1`. After the loop, `hi` is the rightmost match.

```python
def search_range(arr, target):
    def leftmost():
        lo, hi = 0, len(arr) - 1
        while lo <= hi:
            mid = lo + (hi - lo) // 2
            if arr[mid] >= target:
                hi = mid - 1
            else:
                lo = mid + 1
        return lo if lo < len(arr) and arr[lo] == target else -1

    def rightmost():
        lo, hi = 0, len(arr) - 1
        while lo <= hi:
            mid = lo + (hi - lo) // 2
            if arr[mid] <= target:
                lo = mid + 1
            else:
                hi = mid - 1
        return hi if hi >= 0 and arr[hi] == target else -1

    return [leftmost(), rightmost()]
```

## Walkthrough
On `arr = [1, 2, 2, 2, 3, 4, 5, 5, 5, 6]`, `target = 2`:

1. **Phase 1 — leftmost.** `lo=0, hi=9` → `mid=4`, `arr[4]=3 > 2` → push `hi=3`.
2. `lo=0, hi=3` → `mid=1`, `arr[1]=2 == 2` → record `ans=1`, push `hi=0` to keep looking left.
3. `lo=0, hi=0` → `mid=0`, `arr[0]=1 < 2` → `lo=1`. Loop ends. **First = 1.**
4. **Phase 2 — rightmost.** Mirror sweep records `ans` and pushes `lo` right on each match, landing on `mid=3` last. **Last = 3.**
5. Result: `first=1, last=3` — the run of `2`s spans indices `1..3`.

<div class="dsa-viz" data-algo="first-last-occurrence"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(log n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Don't return `mid` as soon as you find the target — that's the classic-search instinct and it gives you *some* occurrence, not the boundary you want.
- After the loop, validate `arr[lo] == target` (or `arr[hi]`) — the index might land just past the run.
- Bounds-check `lo < len(arr)` and `hi >= 0` before indexing — the boundary can fall off the ends.
- Don't mix the two templates in one function — keep the leftmost and rightmost searches structurally identical except for the `>=` / `<=` flip.
- For "smallest element greater than target" (`bisect_right`), the predicate is `arr[mid] > target`, not `>=`.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/">34. Find First and Last Position (Medium)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/search-insert-position/">35. Search Insert Position (Easy)</a> — leftmost insert point.</li>
    <li><a href="https://leetcode.com/problems/first-bad-version/">278. First Bad Version (Easy)</a> — leftmost true on a `FFFTTT` predicate.</li>
    <li><a href="https://leetcode.com/problems/koko-eating-bananas/">875. Koko Eating Bananas (Medium)</a> — leftmost feasible speed.</li>
    <li><a href="https://leetcode.com/problems/single-element-in-a-sorted-array/">540. Single Element in a Sorted Array (Medium)</a> — parity-based predicate.</li>
    <li><a href="https://leetcode.com/problems/find-k-closest-elements/">658. Find K Closest Elements (Medium)</a> — binary search on the left endpoint.</li>
    <li><a href="https://leetcode.com/problems/find-smallest-letter-greater-than-target/">744. Find Smallest Letter Greater Than Target (Easy)</a> — `bisect_right` on chars.</li>
    <li><a href="https://leetcode.com/problems/kth-missing-positive-number/">1539. Kth Missing Positive Number (Easy)</a> — predicate on missing count.</li>
    <li><a href="https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/">1283. Find the Smallest Divisor (Medium)</a> — leftmost divisor that fits.</li>
    <li><a href="https://leetcode.com/problems/find-peak-element/">162. Find Peak Element (Medium)</a> — boundary search on slope direction.</li>
  </ul>
</div>
