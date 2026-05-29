# 05 — Word Search (grid DFS with backtracking)

> Backtracking • Position 5/6

## Problem
Given a 2D grid of letters and a target word, return `True` if the word can be spelled by walking 4-directionally between adjacent cells, with no cell reused.

## Intuition
For every cell that matches the first letter, start a DFS that **temporarily marks the cell** as used, then tries the four neighbours for the next letter. The mark-then-recurse-then-unmark pattern is exactly what makes this backtracking and not plain DFS — the same cell must be available to other branches once we abandon this one. The **invariant** is that at depth `i`, `path` spells `word[0..i]` and every cell on `path` is currently marked.

## Algorithm
Iterate cells, launch DFS on first-letter matches. The DFS swaps the cell to a sentinel before recursing and restores it on the way out.

```python
def exist(board, word):
    m, n = len(board), len(board[0])

    def dfs(r, c, i):
        if i == len(word): return True
        if r < 0 or r >= m or c < 0 or c >= n: return False
        if board[r][c] != word[i]: return False
        board[r][c] = '#'                         # mark
        found = (dfs(r+1, c, i+1) or dfs(r-1, c, i+1)
              or dfs(r, c+1, i+1) or dfs(r, c-1, i+1))
        board[r][c] = word[i]                     # unmark
        return found

    return any(dfs(r, c, 0) for r in range(m) for c in range(n))
```

## Walkthrough
Board `[[A,B,C,E],[S,F,C,S],[A,D,E,E]]`, word `"ABCCED"`. DFS launches from `(0,0)`.

1. **At `(0,0) = 'A'`** matches `word[0]`. Mark visited. Try neighbours for `word[1]='B'`: up oob, down `(1,0)='S' ≠ B`, left oob, right `(0,1)='B'` matches — descend.
2. **At `(0,1) = 'B'`.** Try for `word[2]='C'`: down `(1,1)='F'` skip, left already visited, right `(0,2)='C'` matches — descend.
3. **At `(0,2) = 'C'`.** Try for `word[3]='C'`: down `(1,2)='C'` matches — descend.
4. **At `(1,2) = 'C'`.** Try for `word[4]='E'`: down `(2,2)='E'` matches — descend. **At `(2,2) = 'E'`.** Try for `word[5]='D'`: left `(2,1)='D'` matches — descend.
5. **At `(2,1) = 'D'`** with `wi = 5 = len(word) - 1` — **word complete, return `True`**.

<div class="dsa-viz" data-algo="word-search"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(m·n · 4^L)</strong> L = word length</span>
  <span>space <strong>O(L)</strong> recursion</span>
</div>

## Pitfalls
- Using a separate `visited` set instead of in-place marking — correct but doubles the per-call cost.
- Forgetting to **unmark** the cell on the way out — sibling branches falsely see the cell as taken.
- Returning `False` as soon as one neighbour fails instead of OR-ing all four directions.
- Early-exit shortcut bug: if you store `found = dfs(...)` four times without short-circuiting, you do four times the work even after a hit.
- For `Word Search II` (many words), running this for each word — use a **Trie + DFS** instead.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/word-search/">79. Word Search (Medium)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/word-search-ii/">212. Word Search II (Hard)</a> — Trie + grid DFS.</li>
    <li><a href="https://leetcode.com/problems/unique-paths-iii/">980. Unique Paths III (Hard)</a> — visit every empty cell once.</li>
    <li><a href="https://leetcode.com/problems/path-with-maximum-gold/">1219. Path with Maximum Gold (Medium)</a> — DFS that returns a max.</li>
    <li><a href="https://leetcode.com/problems/robot-room-cleaner/">489. Robot Room Cleaner (Hard)</a> — DFS in an unknown grid with movement primitives.</li>
    <li><a href="https://leetcode.com/problems/reconstruct-itinerary/">332. Reconstruct Itinerary (Hard)</a> — backtracking on edges (Hierholzer).</li>
    <li><a href="https://leetcode.com/problems/generate-parentheses/">22. Generate Parentheses (Medium)</a> — constrained string builder.</li>
    <li><a href="https://leetcode.com/problems/n-queens/">51. N-Queens (Hard)</a> — backtracking with constraint sets.</li>
    <li><a href="https://leetcode.com/problems/letter-combinations-of-a-phone-number/">17. Letter Combinations of a Phone Number (Medium)</a> — fixed-depth tree.</li>
    <li><a href="https://leetcode.com/problems/generalized-abbreviation/">320. Generalized Abbreviation (Medium)</a> — per-char choice.</li>
  </ul>
</div>
