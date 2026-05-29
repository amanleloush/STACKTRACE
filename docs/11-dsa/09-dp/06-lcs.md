# 06 — Longest Common Subsequence

> Dynamic Programming • Position 6/11

## Problem
Given two strings `s1` and `s2`, return the length of their longest common subsequence — a sequence of characters appearing in both, in order, but not necessarily contiguously.

## Intuition
Look at the last characters of the two prefixes `s1[:i]` and `s2[:j]`. If they match, that character extends an LCS of the shorter prefixes by 1. If they don't match, drop one character from either side and take the better answer. This produces the canonical 2D recurrence — the workhorse of string DP. LCS is also a template: edit distance, distinct subsequences, and palindromic subsequence (LCS of `s` and `reverse(s)`) all reuse this skeleton.

## State & recurrence
- State: `dp[i][j]` = length of LCS of `s1[:i]` and `s2[:j]`.
- Transition: if `s1[i-1] == s2[j-1]` then `dp[i][j] = dp[i-1][j-1] + 1`; otherwise `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.
- Base case: `dp[0][j] = dp[i][0] = 0` (empty prefix matches nothing).

## Algorithm
```python
def longestCommonSubsequence(s1: str, s2: str) -> int:
    n, m = len(s1), len(s2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]

# Space-optimized: only the previous row is needed → O(min(n, m)) space.
```

## Walkthrough
For `s1 = "abcde"`, `s2 = "ace"`:

1. Build `(n+1) × (m+1)` table of zeros.
2. `i = 1` ('a'): matches `s2[0]='a'` → `dp[1][1] = 1`. Carries right: `dp[1][2] = 1`, `dp[1][3] = 1`.
3. `i = 2` ('b'): no matches. Row becomes `0, 1, 1, 1` (inherit from above).
4. `i = 3` ('c'): matches `s2[1]='c'` → `dp[3][2] = dp[2][1] + 1 = 2`. `dp[3][3] = 2`.
5. `i = 4` ('d'): no matches, row stays `0, 1, 2, 2`. `i = 5` ('e'): matches `s2[2]='e'` → `dp[5][3] = dp[4][2] + 1 = 3`. Answer: `3` ("ace").

<div class="dsa-viz" data-algo="lcs"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n · m)</strong></span>
  <span>space <strong>O(n · m)</strong></span>
</div>

## Pitfalls
- Off-by-one between string indices (0-based) and DP indices (1-based) — `s1[i-1]` is the character "ending at" `dp[i]`.
- Confusing *subsequence* (LCS, this problem) with *substring* (a different DP with `dp[i][j] = dp[i-1][j-1] + 1` on match, else `0`).
- Forgetting the mismatch branch — without `max(dp[i-1][j], dp[i][j-1])` you can't extend across gaps.
- Trying to reconstruct the LCS using only one rolling row — you need the full table to backtrack.
- For "longest palindromic subsequence" the trick is `LCS(s, reverse(s))` — easy to overlook.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/longest-common-subsequence/">1143. Longest Common Subsequence (Medium)</a> — the textbook problem.</li>
    <li><a href="https://leetcode.com/problems/uncrossed-lines/">1035. Uncrossed Lines (Medium)</a> — LCS in disguise.</li>
    <li><a href="https://leetcode.com/problems/delete-operation-for-two-strings/">583. Delete Operation for Two Strings (Medium)</a> — answer = n + m - 2 · LCS.</li>
    <li><a href="https://leetcode.com/problems/minimum-ascii-delete-sum-for-two-strings/">712. Minimum ASCII Delete Sum for Two Strings (Medium)</a> — weighted LCS.</li>
    <li><a href="https://leetcode.com/problems/minimum-insertion-steps-to-make-a-string-palindrome/">1312. Minimum Insertion Steps to Make a String Palindrome (Hard)</a> — n - LPS, where LPS = LCS(s, reverse(s)).</li>
    <li><a href="https://leetcode.com/problems/longest-palindromic-subsequence/">516. Longest Palindromic Subsequence (Medium)</a> — LCS(s, reverse(s)) directly.</li>
    <li><a href="https://leetcode.com/problems/edit-distance/">72. Edit Distance (Hard)</a> — extends the LCS table.</li>
    <li><a href="https://leetcode.com/problems/maximum-length-of-repeated-subarray/">718. Maximum Length of Repeated Subarray (Medium)</a> — LCS but for substrings.</li>
    <li><a href="https://leetcode.com/problems/is-subsequence/">392. Is Subsequence (Easy)</a> — two-pointer warm-up.</li>
    <li><a href="https://leetcode.com/problems/distinct-subsequences-ii/">940. Distinct Subsequences II (Hard)</a> — count distinct subsequences with DP.</li>
  </ul>
</div>
