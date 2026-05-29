# 01 — Trie insert / search / startsWith

> Trie • Position 1/4

## Problem
Implement `insert(word)`, `search(word)`, `startsWith(prefix)` over a dictionary of lowercase strings.

## Intuition
A trie collapses shared prefixes into one branch. Every node owns a 26-slot array (one per letter) and an `is_end` flag. **Insert** walks the string, creating children on demand. **Search** walks the same path and returns `node.is_end` at the final step. **`startsWith`** is identical to search except it ignores `is_end` — reaching the last character is enough. The win is structural: N words with a shared K-character prefix cost O(K + sum of suffix lengths) total, not O(N·K).

## Algorithm
```python
class Trie:
    def __init__(self):
        self.kids = {}
        self.end = False

    def insert(self, word):
        node = self
        for ch in word:
            node = node.kids.setdefault(ch, Trie())
        node.end = True

    def _walk(self, s):
        node = self
        for ch in s:
            node = node.kids.get(ch)
            if node is None: return None
        return node

    def search(self, word):       return bool((n := self._walk(word)) and n.end)
    def startsWith(self, prefix): return self._walk(prefix) is not None
```

## Walkthrough
Example below inserts `["car", "cat", "cab"]` into an empty trie.

1. **Insert "car".** From the empty root, create `c → a → r` as a fresh chain and mark `r` as an end node.
2. **Insert "cat".** Walk `c → a` (already exist — reuse them), then create a new `t` child under `a` and mark it end.
3. **Insert "cab".** Walk `c → a` again, create a third sibling `b` under `a`, mark it end. Node `a` now has three end-children: `r`, `t`, `b`.
4. **`search("cat")`.** Walk `c → a → t`; final node has `end == True` → **FOUND**. (Try the companion `trie-search` viz over `{car, cat, cab, dog, do}` — same walk, the terminal check is what changes.)
5. **`search("ca")` vs `startsWith("ca")`.** Both walk to node `a`; `search` returns **False** because `a.end == False`, while `startsWith` returns **True** because reaching the node at all is enough.

<div class="dsa-viz" data-algo="trie-insert"></div>

The companion `trie-search` visualization shows the same tree being traversed — search/`startsWith` re-use the walk; only the terminal check differs.

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(L) per op</strong></span>
  <span>space <strong>O(Σ L)</strong></span>
</div>

## Pitfalls
- Forgetting `is_end` and letting `search("ca")` return True after inserting "cat".
- Using a 26-slot array when input may contain uppercase/digits — switch to a hashmap.
- Storing the full word at every node (wastes memory); store it only at end nodes if you need to retrieve it.
- Iterative is cleaner than recursive for insert/search — saves stack frames on long strings.
- For deletion, you need a count of descendants or a `children_count` field; naive "unmark end" leaks nodes.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/implement-trie-prefix-tree/">208 Implement Trie (Med)</a> — canonical problem.</li>
    <li><a href="https://leetcode.com/problems/design-add-and-search-words-data-structure/">211 Design Add and Search Words Data Structure (Med)</a> — adds '.' wildcard.</li>
    <li><a href="https://leetcode.com/problems/replace-words/">648 Replace Words (Med)</a> — find shortest prefix in dictionary.</li>
    <li><a href="https://leetcode.com/problems/implement-magic-dictionary/">676 Implement Magic Dictionary (Med)</a> — exactly-one mismatch search.</li>
    <li><a href="https://leetcode.com/problems/longest-word-in-dictionary/">720 Longest Word in Dictionary (Med)</a> — DFS picking lexicographically smallest.</li>
    <li><a href="https://leetcode.com/problems/search-suggestions-system/">1268 Search Suggestions System (Med)</a> — trie + cached top-3.</li>
    <li><a href="https://leetcode.com/problems/longest-common-prefix/">14 Longest Common Prefix (Easy)</a> — trivial via trie walk.</li>
    <li><a href="https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/">421 Maximum XOR of Two Numbers in an Array (Med)</a> — binary trie.</li>
    <li><a href="https://leetcode.com/problems/design-search-autocomplete-system/">642 Design Search Autocomplete System (Hard)</a> — weighted trie + heap.</li>
    <li><a href="https://leetcode.com/problems/prefix-and-suffix-search/">745 Prefix and Suffix Search (Hard)</a> — pair-encoded trie.</li>
  </ul>
</div>
