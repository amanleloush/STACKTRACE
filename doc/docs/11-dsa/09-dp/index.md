---
title: Dynamic Programming
---

# DSA · 09 · Dynamic Programming

> Tabulation vs memoization — Fibonacci, knapsack, LIS, LCS, edit distance.

## When to use this pattern

- The problem asks for **min / max / longest / shortest** over a sequence of choices.
- The problem asks to **count the number of ways** to reach a target, partition a set, or arrange items.
- A **yes/no** feasibility question that has *optimal substructure* — the answer for size n is composed from answers for smaller sizes.
- A naive recursion **revisits the same subproblem** many times (overlapping subproblems).
- Greedy fails — local optima do not yield the global optimum, but the search space is still polynomial after deduplication.

## The shape of the solution

Every DP follows the same four moves. **First**, identify the state — the minimal tuple of variables that fully describes a subproblem (e.g. `(i, capacity)` for knapsack, `(i, j)` for two-string DPs). **Second**, write the recurrence — express `dp[state]` in terms of strictly smaller states; this is where the *decision* at each step lives (take / skip, match / replace, jump 1 / jump 2). **Third**, pin down the base case — the smallest state whose answer is trivial (empty string, zero amount, single element). **Fourth**, choose direction: *top-down* memoization mirrors the recurrence and is easy to reason about; *bottom-up* tabulation fills a table in dependency order and is usually faster with less stack risk. Finally, if `dp[i]` only depends on a constant window of previous rows, **roll the table** down to O(1) or O(n) extra space.

## Topics in this section

<div class="topic-grid">
  <a class="topic-card" href="01-fibonacci/">
    <span class="topic-card__num">01</span>
    <h3>Fibonacci</h3>
    <p>The simplest DP — 1D recurrence and rolling-2 space.</p>
  </a>
  <a class="topic-card" href="02-house-robber/">
    <span class="topic-card__num">02</span>
    <h3>House Robber</h3>
    <p>Pick-or-skip with adjacency constraint.</p>
  </a>
  <a class="topic-card" href="03-climbing-stairs/">
    <span class="topic-card__num">03</span>
    <h3>Climbing Stairs</h3>
    <p>Counting ways with a finite step set.</p>
  </a>
  <a class="topic-card" href="04-coin-change/">
    <span class="topic-card__num">04</span>
    <h3>Coin Change</h3>
    <p>Unbounded min-coins for a target amount.</p>
  </a>
  <a class="topic-card" href="05-lis/">
    <span class="topic-card__num">05</span>
    <h3>Longest Increasing Subsequence</h3>
    <p>Patience sorting in O(n log n).</p>
  </a>
  <a class="topic-card" href="06-lcs/">
    <span class="topic-card__num">06</span>
    <h3>Longest Common Subsequence</h3>
    <p>The canonical 2D string DP.</p>
  </a>
  <a class="topic-card" href="07-edit-distance/">
    <span class="topic-card__num">07</span>
    <h3>Edit Distance</h3>
    <p>Levenshtein — insert, delete, replace.</p>
  </a>
  <a class="topic-card" href="08-knapsack-01/">
    <span class="topic-card__num">08</span>
    <h3>0/1 Knapsack</h3>
    <p>Take or skip each item exactly once.</p>
  </a>
  <a class="topic-card" href="09-knapsack-unbounded/">
    <span class="topic-card__num">09</span>
    <h3>Unbounded Knapsack</h3>
    <p>Unlimited copies — loops swap order.</p>
  </a>
  <a class="topic-card" href="10-word-break/">
    <span class="topic-card__num">10</span>
    <h3>Word Break</h3>
    <p>String segmentation against a dictionary.</p>
  </a>
  <a class="topic-card" href="11-palindrome-partitioning/">
    <span class="topic-card__num">11</span>
    <h3>Palindrome Partitioning</h3>
    <p>Min cuts + palindrome interval table.</p>
  </a>
</div>

## DP problem-recognition cheat sheet

- **1D DP** when state is a single index — Fibonacci, House Robber, Climbing Stairs, Coin Change, LIS, Word Break.
- **2D DP** when state involves two pointers or two dimensions — LCS, Edit Distance, knapsack `(i, capacity)`, palindrome interval `dp[i][j]`.
- **Knapsack family** — outer loop choice matters. *0/1*: items outer, capacity inner descending (so each item is used once). *Unbounded*: items outer, capacity inner ascending (reuse allowed). *Combination Sum IV (permutation count)*: capacity outer, items inner.
- **LIS pattern** — when the recurrence is `dp[i] = max(dp[j]+1)` over `j < i` with a predicate; if the predicate is "strictly less", patience sorting gives O(n log n).
- **Counting vs optimizing** — counting uses `+=` over transitions; optimizing uses `min`/`max`. Watch the initial value: 0 for sums, ∞ for min, -∞ for max.
- **Bitmask DP** when `n ≤ 20` and the state is "which subset have I used" — `dp[mask]` with `2^n` states.
- **Interval DP** — `dp[i][j]` depends on a split `k` between `i` and `j`; iterate by increasing length (matrix chain, palindrome partitioning, burst balloons).
- **Space optimization** — if `dp[i]` only uses `dp[i-1]` (and maybe `dp[i-2]`), reduce 1D to two scalars; if a 2D table only uses the previous row, reduce to a 1D rolling array.
