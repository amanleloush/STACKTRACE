# 02 — Permutations

> Backtracking • Position 2/6

## Problem
Given a list of `n` distinct integers, return all `n!` orderings.

## Intuition
Unlike subsets, **order matters** and **every element must appear**. So at depth `k` of the DFS tree, the choice is "which unused element goes next." A `used[]` boolean array (or removing from a candidate list) is what enforces "each element exactly once." The **invariant** is that `path` is a valid permutation of some subset of the input, and `len(path) + count(used == False) == n` at every node.

## Algorithm
Branch on each unused index at every level; mark used before recursing, unmark on the way back.

```python
def permute(nums):
    res, path = [], []
    used = [False] * len(nums)

    def dfs():
        if len(path) == len(nums):
            res.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]: continue
            used[i] = True
            path.append(nums[i])
            dfs()
            path.pop()
            used[i] = False

    dfs()
    return res
```

## Walkthrough
The widget runs on `a = [1, 2, 3]` using the **swap-into-position** variant (more compact than `used[]`):

1. **Enter `bt(0)`, j = 0.** Swap `a[0] ↔ a[0]` (no-op) → `a = [1, 2, 3]`. Recurse to `bt(1)`. The call stack reads `bt(0,j=0) → bt(1,j=1)`.
2. **Down to a leaf.** Inside `bt(1)` we swap j=1 (no-op), recurse to `bt(2)`, swap j=2 (no-op), recurse to `bt(3)` — depth equals `n`, record `[1, 2, 3]`.
3. **First real swap.** Pop back to `bt(1)`; j advances to 2 → swap `a[1] ↔ a[2]` → `a = [1, 3, 2]`; recurse → leaf `[1, 3, 2]`; undo to restore `a = [1, 2, 3]`.
4. **Subtree under root j = 1.** `bt(0)` advances j to 1 → swap `a[0] ↔ a[1]` → `a = [2, 1, 3]`. Its subtree yields `[2, 1, 3]` and `[2, 3, 1]`, then undoes back to `[1, 2, 3]`.
5. **End.** Subtree under j = 2 yields `[3, 2, 1]` and `[3, 1, 2]`. The "found" row finishes with all **6 = 3!** permutations.

<div class="dsa-viz" data-algo="permutations"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n · n!)</strong></span>
  <span>space <strong>O(n)</strong> recursion + used array</span>
</div>

## Pitfalls
- Forgetting to reset `used[i] = False` after recursing — the search collapses to a single path.
- For `Permutations II` (input has duplicates), missing the dedupe rule: sort, then `if i > 0 and nums[i] == nums[i-1] and not used[i-1]: continue`.
- Swap-in-place permutations look elegant but corrupt the input — don't use them if the caller needs the original.
- Recording at every node instead of only at full length — output is flooded with partial paths.
- Using a set instead of a list for `path` — sets lose order, which is the whole point of permutations.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/permutations/">46. Permutations (Medium)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/permutations-ii/">47. Permutations II (Medium)</a> — duplicates: sort + used-prev guard.</li>
    <li><a href="https://leetcode.com/problems/next-permutation/">31. Next Permutation (Medium)</a> — in-place lexicographic next.</li>
    <li><a href="https://leetcode.com/problems/permutation-sequence/">60. Permutation Sequence (Hard)</a> — k-th permutation by math, not enumeration.</li>
    <li><a href="https://leetcode.com/problems/beautiful-arrangement/">526. Beautiful Arrangement (Medium)</a> — backtrack with divisibility constraint.</li>
    <li><a href="https://leetcode.com/problems/number-of-squareful-arrays/">996. Number of Squareful Arrays (Hard)</a> — adjacency pair must square.</li>
    <li><a href="https://leetcode.com/problems/count-numbers-with-unique-digits/">357. Count Numbers with Unique Digits (Medium)</a> — counting variant.</li>
    <li><a href="https://leetcode.com/problems/letter-tile-possibilities/">1079. Letter Tile Possibilities (Medium)</a> — count distinct permutations.</li>
    <li><a href="https://leetcode.com/problems/count-sorted-vowel-strings/">1641. Count Sorted Vowel Strings (Medium)</a> — non-decreasing fixed-length sequences.</li>
    <li><a href="https://leetcode.com/problems/generate-parentheses/">22. Generate Parentheses (Medium)</a> — constrained permutation of brackets.</li>
  </ul>
</div>
