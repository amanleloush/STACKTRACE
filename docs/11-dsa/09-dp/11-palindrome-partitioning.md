# 11 — Palindrome Partitioning

> Dynamic Programming • Position 11/11

## Problem
Given a string `s`, return the minimum number of cuts needed to partition `s` so that every part is a palindrome. (Variant 131 asks to enumerate all such partitions; 132 asks for the min cuts.)

## Intuition
Two DPs collaborate. First, precompute a Boolean table `pal[i][j]` — is `s[i..j]` a palindrome? — using the interval-expansion recurrence `pal[i][j] = (s[i] == s[j]) and (j - i < 2 or pal[i+1][j-1])`. Second, define `cuts[i]` as the minimum cuts needed for the prefix `s[:i+1]`. For each `i`, try every `j ≤ i` such that `s[j..i]` is a palindrome; that piece costs `cuts[j-1] + 1` cuts (or `0` if `j == 0`). Take the min.

## State & recurrence
- State: `pal[i][j]` ∈ {0, 1} = is `s[i..j]` a palindrome? `cuts[i]` = min cuts for `s[0..i]`.
- Transition: `pal[i][j] = (s[i] == s[j]) and (j - i < 2 or pal[i+1][j-1])`. `cuts[i] = 0` if `pal[0][i]`, else `min(cuts[j-1] + 1)` over all `j ∈ [1, i]` with `pal[j][i]`.
- Base case: `pal[i][i] = True`. `cuts[-1] = -1` (conceptually, no cut needed before the empty prefix).

## Algorithm
```python
def minCut(s: str) -> int:
    n = len(s)
    pal = [[False] * n for _ in range(n)]
    # length-1 and length-2 palindromes
    for i in range(n):
        pal[i][i] = True
    for i in range(n - 1):
        pal[i][i + 1] = s[i] == s[i + 1]
    # longer lengths
    for length in range(3, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            pal[i][j] = (s[i] == s[j]) and pal[i + 1][j - 1]
    # cuts DP
    cuts = [0] * n
    for i in range(n):
        if pal[0][i]:
            cuts[i] = 0
            continue
        best = i  # worst case: cut between every character
        for j in range(1, i + 1):
            if pal[j][i]:
                best = min(best, cuts[j - 1] + 1)
        cuts[i] = best
    return cuts[n - 1]
```

## Walkthrough
The widget runs on `s = "aabbcc"`:

1. **i = 0.** Start with worst `cuts[0] = 0`. `j = 0`: "a" is a palindrome → cand = 0 → `cuts[0] = 0`.
2. **i = 1.** Worst `cuts[1] = 1`. `j = 0`: "aa" is a palindrome → cand = 0 → `cuts[1] = 0`. The whole prefix is already a palindrome, no cut needed.
3. **i = 2.** Worst `cuts[2] = 2`. "aab" and "ab" are not palindromes. `j = 2`: "b" is → cand = `cuts[1] + 1 = 1` → `cuts[2] = 1` (cut "aa" | "b").
4. **i = 3.** `j = 2`: "bb" is a palindrome → cand = `cuts[1] + 1 = 1` → `cuts[3] = 1` (cut "aa" | "bb"). The single-cut budget holds even as the prefix doubles.
5. **End — i = 5.** `j = 4`: "cc" palindrome → cand = `cuts[3] + 1 = 2` → `cuts[5] = 2`. Minimum cuts = **2** (`"aa" | "bb" | "cc"`).

<div class="dsa-viz" data-algo="palindrome-partitioning"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n²)</strong></span>
  <span>space <strong>O(n²)</strong></span>
</div>

## Pitfalls
- Building `pal` in the wrong order — you must fill shorter intervals before longer ones, because `pal[i][j]` depends on `pal[i+1][j-1]`.
- Forgetting the length-2 base (`s[i] == s[i+1]`) — without it, `pal[i+1][j-1]` for `j = i + 1` reads an uninitialized cell.
- Confusing 131 (enumerate all partitions, classic backtracking with palindrome check) with 132 (min cuts, two-DP solution).
- Forgetting to short-circuit `cuts[i] = 0` when the whole prefix is already a palindrome.
- Using Manacher's algorithm prematurely — the O(n²) DP is plenty fast for typical constraints and far easier to write correctly.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/palindrome-partitioning/">131. Palindrome Partitioning (Medium)</a> — enumerate all partitions via backtracking + palindrome check.</li>
    <li><a href="https://leetcode.com/problems/palindrome-partitioning-ii/">132. Palindrome Partitioning II (Hard)</a> — the canonical min-cuts DP.</li>
    <li><a href="https://leetcode.com/problems/palindrome-partitioning-iii/">1278. Palindrome Partitioning III (Hard)</a> — exactly k parts, with character-change cost.</li>
    <li><a href="https://leetcode.com/problems/palindrome-partitioning-iv/">1745. Palindrome Partitioning IV (Hard)</a> — split into exactly three palindromes.</li>
    <li><a href="https://leetcode.com/problems/longest-palindromic-substring/">5. Longest Palindromic Substring (Medium)</a> — reuses the `pal[i][j]` table.</li>
    <li><a href="https://leetcode.com/problems/palindromic-substrings/">647. Palindromic Substrings (Medium)</a> — count all palindromic substrings.</li>
    <li><a href="https://leetcode.com/problems/longest-palindromic-subsequence/">516. Longest Palindromic Subsequence (Medium)</a> — interval DP on subsequences.</li>
    <li><a href="https://leetcode.com/problems/minimum-insertion-steps-to-make-a-string-palindrome/">1312. Minimum Insertion Steps to Make a String Palindrome (Hard)</a> — n - LPS.</li>
    <li><a href="https://leetcode.com/problems/maximize-palindrome-length-from-subsequences/">1771. Maximize Palindrome Length From Subsequences (Hard)</a> — palindrome over a concatenation.</li>
    <li><a href="https://leetcode.com/problems/count-different-palindromic-subsequences/">730. Count Different Palindromic Subsequences (Hard)</a> — distinct palindromic subsequences modulo prime.</li>
  </ul>
</div>
