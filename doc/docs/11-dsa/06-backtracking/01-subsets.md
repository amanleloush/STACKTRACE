# 01 — Subsets

> Backtracking • Position 1/6

## Problem
Given a set of `n` distinct integers, return every possible subset (the power set) — `2ⁿ` subsets in total.

## Intuition
Walk the array left to right. At each index you make one of two decisions: **include** this element in the current subset, or **skip** it. The DFS tree has depth `n` and `2ⁿ` leaves — each leaf is one subset. The **invariant** is that `path` always holds the include-decisions for indices `[0..i)`; on every recursive entry, `path` is a valid subset of the prefix.

## Algorithm
A `start` pointer marks where we are in the array. We record `path` at every node (not just leaves) because every node *is* a valid subset.

```python
def subsets(nums):
    res, path = [], []

    def dfs(start):
        res.append(path[:])          # snapshot — current subset
        for i in range(start, len(nums)):
            path.append(nums[i])     # choose
            dfs(i + 1)               # explore
            path.pop()               # un-choose

    dfs(0)
    return res
```

## Walkthrough
1. `nums = [1, 2, 3]`. Call `dfs(0)`. Record `[]`.
2. Pick `1` → `path = [1]`, recurse with `start=1`. Record `[1]`.
3. From there pick `2` → `[1,2]`, record; pick `3` → `[1,2,3]`, record; pop back.
4. Back at `[1]`, pick `3` → `[1,3]`, record; pop. Pop `1`.
5. Back at root, pick `2` → record `[2]`; descend; eventually we've recorded all 8 subsets.

<div class="dsa-viz" data-algo="subsets"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n · 2ⁿ)</strong></span>
  <span>space <strong>O(n)</strong> recursion (output excluded)</span>
</div>

## Pitfalls
- Appending `path` instead of `path[:]` — every result ends up pointing at the same list, which is empty at the end.
- Using `start` = `i + 0` instead of `i + 1` — generates combinations with repetition.
- For `Subsets II` (duplicates allowed in input), forgetting to sort first and add `if i > start and nums[i] == nums[i-1]: continue`.
- Recording only at leaves — you'll miss every proper-prefix subset including `[]`.
- Confusing subsets with permutations — subsets care about *set membership*, not order.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/subsets/">78. Subsets (Medium)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/subsets-ii/">90. Subsets II (Medium)</a> — duplicates: sort + skip.</li>
    <li><a href="https://leetcode.com/problems/combinations/">77. Combinations (Medium)</a> — same skeleton, pick exactly k.</li>
    <li><a href="https://leetcode.com/problems/combination-sum/">39. Combination Sum (Medium)</a> — reuse allowed, prune by remaining target.</li>
    <li><a href="https://leetcode.com/problems/combination-sum-ii/">40. Combination Sum II (Medium)</a> — no reuse + duplicates.</li>
    <li><a href="https://leetcode.com/problems/combination-sum-iii/">216. Combination Sum III (Medium)</a> — k numbers summing to n.</li>
    <li><a href="https://leetcode.com/problems/non-decreasing-subsequences/">491. Non-decreasing Subsequences (Medium)</a> — dedupe via per-level set.</li>
    <li><a href="https://leetcode.com/problems/letter-combinations-of-a-phone-number/">17. Letter Combinations of a Phone Number (Medium)</a> — fixed-depth branching.</li>
    <li><a href="https://leetcode.com/problems/find-unique-binary-string/">1980. Find Unique Binary String (Medium)</a> — backtrack on bit choice.</li>
    <li><a href="https://leetcode.com/problems/generalized-abbreviation/">320. Generalized Abbreviation (Medium)</a> — abbreviate-or-keep at each char.</li>
  </ul>
</div>
