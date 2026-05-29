# 03 — Combinations C(n, k)

> Backtracking • Position 3/6

## Problem
Return all ways to choose `k` numbers from `1..n`. Order within a combination doesn't matter; `[1,2]` and `[2,1]` are the same.

## Intuition
Because order doesn't matter, fix a **canonical ordering**: always pick increasing indices. A monotone `start` pointer rises after every choice, so the same combination can never be generated twice. The **invariant** is that `path` holds a strictly-increasing sequence drawn from `[1..n]`, and we stop branching once `len(path) == k`.

## Algorithm
Stop the moment `path` has `k` items. While recursing, only try numbers `≥ start`, and bail out early when there aren't enough remaining numbers to fill the slots.

```python
def combine(n, k):
    res, path = [], []

    def dfs(start):
        if len(path) == k:
            res.append(path[:])
            return
        # pruning: need (k - len(path)) more, must leave that many
        for i in range(start, n - (k - len(path)) + 2):
            path.append(i)
            dfs(i + 1)
            path.pop()

    dfs(1)
    return res
```

## Walkthrough
The widget runs on `n = 4, k = 2`:

1. **`bt(start=1, path=[])`.** Include `1` → push, recurse `bt(2, [1])`.
2. **Inside `bt(2, [1])`** the path has length k=2 once `2` is appended → emit `[1, 2]`. Pop `2`, then try `3` → emit `[1, 3]`. Pop. Try `4` → emit `[1, 4]`. Subtree under root `1` finishes.
3. **Back at the root**, pop `1`, then include `2`. Subtree emits `[2, 3]` then `[2, 4]`.
4. **Roots `3` and beyond.** Include `3` → emit `[3, 4]`. Trying `4` as a root would leave only `4` available (path length 1) — the loop exits because we'd never reach `k`.
5. **End.** Six combinations recorded — exactly `C(4, 2) = 6`: `[1,2] · [1,3] · [1,4] · [2,3] · [2,4] · [3,4]`.

<div class="dsa-viz" data-algo="combinations"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(k · C(n,k))</strong></span>
  <span>space <strong>O(k)</strong> recursion (output excluded)</span>
</div>

## Pitfalls
- Looping over all `n` numbers at every depth — produces duplicate orderings and explodes the runtime.
- Recursing with `dfs(i)` instead of `dfs(i + 1)` — allows reuse, which is a different problem.
- Skipping the pruning bound — passes small cases but TLEs on `n=20, k=10`.
- Off-by-one in the pruning bound: the upper limit should be `n - (k - len(path)) + 1` (inclusive).
- Forgetting that LeetCode uses 1-indexed numbers — starting at `0` gives wrong output.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/combinations/">77. Combinations (Medium)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/subsets/">78. Subsets (Medium)</a> — same skeleton without the k constraint.</li>
    <li><a href="https://leetcode.com/problems/combination-sum/">39. Combination Sum (Medium)</a> — reuse allowed, prune by target.</li>
    <li><a href="https://leetcode.com/problems/combination-sum-ii/">40. Combination Sum II (Medium)</a> — no reuse + duplicates.</li>
    <li><a href="https://leetcode.com/problems/combination-sum-iii/">216. Combination Sum III (Medium)</a> — k numbers summing to n from 1..9.</li>
    <li><a href="https://leetcode.com/problems/letter-combinations-of-a-phone-number/">17. Letter Combinations of a Phone Number (Medium)</a> — fixed-depth combination tree.</li>
    <li><a href="https://leetcode.com/problems/gray-code/">89. Gray Code (Medium)</a> — sequence each differing by one bit.</li>
    <li><a href="https://leetcode.com/problems/circular-permutation-in-binary-representation/">1238. Circular Permutation in Binary Representation (Medium)</a> — Gray code with a start.</li>
    <li><a href="https://leetcode.com/problems/factor-combinations/">254. Factor Combinations (Medium)</a> — divisor-based combinations.</li>
    <li><a href="https://leetcode.com/problems/count-good-numbers/">1922. Count Good Numbers (Medium)</a> — counting variant by exponent.</li>
  </ul>
</div>
