# 10 — Word Break

> Dynamic Programming • Position 10/11

## Problem
Given a string `s` and a dictionary `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.

## Intuition
Let `dp[i]` mean "the prefix `s[:i]` can be segmented." For `dp[i]` to be true, some split point `j < i` must satisfy `dp[j] == true` **and** `s[j:i]` is a dictionary word. Sweep `i` left to right and try every `j`. Dictionary membership is a set lookup, so each split test is O(L) for hashing the substring. The recurrence is a Boolean OR — once any split works, the prefix is reachable.

## State & recurrence
- State: `dp[i]` = `True` if `s[:i]` is segmentable into dictionary words.
- Transition: `dp[i] = any(dp[j] and s[j:i] in dict for j in range(i))`.
- Base case: `dp[0] = True` (the empty prefix is trivially segmentable).

## Algorithm
```python
def wordBreak(s: str, wordDict: list[str]) -> bool:
    words = set(wordDict)
    max_len = max((len(w) for w in words), default=0)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True
    for i in range(1, n + 1):
        # only look back as far as the longest dictionary word
        start = max(0, i - max_len)
        for j in range(start, i):
            if dp[j] and s[j:i] in words:
                dp[i] = True
                break
    return dp[n]

# A Trie over wordDict lets you walk forward from each j and prune
# whenever a prefix has no extensions — useful when wordDict is large.
```

## Walkthrough
The widget runs on `s = "leetcode"` with `dict = {"leet", "code"}`:

1. **Seed.** `dp[0] = T` lights up — the empty prefix is segmentable by definition.
2. **i = 1..3.** For each prefix "l", "le", "lee", every fragment `s[0..i]` is tried against the dict. None match, so `dp[1] = dp[2] = dp[3]` stay `·` (false).
3. **i = 4 — the first hit.** `j = 0`: `dp[0] = T` and `s[0..4] = "leet"` is in the dict → set `dp[4] = T` and break. Watch the window highlight stretch over `leet`.
4. **i = 5..7.** Every `j` either has `dp[j] = false` or yields a non-dict fragment ("c", "co", "cod", …). The `dp` row stays `T · · · T · · ·`.
5. **End — i = 8.** `j = 4`: `dp[4] = T` and `s[4..8] = "code"` is in the dict → `dp[8] = T`. Return **true** — "leetcode" splits as "leet" + "code".

<div class="dsa-viz" data-algo="word-break"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n² · L)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- Forgetting `dp[0] = True` — the empty prefix is the seed that makes the recurrence fire.
- Using a list instead of a set for `wordDict` — degrades each lookup from O(L) to O(N · L).
- Skipping the `max_len` cap — without it, you scan up to `O(n)` per `i` even when the dictionary words are short, multiplying by `O(L)` for hashing.
- Confusing 139 (Boolean) with 140 (enumerate all segmentations) — 140 needs backtracking and may be exponential.
- Substring slicing in tight loops — for huge `s`, build a Trie and advance pointers instead of allocating substrings.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/word-break/">139. Word Break (Medium)</a> — the canonical Boolean DP.</li>
    <li><a href="https://leetcode.com/problems/word-break-ii/">140. Word Break II (Hard)</a> — enumerate all segmentations.</li>
    <li><a href="https://leetcode.com/problems/concatenated-words/">472. Concatenated Words (Hard)</a> — Word Break per word in the input list.</li>
    <li><a href="https://leetcode.com/problems/decode-ways/">91. Decode Ways (Medium)</a> — same shape with numeric constraints.</li>
    <li><a href="https://leetcode.com/problems/palindrome-partitioning-ii/">132. Palindrome Partitioning II (Hard)</a> — segment by palindromes; min cuts.</li>
    <li><a href="https://leetcode.com/problems/integer-break/">343. Integer Break (Medium)</a> — partition an integer for max product.</li>
    <li><a href="https://leetcode.com/problems/soup-servings/">808. Soup Servings (Medium)</a> — probabilistic DP with memoization.</li>
    <li><a href="https://leetcode.com/problems/maximum-product-subarray/">152. Maximum Product Subarray (Medium)</a> — DP carrying min and max simultaneously.</li>
    <li><a href="https://leetcode.com/problems/unique-binary-search-trees/">96. Unique Binary Search Trees (Medium)</a> — Catalan recurrence.</li>
    <li><a href="https://leetcode.com/problems/unique-binary-search-trees-ii/">95. Unique Binary Search Trees II (Medium)</a> — enumerate structures, not just count.</li>
  </ul>
</div>
