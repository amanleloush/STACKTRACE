# 01 — Fibonacci — bottom-up tabulation

> Dynamic Programming • Position 1/11

## Problem
Compute the n-th Fibonacci number where `F(0) = 0`, `F(1) = 1`, and `F(n) = F(n-1) + F(n-2)` for `n ≥ 2`.

## Intuition
The naive recursion `fib(n) = fib(n-1) + fib(n-2)` explodes into an exponential tree because the same subproblems repeat. DP fixes this by computing each `F(i)` exactly once and storing it. Since `F(i)` only ever looks at the two values immediately before it, we don't even need the full table — two scalars suffice. This is the cleanest example of "identify state, write recurrence, roll the array."

## State & recurrence
- State: `dp[i]` = the i-th Fibonacci number.
- Transition: `dp[i] = dp[i-1] + dp[i-2]` for `i ≥ 2`.
- Base case: `dp[0] = 0`, `dp[1] = 1`.

## Algorithm
```python
def fib(n: int) -> int:
    if n < 2:
        return n
    # rolling-2 space: prev2 = F(i-2), prev1 = F(i-1)
    prev2, prev1 = 0, 1
    for _ in range(2, n + 1):
        prev2, prev1 = prev1, prev1 + prev2
    return prev1

# Top-down memoization equivalent:
# from functools import cache
# @cache
# def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)
```

## Walkthrough
For `n = 6`:

1. Start with `prev2 = 0` (F(0)), `prev1 = 1` (F(1)).
2. `i = 2`: new value `1 + 0 = 1`. Shift → `prev2 = 1, prev1 = 1`.
3. `i = 3`: new value `1 + 1 = 2`. Shift → `prev2 = 1, prev1 = 2`.
4. `i = 4`: new value `2 + 1 = 3`. Shift → `prev2 = 2, prev1 = 3`.
5. `i = 5`: new value `3 + 2 = 5`. `i = 6`: new value `5 + 3 = 8`. Return `8`.

<div class="dsa-viz" data-algo="fibonacci-dp"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Forgetting the base cases — `n = 0` and `n = 1` must short-circuit before the loop.
- Off-by-one in the loop range; `range(2, n + 1)` runs exactly `n - 1` iterations to land at `F(n)`.
- Using plain recursion without memoization — exponential time even for `n = 40`.
- Integer overflow in languages with fixed-width ints — Fibonacci grows as φⁿ; for `n > 90` use big integers.
- Confusing 0-indexed and 1-indexed definitions; LeetCode 509 is 0-indexed.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/fibonacci-number/">509. Fibonacci Number (Easy)</a> — the textbook recurrence.</li>
    <li><a href="https://leetcode.com/problems/n-th-tribonacci-number/">1137. N-th Tribonacci Number (Easy)</a> — extend the window to three.</li>
    <li><a href="https://leetcode.com/problems/climbing-stairs/">70. Climbing Stairs (Easy)</a> — same recurrence in disguise.</li>
    <li><a href="https://leetcode.com/problems/min-cost-climbing-stairs/">746. Min Cost Climbing Stairs (Easy)</a> — minimize instead of count.</li>
    <li><a href="https://leetcode.com/problems/house-robber/">198. House Robber (Medium)</a> — pick-or-skip variant.</li>
    <li><a href="https://leetcode.com/problems/house-robber-ii/">213. House Robber II (Medium)</a> — circular array twist.</li>
    <li><a href="https://leetcode.com/problems/decode-ways/">91. Decode Ways (Medium)</a> — two-step recurrence with constraints.</li>
    <li><a href="https://leetcode.com/problems/ugly-number-ii/">264. Ugly Number II (Medium)</a> — three pointers feeding a sequence.</li>
    <li><a href="https://leetcode.com/problems/length-of-longest-fibonacci-subsequence/">873. Length of Longest Fibonacci Subsequence (Medium)</a> — Fibonacci as a pattern in an array.</li>
    <li><a href="https://leetcode.com/problems/longest-arithmetic-subsequence/">1027. Longest Arithmetic Subsequence (Medium)</a> — DP keyed by index and difference.</li>
  </ul>
</div>
