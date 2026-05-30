---
title: Trie — cheatsheet
---

# Trie · Cheatsheet

> One-page recall. Print, paste in Notion, glance before the interview.

## Trigger
**You see in the problem:** "prefix", "autocomplete / suggestions", "dictionary search with wildcards", "search many words in a grid", "longest common prefix", "XOR maximum pair" (binary trie).

**Reach for this pattern when:**
- Many queries on a **fixed set of words** with a **common prefix** flavor.
- Streaming inserts + prefix lookups — you'd otherwise rebuild a hash set per prefix.
- Multi-pattern matching against a grid/text — preprocess all patterns into a trie, walk once.
- Bitwise max-XOR queries — store integers as binary tries.

**Don't reach for it when:**
- One-off contains-check on a small set — a `set` is simpler and likely faster.
- Memory is tight and patterns are long — trie blows up to O(total chars) nodes.

## The mental model
A tree where each **edge** represents one character. The path from root to any node spells a prefix. Mark `end_of_word=True` at nodes that complete a stored word. Insert/lookup are **O(L)** per word of length L — independent of how many words are in the trie.

## Skeleton

```python
class TrieNode:
    __slots__ = ('children', 'end')
    def __init__(self):
        self.children = {}     # or [None] * 26 for fixed alphabet
        self.end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.end = True

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.end

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node.children: return None
            node = node.children[ch]
        return node

# Wildcard search ('.' matches any char) — DFS at each '.'
def search_wild(root, word):
    def dfs(node, i):
        if i == len(word): return node.end
        ch = word[i]
        if ch == '.':
            return any(dfs(c, i+1) for c in node.children.values())
        if ch not in node.children: return False
        return dfs(node.children[ch], i+1)
    return dfs(root, 0)
```

## Complexity
- Insert / search / starts-with: **O(L)** where L = word length.
- Space: **O(Σ × total_chars)** nodes; with a dict, only used branches.
- Wildcard search: O(L × branching) worst.

## Variants in this pattern
1. **Plain trie** — insert/search/starts-with.
2. **Dictionary with wildcards** — `.` matches any character; DFS at wildcards.
3. **Multi-pattern grid search** — Boggle / Word Search II: trie of words + DFS in grid.
4. **Autocomplete / top-K** — store frequency at end-nodes, collect descendants of a prefix.
5. **Binary trie / 0-1 trie** — XOR maximum / minimum pair; insert ints bit by bit from MSB.
6. **Compressed trie (radix tree)** — collapse single-child chains, save memory.

## Top problems
- [LC 208 — Implement Trie](https://leetcode.com/problems/implement-trie-prefix-tree/) (Med) — baseline; nail it.
- [LC 211 — Design Add and Search Words](https://leetcode.com/problems/design-add-and-search-words-data-structure/) (Med) — wildcards with `.`.
- [LC 212 — Word Search II](https://leetcode.com/problems/word-search-ii/) (Hard) — trie + DFS grid; prune branches that don't exist in trie.
- [LC 14 — Longest Common Prefix](https://leetcode.com/problems/longest-common-prefix/) (Easy) — usually solved without trie, but a trie gives a clean structural answer.
- [LC 642 — Design Search Autocomplete System](https://leetcode.com/problems/design-search-autocomplete-system/) (Hard) — trie + heap or frequency at nodes.
- [LC 421 — Maximum XOR of Two Numbers in an Array](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/) (Med) — binary trie, greedy MSB-first.
- [LC 720 — Longest Word in Dictionary](https://leetcode.com/problems/longest-word-in-dictionary/) (Med) — only words whose every prefix is also a word.

## Common bugs / pitfalls
- **Forgetting `end=True`** — `starts_with("apple")` returns True, but `search("apple")` should require the end flag.
- **Wildcard search exploring everything** — prune as soon as `ch not in children` (when non-wildcard); only branch on `.`.
- **Reusing root for many tests** without reset — keep tries immutable post-build, or rebuild per test case.
- **Word Search II — not removing found words** from the trie → time-out via repeated re-discovery.
- **Memory blowup** with `[None] * 26` at every node when alphabet is sparse — use a dict.
- **Binary trie depth**: fix to 31 or 32 bits, MSB first, or you'll compare numbers of different bit-lengths incorrectly.

## In 30 seconds
A tree of characters where each path = a prefix. Insert/lookup in O(L). Reach for it whenever the problem repeats prefix queries or matches many patterns against one input.
