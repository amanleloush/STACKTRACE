# 02 — Longest substring without repeating characters

> Sliding Window • 2/5

## Problem
Given a string `s`, return the length of the longest substring with **all distinct characters**.

## Intuition
Maintain a window `[l, r]` that always contains distinct characters. Extend by adding `s[r]`. If `s[r]` is already inside (we've seen it at index `last`), the leftmost we can keep `l` is `last + 1`. Use a hash map `last_seen` so this lookup is O(1). The invariant: `s[l..r]` is always a substring with no repeats, and `r - l + 1` is its length. Each index is added once and `l` only moves right, so the sweep is O(n).

## Algorithm
1. `last_seen = {}`, `l = 0`, `best = 0`.
2. For `r` in 0..n-1:
   - If `s[r]` is in `last_seen` and `last_seen[s[r]] >= l`, jump `l = last_seen[s[r]] + 1`.
   - Update `last_seen[s[r]] = r`.
   - `best = max(best, r - l + 1)`.
3. Return `best`.

```python
def length_of_longest_substring(s):
    last = {}
    l = best = 0
    for r, ch in enumerate(s):
        if ch in last and last[ch] >= l:
            l = last[ch] + 1
        last[ch] = r
        best = max(best, r - l + 1)
    return best
```

## Walkthrough
On `s = "abcabcbb"`:

- `r=0, 'a'`: window `[0,0]="a"`, `best=1`.
- `r=1, 'b'`: window `[0,1]="ab"`, `best=2`.
- `r=2, 'c'`: window `[0,2]="abc"`, `best=3`.
- `r=3, 'a'`: `'a'` last seen at 0, jump `l=1`. Window `[1,3]="bca"`, `best=3`.
- `r=4, 'b'`: `'b'` last seen at 1, jump `l=2`. Window `[2,4]="cab"`.
- `r=6, 'b'`: jump again. By `r=7`, the best is still 3.

Return `3`.

<div class="dsa-viz" data-algo="longest-no-repeat"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(min(n, σ))</strong> where σ is the alphabet size</span>
</div>

## Pitfalls
- **Forgetting the `last_seen[ch] >= l` check.** A character may have been seen *before* the current window; you shouldn't shrink past where you already are.
- Using `set` and removing characters one-by-one as `l` advances — correct but more code; the "jump `l`" trick is cleaner.
- Updating `best` before the `last_seen` update vs after — both work because the window is valid by the time you measure it; pick a convention.
- For "at most K distinct" extend the same idea — counter map plus a `distinct` count.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/longest-substring-without-repeating-characters/">3. Longest Substring Without Repeating Characters (Medium)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/longest-nice-substring/">1763. Longest Nice Substring (Easy)</a> — divide-and-conquer or window with case checks.</li>
    <li><a href="https://leetcode.com/problems/fruit-into-baskets/">904. Fruit Into Baskets (Medium)</a> — longest subarray with at most 2 distinct.</li>
    <li><a href="https://leetcode.com/problems/longest-substring-with-at-most-two-distinct-characters/">159. Longest Substring with At Most Two Distinct Characters (Medium)</a> — direct generalization with K=2.</li>
    <li><a href="https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/">340. Longest Substring with At Most K Distinct Characters (Medium)</a> — generic K.</li>
    <li><a href="https://leetcode.com/problems/get-equal-substrings-within-budget/">1208. Get Equal Substrings Within Budget (Medium)</a> — variable window with a cost budget.</li>
    <li><a href="https://leetcode.com/problems/maximum-erasure-value/">1695. Maximum Erasure Value (Medium)</a> — same template with running sum.</li>
    <li><a href="https://leetcode.com/problems/longest-repeating-character-replacement/">424. Longest Repeating Character Replacement (Medium)</a> — window valid when `len - maxFreq <= k`.</li>
    <li><a href="https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element/">1493. Longest Subarray of 1s After Deleting One Element (Medium)</a> — window with at most one zero.</li>
    <li><a href="https://leetcode.com/problems/replace-the-substring-for-balanced-string/">1234. Replace the Substring for Balanced String (Medium)</a> — smallest window whose *outside* is balanced.</li>
  </ul>
</div>
