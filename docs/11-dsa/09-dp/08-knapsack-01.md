# 08 — 0/1 Knapsack

> Dynamic Programming • Position 8/11

## Problem
Given `n` items with weights `w[i]` and values `v[i]`, and a knapsack of capacity `W`, choose a subset of items to maximize total value subject to the weight limit. Each item may be picked **at most once**.

## Intuition
At item `i` you either **take** it (adding its value, spending its weight) or **skip** it. The full table `dp[i][c]` records the best value using only the first `i` items at capacity `c`. The decision is a max over those two branches. Because each item is considered once, the 1D space-optimized version must sweep capacity **right to left** — that prevents the same item from being counted twice (which would silently turn it into unbounded knapsack).

## State & recurrence
- State: `dp[c]` = max value achievable with capacity `c` after processing the items considered so far.
- Transition: for each item `(w, v)`, for `c` from `W` down to `w`: `dp[c] = max(dp[c], dp[c - w] + v)`.
- Base case: `dp[c] = 0` for all `c` before any item is processed.

## Algorithm
```python
def knapsack01(weights: list[int], values: list[int], W: int) -> int:
    dp = [0] * (W + 1)
    for w, v in zip(weights, values):
        # iterate descending so each item is used at most once
        for c in range(W, w - 1, -1):
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[W]

# 2D version (clearer but heavier):
# dp = [[0] * (W + 1) for _ in range(n + 1)]
# for i in 1..n, for c in 0..W:
#     dp[i][c] = dp[i-1][c]
#     if c >= w[i-1]:
#         dp[i][c] = max(dp[i][c], dp[i-1][c - w[i-1]] + v[i-1])
```

## Walkthrough
For `weights = [2, 3, 4, 5]`, `values = [3, 4, 5, 6]`, `W = 5`:

1. Start with `dp = [0, 0, 0, 0, 0, 0]`.
2. Item (2, 3): descending `c = 5..2` → `dp[5] = max(0, dp[3] + 3) = 3`, `dp[4] = 3`, `dp[3] = 3`, `dp[2] = 3`.
3. Item (3, 4): `dp[5] = max(3, dp[2] + 4) = 7` (items 1 and 2). `dp[4] = max(3, dp[1] + 4) = 4`. `dp[3] = 4`.
4. Item (4, 5): `dp[5] = max(7, dp[1] + 5) = 7`. `dp[4] = max(4, dp[0] + 5) = 5`.
5. Item (5, 6): `dp[5] = max(7, dp[0] + 6) = 7`. Final answer: `7` (take items with weights 2 and 3).

<div class="dsa-viz" data-algo="knapsack-01"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n · W)</strong></span>
  <span>space <strong>O(W)</strong></span>
</div>

## Pitfalls
- **Sweeping capacity ascending** with the 1D array — this lets the same item be reused, silently solving unbounded knapsack.
- Forgetting `W` is *pseudo-polynomial* in input size — exponential in the bit-length of `W` (NP-hard in the strong sense).
- Mixing `weights` and `values` indices — keep a single `(w, v)` tuple iterator.
- Adding items with weight `0` — they should always be taken, but the descending sweep `range(W, -1, -1)` still works; just be careful with the lower bound.
- Trying to recover the chosen items from the 1D array — you need the full 2D table to backtrack.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/partition-equal-subset-sum/">416. Partition Equal Subset Sum (Medium)</a> — boolean knapsack with target = sum/2.</li>
    <li><a href="https://leetcode.com/problems/target-sum/">494. Target Sum (Medium)</a> — convert to subset-sum.</li>
    <li><a href="https://leetcode.com/problems/profitable-schemes/">879. Profitable Schemes (Hard)</a> — two-dimension knapsack (people + profit).</li>
    <li><a href="https://leetcode.com/problems/ones-and-zeroes/">474. Ones and Zeroes (Medium)</a> — capacity is a pair (m, n).</li>
    <li><a href="https://leetcode.com/problems/last-stone-weight-ii/">1049. Last Stone Weight II (Medium)</a> — minimize |sum1 - sum2| via knapsack.</li>
    <li><a href="https://leetcode.com/problems/tallest-billboard/">956. Tallest Billboard (Hard)</a> — DP keyed on signed difference.</li>
    <li><a href="https://leetcode.com/problems/toss-strange-coins/">1230. Toss Strange Coins (Medium)</a> — probabilistic knapsack.</li>
    <li><a href="https://leetcode.com/problems/painting-the-walls/">2742. Painting the Walls (Hard)</a> — knapsack with "free workers" reframing.</li>
    <li><a href="https://leetcode.com/problems/minimize-the-difference-between-target-and-chosen-elements/">1981. Minimize the Difference Between Target and Chosen Elements (Medium)</a> — set-based knapsack.</li>
    <li><a href="https://leetcode.com/problems/maximum-profit-in-job-scheduling/">1235. Maximum Profit in Job Scheduling (Hard)</a> — weighted interval scheduling, knapsack-like DP.</li>
  </ul>
</div>
