# 04 — Autocomplete (trie + best children)

> Trie • Position 4/4

## Problem
Given a stream of search queries with weights, design a structure that returns the top-3 suggestions matching the current prefix, updated as the user types each character.

## Intuition
A trie walks each new character in O(1). The expensive part is "give me the best-K queries below this node." Two strategies: **(a)** at each node cache a sorted list of top-K candidates and update it on insert — fast queries, slower writes; **(b)** at query time DFS below the node collecting candidates into a heap — slower queries, no cache. For LC 1268 the dictionary is static, so option (b) is fine after sorting the words. For LC 642 the stream is hot — option (a) wins. Either way, the trie does the prefix selection; the candidate ranking is a separate per-node concern.

## Algorithm
```python
class Node:
    __slots__ = ("kids", "top")
    def __init__(self):
        self.kids, self.top = {}, []      # top = sorted list of (-freq, word)

def insert(root, word, freq, K=3):
    node = root
    for ch in word:
        node = node.kids.setdefault(ch, Node())
        node.top.append((-freq, word))
        node.top.sort()                   # or use a small heap
        node.top = node.top[:K]

def suggest(root, prefix):
    node = root
    for ch in prefix:
        node = node.kids.get(ch)
        if not node: return []
    return [w for _, w in node.top]
```

## Walkthrough
Example: insert `("car", 5)`, `("cat", 3)`, `("cab", 2)` with `K = 2`. Then query prefix `"ca"`.

1. **Insert "car" (freq 5).** Build chain `c → a → r`; every node on the path gets `("car":5)` added to its `topK`. After this insert, all three nodes show `topK = [car:5]`.
2. **Insert "cat" (freq 3).** Walk `c → a` (reuse), create `t` under `a`. Push `("cat":3)` into the topK of `c`, `a`, and the new `t` node — each cache is re-sorted by frequency descending, K=2. Nodes `c` and `a` now show `[car:5, cat:3]`; `t` shows `[cat:3]`.
3. **Insert "cab" (freq 2).** Walk `c → a`, create `b`. Push `("cab":2)`. At node `c` and `a` the candidate set becomes `{car:5, cat:3, cab:2}` → sort by freq desc → keep top-2 → `[car:5, cat:3]`. **`cab` is evicted from the cache** (K=2). Node `b` shows `[cab:2]`.
4. **Query "ca" — walk the prefix.** Start at root, walk `c`, then `a`. The walk ends at node `a`; just **read its cached `topK`**.
5. **End.** `topK(a) = [car:5, cat:3]` → suggestions are `["car", "cat"]`.

<div class="dsa-viz" data-algo="autocomplete"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(L·K) insert / O(L) query</strong></span>
  <span>space <strong>O(Σ L · K)</strong></span>
</div>

## Pitfalls
- Sorting the cached list with the wrong tie-breaker — LC 642 wants higher frequency first, then lexicographically smaller.
- Updating top-K only at the deepest node — every ancestor on the insert path needs the update.
- Recomputing top-K from scratch at each insert instead of merging the new candidate into the existing K.
- For LC 1268 (static dictionary), people overbuild — `bisect` on a sorted list gives O(log n) per character, no trie needed.
- For very long prefixes, the cached list at each ancestor wastes memory — switch to query-time DFS if `Σ L · K` blows up.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/design-search-autocomplete-system/">642 Design Search Autocomplete System (Hard)</a> — canonical weighted autocomplete.</li>
    <li><a href="https://leetcode.com/problems/search-suggestions-system/">1268 Search Suggestions System (Med)</a> — static, sorted-array trick.</li>
    <li><a href="https://leetcode.com/problems/longest-word-in-dictionary/">720 Longest Word in Dictionary (Med)</a> — DFS picking smallest lex.</li>
    <li><a href="https://leetcode.com/problems/design-in-memory-file-system/">588 Design In-Memory File System (Hard)</a> — trie of paths.</li>
    <li><a href="https://leetcode.com/problems/prefix-and-suffix-search/">745 Prefix and Suffix Search (Hard)</a> — pair-encoded trie.</li>
    <li><a href="https://leetcode.com/problems/design-file-system/">1166 Design File System (Med)</a> — path-as-trie.</li>
    <li><a href="https://leetcode.com/problems/stream-of-characters/">1032 Stream of Characters (Hard)</a> — reverse trie.</li>
    <li><a href="https://leetcode.com/problems/word-squares/">425 Word Squares (Hard)</a> — prefix-lookup backtracking.</li>
    <li><a href="https://leetcode.com/problems/delete-duplicate-folders-in-system/">1948 Delete Duplicate Folders in System (Hard)</a> — trie hashing.</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-words/">692 Top K Frequent Words (Med)</a> — ranking primitive used inside autocomplete.</li>
  </ul>
</div>
