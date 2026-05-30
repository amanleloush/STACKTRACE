# 04 — Container With Most Water

> Two Pointers • 4/6

## Problem
Given heights `h[0..n-1]` (vertical lines on the x-axis), pick two lines that together with the x-axis form a container. Return the maximum amount of water it can hold.

## Intuition
Area between `l` and `r` is `min(h[l], h[r]) * (r - l)`. Start at the widest pair `(0, n-1)`. The width can only shrink, so the only way to win is to find a strictly taller minimum height. Moving the **taller** side inward can never raise `min(h[l], h[r])` past its current shorter side — the new min is still capped by the shorter wall. So always move the **shorter** side; that's the only move that can possibly improve the answer. The invariant is that every pair we've skipped is dominated by a pair we've already evaluated.

## Algorithm
1. Set `l = 0`, `r = n - 1`, `best = 0`.
2. While `l < r`:
   - Compute `area = min(h[l], h[r]) * (r - l)`. Update `best`.
   - If `h[l] < h[r]`, advance `l`. Else retreat `r`.
3. Return `best`.

```python
def max_area(h):
    l, r, best = 0, len(h) - 1, 0
    while l < r:
        area = min(h[l], h[r]) * (r - l)
        best = max(best, area)
        if h[l] < h[r]:
            l += 1
        else:
            r -= 1
    return best
```

## Walkthrough
On `h = [1, 8, 6, 2, 5, 4, 8, 3, 7]`:

- Step 1 — `l=0, r=8`: `min(1, 7) * 8 = 8`. `h[l]=1 < 7`, so `l++`.
- Step 2 — `l=1, r=8`: `min(8, 7) * 7 = 49`. `h[l]=8 >= 7`, so `r--`.
- Step 3 — `l=1, r=7`: `min(8, 3) * 6 = 18`. `h[r]=3 < 8`, so `r--`.
- Step 4 — `l=1, r=6`: `min(8, 8) * 5 = 40`. Tie — by convention move `r`, so `r--`.
- After full sweep, `best = 49`.

<div class="dsa-viz" data-algo="container-most-water"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Moving the **taller** side instead of the shorter — you'd skip the optimal pair.
- When `h[l] == h[r]`, either move is safe; pick a convention and stick with it.
- Confusing this with **Trapping Rain Water** — that one sums water across every column, not the area between two chosen walls.
- Brute force is O(n²); state that out loud, then derive the linear two-pointer.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/container-with-most-water/">11. Container With Most Water (Medium)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/maximum-width-ramp/">962. Maximum Width Ramp (Medium)</a> — monotonic stack of decreasing heights, then walk from the right.</li>
    <li><a href="https://leetcode.com/problems/longest-mountain-in-array/">845. Longest Mountain in Array (Medium)</a> — expand around each peak.</li>
    <li><a href="https://leetcode.com/problems/shortest-unsorted-continuous-subarray/">581. Shortest Unsorted Continuous Subarray (Medium)</a> — two-pointer sweep to find the disorder boundary.</li>
    <li><a href="https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/">1011. Capacity To Ship Packages Within D Days (Medium)</a> — binary search on the answer (capacity).</li>
    <li><a href="https://leetcode.com/problems/frequency-of-the-most-frequent-element/">1838. Frequency of the Most Frequent Element (Medium)</a> — sort, then sliding window with operation budget.</li>
    <li><a href="https://leetcode.com/problems/maximum-product-subarray/">152. Maximum Product Subarray (Medium)</a> — track running max and min; not two-pointer but the "shorter side wins" intuition reappears.</li>
    <li><a href="https://leetcode.com/problems/largest-rectangle-in-histogram/">84. Largest Rectangle in Histogram (Hard)</a> — monotonic stack; same area-maximization flavour.</li>
    <li><a href="https://leetcode.com/problems/trapping-rain-water/">42. Trapping Rain Water (Hard)</a> — the two-pointer cousin, summing instead of maximizing.</li>
    <li><a href="https://leetcode.com/problems/trapping-rain-water-ii/">407. Trapping Rain Water II (Hard)</a> — 2D version with a min-heap.</li>
  </ul>
</div>
