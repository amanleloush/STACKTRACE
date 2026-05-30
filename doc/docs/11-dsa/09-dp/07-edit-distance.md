# 07 — Edit Distance (Levenshtein)

> Dynamic Programming • Position 7/11

## Problem
Given two strings `word1` and `word2`, return the minimum number of single-character operations — insert, delete, or replace — needed to convert `word1` into `word2`.

## Intuition
This is LCS's optimization cousin. Each cell `dp[i][j]` asks: what is the cheapest way to convert the first `i` characters of `word1` into the first `j` characters of `word2`? If the current characters already match, no operation is needed and we inherit `dp[i-1][j-1]`. Otherwise we pay `1` and pick the cheapest of three subproblems — insert (`dp[i][j-1]`), delete (`dp[i-1][j]`), or replace (`dp[i-1][j-1]`). The recurrence is symmetric and works for any pair of strings.

## State & recurrence
- State: `dp[i][j]` = min edits to convert `word1[:i]` into `word2[:j]`.
- Transition: if `word1[i-1] == word2[j-1]` then `dp[i][j] = dp[i-1][j-1]`; else `dp[i][j] = 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])`.
- Base case: `dp[i][0] = i` (delete all of `word1[:i]`), `dp[0][j] = j` (insert all of `word2[:j]`).

## Algorithm
```python
def minDistance(word1: str, word2: str) -> int:
    n, m = len(word1), len(word2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j - 1],  # replace
                    dp[i - 1][j],      # delete
                    dp[i][j - 1],      # insert
                )
    return dp[n][m]
```

## Walkthrough
The widget runs on `a = "HORSE"` → `b = "ROS"`:

1. **Base row & column.** `dp[i][0] = i` (delete all of `a[:i]`) and `dp[0][j] = j` (insert all of `b[:j]`) fill the borders before any character compare runs.
2. **`i=1` ('H').** No match anywhere on row 1. Each cell pays 1 + the min of its three neighbours, producing `[1, 1, 2, 3]`.
3. **`i=2` ('O'), `j=2` ('O').** Characters match → carry the diagonal: `dp[2][2] = dp[1][1] = 1`. Watch the diagonal "read" cell light up while the "current" cell takes its value.
4. **`i=3` ('R'), `j=1` ('R').** Match again → `dp[3][1] = dp[2][0] = 2`. The match cells form the cheap path through the grid.
5. **End.** `dp[5][3] = 3` — three edits transform HORSE into ROS (replace H→R, delete second R, delete E — or any equivalent script).

<div class="dsa-viz" data-algo="edit-distance"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n · m)</strong></span>
  <span>space <strong>O(n · m)</strong></span>
</div>

## Pitfalls
- Forgetting that base cases are *not* zero — they are the lengths of the non-empty prefix.
- Mixing up which neighbor corresponds to which operation (insert, delete, replace) — write a small comment by each `min` argument.
- Trying to roll to one row prematurely — you need `dp[i-1][j-1]` (top-left), so cache it in a scalar before overwriting.
- Penalizing matches accidentally — when characters match, the cost should be `dp[i-1][j-1]`, not `dp[i-1][j-1] + 1`.
- For weighted edit distance (different costs for insert/delete/replace), multiply the recurrence by the appropriate weight; the structure stays the same.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/edit-distance/">72. Edit Distance (Hard)</a> — the canonical Levenshtein.</li>
    <li><a href="https://leetcode.com/problems/delete-operation-for-two-strings/">583. Delete Operation for Two Strings (Medium)</a> — only deletes allowed.</li>
    <li><a href="https://leetcode.com/problems/one-edit-distance/">161. One Edit Distance (Medium)</a> — single-edit check; two-pointer suffices.</li>
    <li><a href="https://leetcode.com/problems/minimum-ascii-delete-sum-for-two-strings/">712. Minimum ASCII Delete Sum (Medium)</a> — weighted variant.</li>
    <li><a href="https://leetcode.com/problems/delete-operation-for-two-strings/">583. Delete Operation (Medium)</a> — practice with LCS framing.</li>
    <li><a href="https://leetcode.com/problems/valid-palindrome-iii/">1216. Valid Palindrome III (Hard)</a> — bounded edit distance to a palindrome.</li>
    <li><a href="https://leetcode.com/problems/minimum-ascii-delete-sum-for-two-strings/">712. Minimum ASCII Delete Sum (Medium)</a> — re-solve with rolling rows.</li>
    <li><a href="https://leetcode.com/problems/palindrome-partitioning-ii/">132. Palindrome Partitioning II (Hard)</a> — different problem, same min-DP flavor.</li>
    <li><a href="https://leetcode.com/problems/interleaving-string/">97. Interleaving String (Medium)</a> — 2D boolean DP on string indices.</li>
    <li><a href="https://leetcode.com/problems/distinct-subsequences/">115. Distinct Subsequences (Hard)</a> — counting variant of the LCS skeleton.</li>
  </ul>
</div>
