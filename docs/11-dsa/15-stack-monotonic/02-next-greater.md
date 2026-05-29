# 02 — Next Greater Element

> Monotonic Stack • Position 2/4

## Problem
For every index `i` in an array, find the value of the first index `j > i` with `a[j] > a[i]`, or `-1` if none exists.

## Intuition
Sweep left to right with a stack of **indices whose answers are still unknown**. Keep the stack **monotonically decreasing** by value (top = smallest). When the current value `a[i]` is greater than the value at the stack top, that top index's "next greater" is exactly `a[i]` — pop and record. Continue popping while the order is violated, then push `i`. **Invariant**: every index on the stack has a strictly larger value below it (or no element below) and is still waiting for its next greater. Each index is pushed and popped at most once → O(n) total.

## Algorithm
Single pass, monotonic-decreasing stack of indices.

```python
def next_greater(a):
    n = len(a)
    ans = [-1] * n
    stack = []                           # indices, a[stack] strictly decreasing
    for i, v in enumerate(a):
        while stack and a[stack[-1]] < v:
            ans[stack.pop()] = v
        stack.append(i)
    return ans
```

For a **circular** array (LC 503), loop `i` from 0 to `2n − 1` and index with `i % n`, only pushing on the first pass.

## Walkthrough
Find next greater for `[2, 1, 2, 4, 3, 1]`.

1. `i = 0, v = 2`. Stack empty. Push. `stack = [0]`.
2. `i = 1, v = 1`. `a[0] = 2 ≥ 1`, no pop. Push. `stack = [0, 1]`.
3. `i = 2, v = 2`. `a[1] = 1 < 2` → pop 1, `ans[1] = 2`. `a[0] = 2 ≥ 2`, stop. Push. `stack = [0, 2]`.
4. `i = 3, v = 4`. Pop 2: `ans[2] = 4`. Pop 0: `ans[0] = 4`. Stack empty. Push. `stack = [3]`.
5. `i = 4, v = 3`. `a[3] = 4 ≥ 3`, no pop. Push. `i = 5, v = 1`. `a[4] = 3 ≥ 1`, no pop. Push. End. Stack `[3, 4, 5]` left with `-1` answers. Final: `[4, 2, 4, -1, -1, -1]`.

<div class="dsa-viz" data-algo="next-greater"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- Storing **values** on the stack instead of indices works for "next greater value" but loses position — most variants need indices.
- Using `≤` instead of `<` in the pop test gives "next strictly greater"; many problems want "next greater or equal" — read carefully.
- Forgetting the strict-decreasing invariant — if you allow plateau equal values to stack, you'll over-pop on duplicates.
- For **previous** greater, sweep right-to-left or invert the stack logic.
- The trapping rain water problem (LC 42) is two monotone scans (or one stack) — same toolkit.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/next-greater-element-i/">Next Greater Element I (Easy)</a> — with a lookup array.</li>
    <li><a href="https://leetcode.com/problems/next-greater-element-ii/">Next Greater Element II (Med)</a> — circular array, double pass.</li>
    <li><a href="https://leetcode.com/problems/next-greater-element-iii/">Next Greater Element III (Med)</a> — digit permutation, not stack.</li>
    <li><a href="https://leetcode.com/problems/daily-temperatures/">Daily Temperatures (Med)</a> — record distance instead of value.</li>
    <li><a href="https://leetcode.com/problems/online-stock-span/">Online Stock Span (Med)</a> — previous greater span.</li>
    <li><a href="https://leetcode.com/problems/next-greater-node-in-linked-list/">Next Greater Node In Linked List (Med)</a> — same algo on a list.</li>
    <li><a href="https://leetcode.com/problems/largest-rectangle-in-histogram/">Largest Rectangle in Histogram (Hard)</a> — previous + next smaller.</li>
    <li><a href="https://leetcode.com/problems/maximal-rectangle/">Maximal Rectangle (Hard)</a> — LC 84 per row.</li>
    <li><a href="https://leetcode.com/problems/trapping-rain-water/">Trapping Rain Water (Hard)</a> — monotonic stack of bars.</li>
    <li><a href="https://leetcode.com/problems/sum-of-subarray-minimums/">Sum of Subarray Minimums (Med)</a> — contribution counting with PLE/NLE.</li>
  </ul>
</div>
