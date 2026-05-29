# 03 — Climbing Stairs

> Dynamic Programming • Position 3/11

## Problem
You are climbing a staircase with `n` steps. Each move you may climb 1 or 2 steps. Return the number of distinct ways to reach the top.

## Intuition
To land on step `n` your last move came from step `n-1` (a single step) or step `n-2` (a double step). The number of ways to reach `n` is therefore the sum of the ways to reach the two preceding steps — exactly the Fibonacci recurrence. The key reframing is *counting paths* rather than *optimizing a value*, which is why the transition uses `+=` instead of `max`.

## State & recurrence
- State: `dp[i]` = number of distinct ways to reach step `i`.
- Transition: `dp[i] = dp[i-1] + dp[i-2]`.
- Base case: `dp[0] = 1` (one way to be at the start — do nothing), `dp[1] = 1`.

## Algorithm
```python
def climbStairs(n: int) -> int:
    if n <= 1:
        return 1
    prev2, prev1 = 1, 1  # dp[0], dp[1]
    for _ in range(2, n + 1):
        prev2, prev1 = prev1, prev1 + prev2
    return prev1

# Generalization: if step sizes come from a set S,
# dp[i] = sum(dp[i - s] for s in S if i - s >= 0)
```

## Walkthrough
The widget runs on `n = 8`:

1. **Bases.** `dp[0] = dp[1] = 1` light up. Each later cell will read its two left neighbours.
2. **i = 2.** `dp[2] = dp[1] + dp[0] = 1 + 1 = 2` (sequences `1+1` and `2`).
3. **i = 3, 4.** `dp[3] = 2 + 1 = 3`, then `dp[4] = 3 + 2 = 5` — the classic Fibonacci ladder.
4. **i = 6.** `dp[6] = dp[5] + dp[4] = 8 + 5 = 13` — watch the two "read" cells highlight while `dp[6]` becomes the "current" cell.
5. **End.** `dp[8] = dp[7] + dp[6] = 21 + 13 = 34` — there are **34** distinct ways to climb 8 stairs.

<div class="dsa-viz" data-algo="climbing-stairs"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Defining `dp[0]` as `0` — it must be `1` for the counting to work (the empty sequence is one way).
- Forgetting that `1+2` and `2+1` count as distinct sequences (order matters here).
- Confusing this with the *minimum cost* variant (746) which uses `min` and includes a per-step cost.
- Going recursive without memoization — exponential blow-up just like Fibonacci.
- For larger step sets (e.g. `{1, 2, 3}` in Tribonacci), the window grows; widen the rolling buffer accordingly.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/climbing-stairs/">70. Climbing Stairs (Easy)</a> — the original.</li>
    <li><a href="https://leetcode.com/problems/min-cost-climbing-stairs/">746. Min Cost Climbing Stairs (Easy)</a> — optimize instead of count.</li>
    <li><a href="https://leetcode.com/problems/n-th-tribonacci-number/">1137. N-th Tribonacci Number (Easy)</a> — three-step window.</li>
    <li><a href="https://leetcode.com/problems/fibonacci-number/">509. Fibonacci Number (Easy)</a> — the underlying recurrence.</li>
    <li><a href="https://leetcode.com/problems/decode-ways/">91. Decode Ways (Medium)</a> — same shape, but transitions are conditional.</li>
    <li><a href="https://leetcode.com/problems/unique-paths/">62. Unique Paths (Medium)</a> — 2D extension of path counting.</li>
    <li><a href="https://leetcode.com/problems/unique-paths-ii/">63. Unique Paths II (Medium)</a> — with obstacles.</li>
    <li><a href="https://leetcode.com/problems/minimum-path-sum/">64. Minimum Path Sum (Medium)</a> — 2D optimization variant.</li>
    <li><a href="https://leetcode.com/problems/house-robber/">198. House Robber (Medium)</a> — different objective, identical state shape.</li>
    <li><a href="https://leetcode.com/problems/house-robber-ii/">213. House Robber II (Medium)</a> — circular variant.</li>
  </ul>
</div>
