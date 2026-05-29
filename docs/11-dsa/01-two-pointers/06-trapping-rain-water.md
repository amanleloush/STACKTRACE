# 06 — Trapping Rain Water

> Two Pointers • 6/6

## Problem
Given an elevation map `h[0..n-1]` (non-negative bar heights), compute how much rainwater is trapped between the bars.

## Intuition
Water above column `i` is `min(maxLeft[i], maxRight[i]) - h[i]`, clamped at zero. A naive solution precomputes the two max arrays in O(n) space. The two-pointer trick avoids that: maintain `leftMax` and `rightMax` as running maxes seen by `l` and `r`. Whichever side is *currently shorter* is the bottleneck — its column's trapped water is fully determined by its own running max (the other side is guaranteed taller). Process that column, advance that pointer, repeat. The invariant: at every step, the shorter side's running max is the *true* min of left/right max for the column we're settling.

## Algorithm
1. `l = 0, r = n - 1, leftMax = rightMax = 0, total = 0`.
2. While `l < r`:
   - If `h[l] < h[r]`:
     - If `h[l] >= leftMax`, update `leftMax = h[l]`. Else add `leftMax - h[l]` to `total`.
     - `l++`.
   - Else (mirror): update `rightMax` or accumulate, then `r--`.
3. Return `total`.

```python
def trap(h):
    l, r = 0, len(h) - 1
    left_max = right_max = total = 0
    while l < r:
        if h[l] < h[r]:
            if h[l] >= left_max:
                left_max = h[l]
            else:
                total += left_max - h[l]
            l += 1
        else:
            if h[r] >= right_max:
                right_max = h[r]
            else:
                total += right_max - h[r]
            r -= 1
    return total
```

## Walkthrough
On `h = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]`:

1. **Start.** `l=0, r=11`, `lmax=rmax=0, water=0`. `h[0]=0 ≤ h[11]=1` → `lmax=0`, add `0`, `l++`.
2. `l=1, r=11`: `h[1]=1 ≤ h[11]=1` → `lmax=1`, add `0`, `l++`.
3. `l=2, r=11`: `h[2]=0 ≤ h[11]=1` → `lmax` stays `1`, add `1 - 0 = 1`, `water=1`, `l++`.
4. The sweep keeps choosing the shorter side, banking water below its running max — e.g. at `l=4` add `1`, at `l=5` add `2`, at `l=6` add `1`, then the right side takes over near `r=8..10` and adds the final units.
5. **End.** Pointers cross with `water = 6` — the answer.

<div class="dsa-viz" data-algo="trapping-rain-water"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Updating `total` before deciding the running max — you'd add negative water at the new max column.
- Tie case `h[l] == h[r]` — either branch is correct; pick one and be consistent.
- Confusing this with **Container With Most Water** — there you pick *two* walls and ignore everything between; here every column traps water based on its surrounding maxes.
- Trying to compute it column-by-column with two `max(...)` calls — that's the brute O(n²); the two-pointer or prefix-max approach beats it.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/trapping-rain-water/">42. Trapping Rain Water (Hard)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/container-with-most-water/">11. Container With Most Water (Medium)</a> — the two-wall cousin.</li>
    <li><a href="https://leetcode.com/problems/best-time-to-buy-and-sell-stock/">121. Best Time to Buy and Sell Stock (Easy)</a> — running min, then sweep — same shape.</li>
    <li><a href="https://leetcode.com/problems/product-of-array-except-self/">238. Product of Array Except Self (Medium)</a> — left and right running products; same prefix/suffix idea.</li>
    <li><a href="https://leetcode.com/problems/maximum-subarray/">53. Maximum Subarray (Medium)</a> — Kadane's algorithm; running max with reset.</li>
    <li><a href="https://leetcode.com/problems/maximum-product-subarray/">152. Maximum Product Subarray (Medium)</a> — running max *and* min because negatives flip.</li>
    <li><a href="https://leetcode.com/problems/maximum-score-of-a-good-subarray/">1793. Maximum Score of a Good Subarray (Hard)</a> — expand outward from a fixed index, two-pointer on min height.</li>
    <li><a href="https://leetcode.com/problems/largest-rectangle-in-histogram/">84. Largest Rectangle in Histogram (Hard)</a> — monotonic stack on heights.</li>
    <li><a href="https://leetcode.com/problems/max-chunks-to-make-sorted-ii/">768. Max Chunks To Make Sorted II (Hard)</a> — prefix-max vs suffix-min boundaries.</li>
    <li><a href="https://leetcode.com/problems/trapping-rain-water-ii/">407. Trapping Rain Water II (Hard)</a> — 2D version with a min-heap from the boundary.</li>
  </ul>
</div>
