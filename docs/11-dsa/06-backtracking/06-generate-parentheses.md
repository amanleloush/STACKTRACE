# 06 — Generate Parentheses

> Backtracking • Position 6/6

## Problem
Given `n` pairs, generate every well-formed string of `n` open and `n` close parens — e.g. `n=3` produces `["((()))","(()())","(()) ()","()(())","()()()"]`.

## Intuition
At every step you have at most two choices: append `'('` or append `')'`. Two simple constraints kill every invalid branch *before* you recurse: you can only open while `open < n`, and you can only close while `close < open`. The **invariant** is that every prefix in `path` is itself a valid (possibly incomplete) parenthesis string — never has more `)` than `(`, never exceeds `n` opens.

## Algorithm
Carry two counters — `open` (so far) and `close` (so far). Two if-branches, both pruning.

```python
def generateParenthesis(n):
    res, path = [], []

    def dfs(open_, close):
        if len(path) == 2 * n:
            res.append("".join(path))
            return
        if open_ < n:
            path.append("("); dfs(open_ + 1, close); path.pop()
        if close < open_:
            path.append(")"); dfs(open_, close + 1); path.pop()

    dfs(0, 0)
    return res
```

## Walkthrough
The widget runs on `n = 3`:

1. **Root.** `path = ""`, `open = 0`, `close = 0`, depth 1. `open < 3` so add `'('` → recurse with `"("`, `open = 1`.
2. **Greedy left spine.** Open is still legal twice more → reach `"((("` with `open = 3, close = 0`. Now `open ≥ n` blocks `'('`, but `close < open` lets `')'` fire three times → emit `"((()))"`.
3. **First backtrack.** Pop back to `"(("` (the parent frame's phase advanced past `'('`). Now try `')'` → `"(()"`. Down that subtree: `"(()("` → `"(()()"` → `"(()())"` is recorded; sibling `"(())"` path closes to `"(())()"`.
4. **Mid-tree.** Pop further; from root pick `"()"` first instead. Subtree yields `"()(())"` and `"()()()"` — the open/close counters in the readout flip back and forth.
5. **End.** Five strings emitted: `((())), (()()), (())(), ()(()), ()()()` — the 3rd Catalan number **C₃ = 5**.

<div class="dsa-viz" data-algo="generate-parens"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(4ⁿ / √n)</strong> Catalan</span>
  <span>space <strong>O(n)</strong> recursion + path</span>
</div>

## Pitfalls
- Generating all `2^(2n)` strings and filtering — works for `n ≤ 4`, dies after.
- Pruning rule reversed: `if open > close: dfs(close)` is wrong; the rule is **on the choice you're about to make**, i.e. `close < open` to *add* a close.
- Tracking only `total_length` without `open`/`close` — you lose the ability to prune invalid prefixes.
- Returning the `path` list reference (mutable) instead of `"".join(path)` — every result becomes empty.
- Off-by-one: stopping at `len(path) == n` instead of `2 * n`.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/generate-parentheses/">22. Generate Parentheses (Medium)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/letter-combinations-of-a-phone-number/">17. Letter Combinations of a Phone Number (Medium)</a> — multi-choice generation.</li>
    <li><a href="https://leetcode.com/problems/combination-sum/">39. Combination Sum (Medium)</a> — prune by remaining target.</li>
    <li><a href="https://leetcode.com/problems/subsets/">78. Subsets (Medium)</a> — include/exclude generation.</li>
    <li><a href="https://leetcode.com/problems/permutations/">46. Permutations (Medium)</a> — full-ordering generation.</li>
    <li><a href="https://leetcode.com/problems/n-queens/">51. N-Queens (Hard)</a> — constrained generation with guards.</li>
    <li><a href="https://leetcode.com/problems/gray-code/">89. Gray Code (Medium)</a> — sequence generation.</li>
    <li><a href="https://leetcode.com/problems/generalized-abbreviation/">320. Generalized Abbreviation (Medium)</a> — per-char two-way branch.</li>
    <li><a href="https://leetcode.com/problems/expression-add-operators/">282. Expression Add Operators (Hard)</a> — generate operator placements.</li>
    <li><a href="https://leetcode.com/problems/different-ways-to-add-parentheses/">241. Different Ways to Add Parentheses (Medium)</a> — divide & conquer on operators.</li>
  </ul>
</div>
