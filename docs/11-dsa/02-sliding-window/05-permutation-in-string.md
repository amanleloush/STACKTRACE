# 05 — Permutation in String

> Sliding Window • 5/5

## Problem
Given strings `s1` and `s2`, return `true` if **some permutation of `s1`** appears as a contiguous substring of `s2`. Equivalently: does any window of length `|s1|` in `s2` have the same character frequencies as `s1`?

## Intuition
A permutation is fully characterized by its character-frequency map. Slide a fixed-size window of length `k = |s1|` across `s2`. Maintain a rolling frequency map for the window; compare against `need = Counter(s1)`. Naively comparing two maps every step is O(σ) per step — replace it with a **match counter** `matches` that increments when a character's window-count *equals* `need[ch]`, decrements when it stops matching. The window is a permutation iff `matches == 26` (over the lowercase-English alphabet). The invariant: each step does O(1) work, so the total is O(n + σ).

## Algorithm
1. If `|s1| > |s2|`, return `false`.
2. Build `need` and `have` as size-26 arrays. Initialize `matches`: number of letters where `have[i] == need[i]`.
3. For `r` in `k..n-1`:
   - Add `s2[r]` to `have`; update `matches`.
   - Remove `s2[r - k]` from `have`; update `matches`.
   - If `matches == 26`, return `true`.
4. Final check on the initial window, then return `false`.

```python
def check_inclusion(s1, s2):
    k, n = len(s1), len(s2)
    if k > n: return False
    need, have = [0]*26, [0]*26
    for ch in s1: need[ord(ch) - 97] += 1
    for i in range(k): have[ord(s2[i]) - 97] += 1
    matches = sum(1 for i in range(26) if need[i] == have[i])
    if matches == 26: return True
    for r in range(k, n):
        ai = ord(s2[r]) - 97
        have[ai] += 1
        if have[ai] == need[ai]: matches += 1
        elif have[ai] == need[ai] + 1: matches -= 1
        bi = ord(s2[r - k]) - 97
        have[bi] -= 1
        if have[bi] == need[bi]: matches += 1
        elif have[bi] == need[bi] - 1: matches -= 1
        if matches == 26: return True
    return False
```

## Walkthrough
On `s1 = "ab"`, `s2 = "eidbaooo"`, `k = 2`, `need = {a:1, b:1}`:

1. **Initial window** covers `s2[0..1] = "ei"`. `window = {e:1, i:1}` — nowhere near `need`.
2. Slide: `+'d', -'e'` → `"id"`, window = `{i:1, d:1}`. Still off.
3. Slide: `+'b', -'i'` → `"db"`, window = `{d:1, b:1}`. Closer — `b` matches.
4. Slide: `+'a', -'d'` → `"ba"`, window = `{b:1, a:1}` — **exactly equal to `need`**. Return `true`.

<div class="dsa-viz" data-algo="permutation-in-string"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n + σ)</strong></span>
  <span>space <strong>O(σ)</strong> alphabet size</span>
</div>

## Pitfalls
- Comparing full frequency maps every step — works, but O(n·σ); use the `matches` trick to keep it O(n).
- Off-by-one when initializing the first window — it's `s2[0..k-1]`, not `s2[0..k]`.
- Updating `matches` on the wrong side — increment when count *just hit* the requirement; decrement when it *just left*. Use exact equality checks; `>=` is wrong.
- For "find all anagrams" (LC 438), the engine is identical — just emit `l` whenever `matches == 26` instead of returning.
- Unicode strings — replace the `[26]` array with a hash map.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/permutation-in-string/">567. Permutation in String (Medium)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/valid-anagram/">242. Valid Anagram (Easy)</a> — the frequency-map building block.</li>
    <li><a href="https://leetcode.com/problems/find-all-anagrams-in-a-string/">438. Find All Anagrams in a String (Medium)</a> — emit every matching window start.</li>
    <li><a href="https://leetcode.com/problems/group-anagrams/">49. Group Anagrams (Medium)</a> — key by sorted string or by frequency tuple.</li>
    <li><a href="https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/">1456. Maximum Number of Vowels in a Substring of Given Length (Medium)</a> — fixed window with rolling counter.</li>
    <li><a href="https://leetcode.com/problems/find-k-length-substrings-with-no-repeated-characters/">1100. Find K-Length Substrings With No Repeated Characters (Medium)</a> — fixed window, all-distinct check.</li>
    <li><a href="https://leetcode.com/problems/repeated-dna-sequences/">187. Repeated DNA Sequences (Medium)</a> — fixed window of size 10 plus a seen-set.</li>
    <li><a href="https://leetcode.com/problems/minimum-window-substring/">76. Minimum Window Substring (Hard)</a> — variable-size cousin.</li>
    <li><a href="https://leetcode.com/problems/substring-with-concatenation-of-all-words/">30. Substring with Concatenation of All Words (Hard)</a> — word-level permutation matching.</li>
    <li><a href="https://leetcode.com/problems/design-underground-system/">1396. Design Underground System (Medium)</a> — not a window per se, but the running-stat hash-map pattern shows up everywhere.</li>
  </ul>
</div>
