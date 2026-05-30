# 02 — Word Dictionary with '.' wildcard

> Trie • Position 2/4

## Problem
Add words to a dictionary, then search where `.` matches any single character. `search("b.d")` over `{bad, dad}` returns True.

## Intuition
A normal trie can't handle wildcards iteratively because at `.` you must explore every child. Switch the search to **DFS**: at a regular character take the single matching child; at `.` recurse into all children. The branching factor is 26 at every dot, so a word with `w` wildcards costs O(26^w · L). In practice that's fine because most queries have ≤ 2 dots and the trie prunes hard — any branch whose child is missing dies immediately.

## Algorithm
```python
class WordDictionary:
    def __init__(self):
        self.kids = {}
        self.end = False

    def addWord(self, w):
        node = self
        for ch in w:
            node = node.kids.setdefault(ch, WordDictionary())
        node.end = True

    def search(self, w, node=None):
        node = node or self
        for i, ch in enumerate(w):
            if ch == ".":
                return any(self.search(w[i+1:], c) for c in node.kids.values())
            node = node.kids.get(ch)
            if node is None: return False
        return node.end
```

## Walkthrough
Example: dictionary = `{car, cat, cab, dog, do}`. Query `search("c.t")`.

1. **Seed the stack.** Push `(root, i=0)`. Pop it; `ch = 'c'` is a regular char, and `root.kids` contains `c` → push `(c-node, 1)`.
2. **Fan out at the dot.** Pop `(c-node, 1)`; `ch = '.'` → push one frame per child of `c`. There's only one child (the `a` node shared by car/cat/cab) → push `(a-node, 2)`.
3. **Descend the second real char.** Pop `(a-node, 2)`; `ch = 't'`. `a.kids` has `{r, t, b}` — `t` is present → push `(t-node, 3)`.
4. **End of word — check end-flag.** Pop `(t-node, 3)`; `i == len(word)`. The `t` node is the terminal of the inserted word "cat", so `node.end == True` → **FOUND**, search returns True.
5. **End.** If "cat" weren't in the dictionary, that final frame would return False and DFS would backtrack to siblings via the stack (here there were no other live frames left).

<div class="dsa-viz" data-algo="word-dictionary"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(26^w · L)</strong></span>
  <span>space <strong>O(Σ L)</strong></span>
</div>

## Pitfalls
- Slicing `w[i+1:]` is convenient but allocates — pass `i+1` as an index for tighter inner loops.
- Returning `True` as soon as you enter a wildcard branch, instead of recursing into the remaining suffix.
- Forgetting to check `node.end` at the end of the walk — `search("ba")` over `{bad}` must return False.
- Using a 26-slot array when problems allow `.` to match any character — `.` itself is not stored.
- Confusing `?` (regex one char) with `.` (LC convention) and "*" (zero or more). For LC 10/44 use DP, not trie.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/design-add-and-search-words-data-structure/">211 Design Add and Search Words Data Structure (Med)</a> — canonical wildcard trie.</li>
    <li><a href="https://leetcode.com/problems/design-file-system/">1166 Design File System (Med)</a> — path-as-trie.</li>
    <li><a href="https://leetcode.com/problems/design-in-memory-file-system/">588 Design In-Memory File System (Hard)</a> — tree of files/dirs.</li>
    <li><a href="https://leetcode.com/problems/design-search-autocomplete-system/">642 Design Search Autocomplete System (Hard)</a> — weighted + streaming.</li>
    <li><a href="https://leetcode.com/problems/prefix-and-suffix-search/">745 Prefix and Suffix Search (Hard)</a> — pair-encoded keys.</li>
    <li><a href="https://leetcode.com/problems/stream-of-characters/">1032 Stream of Characters (Hard)</a> — reverse trie over a stream.</li>
    <li><a href="https://leetcode.com/problems/search-suggestions-system/">1268 Search Suggestions System (Med)</a> — top-K per node.</li>
    <li><a href="https://leetcode.com/problems/longest-word-in-dictionary/">720 Longest Word in Dictionary (Med)</a> — DFS for longest-buildable.</li>
    <li><a href="https://leetcode.com/problems/replace-words/">648 Replace Words (Med)</a> — shortest prefix lookup.</li>
    <li><a href="https://leetcode.com/problems/word-squares/">425 Word Squares (Hard)</a> — prefix-trie backtracking.</li>
  </ul>
</div>
