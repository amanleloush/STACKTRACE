# 09 — Unbounded Knapsack

> Dynamic Programming • Position 9/11

## Problem
Given `n` item types with weights `w[i]` and values `v[i]`, and a knapsack of capacity `W`, choose items to maximize total value. Each item type may be used **any number of times** (including zero).

## Intuition
The 0/1 knapsack recurrence flips its loop order to allow reuse. Concretely: when filling `dp[c]`, we are allowed to also use *the same item* that was just considered, because there are infinitely many copies. To express this we sweep capacity **left to right** so `dp[c - w] + v` may already include item `i` itself. The same trick — outer items, inner capacity ascending — also produces Coin Change and Coin Change II.

## State & recurrence
- State: `dp[c]` = max value achievable at capacity `c` (using any number of any item types considered so far).
- Transition: for each item `(w, v)`, for `c` from `w` up to `W`: `dp[c] = max(dp[c], dp[c - w] + v)`.
- Base case: `dp[0] = 0`; all other `dp[c]` start at `0`.

## Algorithm
```python
def unboundedKnapsack(weights: list[int], values: list[int], W: int) -> int:
    dp = [0] * (W + 1)
    for w, v in zip(weights, values):
        # iterate ascending so each item can be reused
        for c in range(w, W + 1):
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[W]

# Equivalent single-loop view:
# for c in 1..W:
#     for (w, v) in items:
#         if c >= w: dp[c] = max(dp[c], dp[c - w] + v)
# Either order works for max/min; for counting permutations vs combinations
# the loop order DOES matter (see Coin Change vs Combination Sum IV).
```

## Walkthrough
The widget runs on `weights = [2, 3, 4]`, `values = [4, 5, 6]`, `W = 8`:

1. **Start.** `dp = [0, 0, 0, 0, 0, 0, 0, 0, 0]`. No items chosen yet.
2. **Item 0 (wt=2, val=4) sweeps left→right.** Because the sweep is ascending, each `dp[c-2]` may already include a copy of item 0 — so `dp[2] = 4`, `dp[4] = dp[2] + 4 = 8`, `dp[6] = 12`, `dp[8] = 16` (four copies of item 0).
3. **Item 1 (wt=3, val=5).** Most cells stay put, but `dp[5] = max(8, dp[2] + 5) = 9` and `dp[7] = max(12, dp[4] + 5) = 13` — mixing item 0 and item 1 beats item 0 alone at odd-ish capacities.
4. **Item 2 (wt=4, val=6).** No update wins: `dp[8] = max(16, dp[4] + 6) = 16`. Item 2's value-per-weight (1.5) loses to item 0's (2.0), so the optimum still stacks item 0.
5. **End.** `dp[8] = 16` — best is **four copies of item 0** (4 × 4 = 16 at total weight 8).

<div class="dsa-viz" data-algo="knapsack-unbounded"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n · W)</strong></span>
  <span>space <strong>O(W)</strong></span>
</div>

## Pitfalls
- **Sweeping descending** like 0/1 knapsack — that disables reuse and silently reverts to 0/1.
- For *Combination Sum IV* (377), the outer loop must be capacity, inner loop coins, to count **permutations**. For *Coin Change II* (518), the outer loop must be coins, inner loop capacity, to count **combinations**.
- Forgetting that ratio-greedy (highest value-per-weight) only solves the *fractional* knapsack — for integer unbounded knapsack you still need DP.
- Items with weight `0` and positive value — infinite answer; reject or handle explicitly.
- Mixing up "min coins" (`min`, sentinel `inf`) with "max value" (`max`, init `0`).

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/coin-change/">322. Coin Change (Medium)</a> — min-coins unbounded knapsack.</li>
    <li><a href="https://leetcode.com/problems/coin-change-ii/">518. Coin Change 2 (Medium)</a> — count combinations.</li>
    <li><a href="https://leetcode.com/problems/combination-sum-iv/">377. Combination Sum IV (Medium)</a> — count permutations (flip loop order).</li>
    <li><a href="https://leetcode.com/problems/perfect-squares/">279. Perfect Squares (Medium)</a> — squares as the "coins".</li>
    <li><a href="https://leetcode.com/problems/minimum-cost-for-tickets/">983. Minimum Cost For Tickets (Medium)</a> — unbounded ticket choices.</li>
    <li><a href="https://leetcode.com/problems/form-largest-integer-with-digits-that-add-up-to-target/">1449. Form Largest Integer With Digits That Add up to Target (Hard)</a> — string-valued knapsack.</li>
    <li><a href="https://leetcode.com/problems/shopping-offers/">638. Shopping Offers (Medium)</a> — bundles as bulk items.</li>
    <li><a href="https://leetcode.com/problems/integer-break/">343. Integer Break (Medium)</a> — partition with multiplicative score.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-refueling-stops/">871. Minimum Number of Refueling Stops (Hard)</a> — knapsack-like DP plus heap.</li>
    <li><a href="https://leetcode.com/problems/jump-game-iii/">1306. Jump Game III (Medium)</a> — reachability flavor (BFS or DP).</li>
  </ul>
</div>
