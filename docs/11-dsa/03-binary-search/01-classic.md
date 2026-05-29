# 01 — Classic Binary Search

> Binary Search • Position 1/6

## Problem
Given a sorted array `arr` and a target value, return the index of the target or `-1` if it's not present.

## Intuition
Because the array is sorted, comparing the target to the middle element tells you which half can be safely discarded. Each step halves the search range, so after at most `⌈log₂ n⌉` probes you've either found the target or proven it isn't there. The invariant is simple: if `target` exists, it lives in `[lo, hi]`.

## Algorithm
1. Initialize `lo = 0`, `hi = n - 1`.
2. While `lo <= hi`:
   - Compute `mid = lo + (hi - lo) // 2`.
   - If `arr[mid] == target`, return `mid`.
   - If `arr[mid] < target`, move `lo = mid + 1`.
   - Else move `hi = mid - 1`.
3. If the loop exits, return `-1`.

```python
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

## Walkthrough
On `arr = [-1, 0, 3, 5, 9, 12]`, `target = 9`:

1. `lo=0, hi=5` → `mid=2`, `arr[2]=3 < 9` → discard left half, `lo=3`.
2. `lo=3, hi=5` → `mid=4`, `arr[4]=9 == 9` → return `4`.

Two probes against six elements — exactly `⌈log₂ 6⌉ = 3` upper bound.

<div class="dsa-viz" data-algo="binary-search"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(log n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Using `(lo + hi) // 2` in languages with fixed-width ints risks overflow — prefer `lo + (hi - lo) // 2`.
- Mixing up `lo <= hi` with `hi = mid` causes infinite loops. Stick to one template.
- Forgetting to return `-1` when the loop exits — easy to fall off the function.
- Assuming the array is sorted when the problem only says "given an array". Re-read the constraints.
- Off-by-one on `hi`: it should be `n - 1` for an inclusive upper bound, not `n`.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/binary-search/">704. Binary Search (Easy)</a> — the literal template.</li>
    <li><a href="https://leetcode.com/problems/search-insert-position/">35. Search Insert Position (Easy)</a> — return `lo` instead of `-1`.</li>
    <li><a href="https://leetcode.com/problems/guess-number-higher-or-lower/">374. Guess Number Higher or Lower (Easy)</a> — predicate is the API itself.</li>
    <li><a href="https://leetcode.com/problems/valid-perfect-square/">367. Valid Perfect Square (Easy)</a> — search over `[1, n]` for `mid*mid == n`.</li>
    <li><a href="https://leetcode.com/problems/sqrtx/">69. Sqrt(x) (Easy)</a> — same trick, return floor.</li>
    <li><a href="https://leetcode.com/problems/first-bad-version/">278. First Bad Version (Easy)</a> — leftmost true on a `FFFTTT` predicate.</li>
    <li><a href="https://leetcode.com/problems/koko-eating-bananas/">875. Koko Eating Bananas (Medium)</a> — search on the eating speed.</li>
    <li><a href="https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/">1011. Capacity To Ship Packages (Medium)</a> — search on capacity.</li>
    <li><a href="https://leetcode.com/problems/split-array-largest-sum/">410. Split Array Largest Sum (Hard)</a> — search on the largest subarray sum.</li>
    <li><a href="https://leetcode.com/problems/maximum-candies-allocated-to-k-children/">2226. Maximum Candies Allocated (Medium)</a> — search on candies per child.</li>
  </ul>
</div>
