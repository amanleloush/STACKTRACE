# 03 — Minimum Window Substring

> Sliding Window • 3/5

## Problem
Given strings `s` and `t`, return the shortest substring of `s` that contains **every character** of `t` (with multiplicity). Return `""` if none exists.

## Intuition
Two-phase window: **expand** `r` until the window covers all of `t`; **shrink** `l` while it still covers; record the answer at each valid shrink; resume expanding. To avoid recomputing "does the window cover `t`?" on every step, keep a `need` map (required counts) and a `have` counter that tracks **how many characters have already hit their required count**. Increment `have` only when a character's window-count *reaches* the requirement; decrement only when it *drops below*. The window is valid iff `have == required_distinct(t)`. The invariant: each index enters and leaves the window once, giving O(n + m).

## Algorithm
1. Build `need = Counter(t)`. Let `required = len(need)`.
2. `window = {}`, `have = 0`, `best = (∞, 0, 0)`, `l = 0`.
3. For `r` from 0 to n-1:
   - Update `window[s[r]] += 1`. If `window[s[r]] == need.get(s[r], -1)`, `have += 1`.
   - While `have == required`:
     - If `r - l + 1 < best[0]`, update `best = (r - l + 1, l, r)`.
     - `window[s[l]] -= 1`. If `window[s[l]] < need.get(s[l], 0)`, `have -= 1`.
     - `l += 1`.
4. Return `s[best[1]:best[2]+1]` or `""`.

```python
from collections import Counter, defaultdict

def min_window(s, t):
    if not t: return ""
    need = Counter(t)
    required = len(need)
    window = defaultdict(int)
    have = 0
    best = (float("inf"), 0, 0)
    l = 0
    for r, ch in enumerate(s):
        window[ch] += 1
        if ch in need and window[ch] == need[ch]:
            have += 1
        while have == required:
            if r - l + 1 < best[0]:
                best = (r - l + 1, l, r)
            lch = s[l]
            window[lch] -= 1
            if lch in need and window[lch] < need[lch]:
                have -= 1
            l += 1
    return "" if best[0] == float("inf") else s[best[1]:best[2]+1]
```

## Walkthrough
On `s = "ADOBECODEBANC"`, `t = "ABC"`, `need = {A:1, B:1, C:1}`:

1. **Expand.** `r` walks right pulling `A, D, O, B, E, C` into the window. At `r=5` all three letters are covered → record best = `"ADOBEC"` (len 6).
2. **Shrink.** Drop `A` at `l=0`: coverage breaks. Resume expanding.
3. The window keeps shifting right; whenever coverage is restored, we shrink left and record a smaller cover (e.g. `"CODEBA"`, len 6, then `"ODEBAN C"` cycle).
4. **Eventually** the window becomes `"BANC"` at `l=9, r=12` — still covers `{A, B, C}` and is length 4, the new best.
5. **End.** Scan completes with best = `"BANC"`.

<div class="dsa-viz" data-algo="min-window-substring"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n + m)</strong></span>
  <span>space <strong>O(σ)</strong> alphabet size</span>
</div>

## Pitfalls
- Comparing full hash maps on every step (`window == need`) — that's O(σ) per step and turns the whole thing into O(n·σ). Use the `have` counter.
- Incrementing `have` every time a character is added — only increment when it *exactly* matches the required count.
- Forgetting that `t` can contain **duplicates** — `need['A'] = 2` means the window needs two A's.
- Returning indices instead of the substring — read the signature.
- Using this pattern for "contains as a subsequence" (not contiguous) — wrong tool; that's LC 727.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/minimum-window-substring/">76. Minimum Window Substring (Hard)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/permutation-in-string/">567. Permutation in String (Medium)</a> — fixed-size window matching exactly.</li>
    <li><a href="https://leetcode.com/problems/find-all-anagrams-in-a-string/">438. Find All Anagrams in a String (Medium)</a> — emit all matching window starts.</li>
    <li><a href="https://leetcode.com/problems/minimum-size-subarray-sum/">209. Minimum Size Subarray Sum (Medium)</a> — shrink while sum is still >= target.</li>
    <li><a href="https://leetcode.com/problems/max-consecutive-ones-iii/">1004. Max Consecutive Ones III (Medium)</a> — shrink when zero-count exceeds k.</li>
    <li><a href="https://leetcode.com/problems/get-equal-substrings-within-budget/">1208. Get Equal Substrings Within Budget (Medium)</a> — variable window with cost budget.</li>
    <li><a href="https://leetcode.com/problems/replace-the-substring-for-balanced-string/">1234. Replace the Substring for Balanced String (Medium)</a> — smallest window whose outside is balanced.</li>
    <li><a href="https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/">1438. Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit (Medium)</a> — window with two monotonic deques.</li>
    <li><a href="https://leetcode.com/problems/minimum-window-subsequence/">727. Minimum Window Subsequence (Hard)</a> — subsequence, not substring; two-pointer DP.</li>
    <li><a href="https://leetcode.com/problems/substring-with-concatenation-of-all-words/">30. Substring with Concatenation of All Words (Hard)</a> — word-level sliding window.</li>
    <li><a href="https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/">632. Smallest Range Covering Elements from K Lists (Hard)</a> — heap-driven multi-pointer window.</li>
  </ul>
</div>
