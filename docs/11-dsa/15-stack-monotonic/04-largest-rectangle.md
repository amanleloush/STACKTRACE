# 04 — Largest Rectangle in Histogram

> Monotonic Stack • Position 4/4

## Problem
Given heights of adjacent bars in a histogram, return the area of the largest axis-aligned rectangle that fits inside.

## Intuition
The optimal rectangle's height is some bar `a[k]`; its width spans from the **nearest smaller bar on the left of `k`** to the **nearest smaller bar on the right of `k`**, exclusive. If we can compute, for every `k`, those two boundaries in O(n), we just take the max of `a[k] · (right − left − 1)`. A monotone **increasing** stack of indices does exactly that: when a new bar shorter than the top arrives, the top has its right boundary (the new index) and its left boundary (the new stack top after pop). **Invariant**: indices on the stack form a strictly increasing sequence of bar heights. Pushing a sentinel `0` at the end forces every remaining stacked bar to be resolved.

## Algorithm
Monotone increasing stack of indices + sentinel.

```python
def largest_rectangle(heights):
    stack = []                           # strictly increasing heights[stack]
    best = 0
    heights = heights + [0]              # sentinel forces final flush
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            top = stack.pop()
            left = stack[-1] if stack else -1
            width = i - left - 1
            best = max(best, heights[top] * width)
        stack.append(i)
    return best
```

## Walkthrough
The widget runs on heights `[2, 1, 5, 6, 2, 3]` with a virtual sentinel `0` at index 6:

1. **i = 0, 1.** Push `0` (height 2). At `i = 1` height 1 is smaller → pop `0`: width = `1`, area = **2**. Push `1`. Stack = `[1]`.
2. **i = 2, 3.** Heights 5 and 6 are strictly larger than the top → push both. Stack = `[1, 2, 3]`, bars 5 and 6 form the highlighted "window".
3. **i = 4 (height 2) — the big payoff.** Pop `3` (height 6): width = `4 - 2 - 1 = 1`, area = 6, best = 6. Pop `2` (height 5): width = `4 - 1 - 1 = 2`, area = **10**, best = 10 — watch the dashed green overlay span bars 2–3. Push `4`.
4. **i = 5 (3 > 2).** Push directly. Stack = `[1, 4, 5]`.
5. **End — sentinel at i = 6.** Pop `5` (h=3, w=1, area=3); pop `4` (h=2, w = `6 - 1 - 1 = 4`, area=8); pop `1` (h=1, w = `6 - (-1) - 1 = 6`, area=6). None beats 10, so **best = 10**.

<div class="dsa-viz" data-algo="largest-rectangle"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- Missing the sentinel `0` at the end — bars left on the stack never get their width computed.
- Width formula off-by-one — it's `i − left − 1`, where `left` is the *index of the previous smaller bar* (or `-1`).
- Stacking **values** instead of **indices** — you need positions to compute width.
- Using `≥` instead of `>` for pop: equal heights are fine to keep stacked; popping them adds work and tiny correctness traps.
- LC 85 (Maximal Rectangle of 0/1 matrix) is this algorithm run per row over cumulative heights — once you have LC 84, LC 85 is a one-screen extension.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/largest-rectangle-in-histogram/">Largest Rectangle in Histogram (Hard)</a> — canonical.</li>
    <li><a href="https://leetcode.com/problems/maximal-rectangle/">Maximal Rectangle (Hard)</a> — LC 84 per row.</li>
    <li><a href="https://leetcode.com/problems/trapping-rain-water/">Trapping Rain Water (Hard)</a> — companion stack pattern.</li>
    <li><a href="https://leetcode.com/problems/sum-of-subarray-minimums/">Sum of Subarray Minimums (Med)</a> — contribution × span.</li>
    <li><a href="https://leetcode.com/problems/count-submatrices-with-all-ones/">Count Submatrices With All Ones (Med)</a> — per-row histograms.</li>
    <li><a href="https://leetcode.com/problems/maximal-square/">Maximal Square (Med)</a> — DP version of the same idea.</li>
    <li><a href="https://leetcode.com/problems/range-sum-query-2d-immutable/">Range Sum Query 2D Immutable (Med)</a> — prefix-sum primitive used in matrix variants.</li>
    <li><a href="https://leetcode.com/problems/maximum-score-of-a-good-subarray/">Maximum Score of a Good Subarray (Hard)</a> — extend left/right under a constraint.</li>
    <li><a href="https://leetcode.com/problems/maximum-subarray-min-product/">Maximum Subarray Min-Product (Med)</a> — min × prefix-sum span, stack-based.</li>
    <li><a href="https://leetcode.com/problems/max-chunks-to-make-sorted/">Max Chunks To Make Sorted (Med)</a> — monotone stack of chunk maxes.</li>
  </ul>
</div>
