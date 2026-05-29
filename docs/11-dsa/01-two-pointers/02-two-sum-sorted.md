# 02 — Two Sum on sorted array

> Two Pointers • 2/6

## Problem
Given a **sorted** array and a target `T`, return the indices of two elements that sum to `T` (or report that none exist). O(1) extra space.

## Intuition
If `arr[l] + arr[r] < T`, the smallest available pair on the right (`arr[l] + arr[r]`) already underflows — every pair using `l` underflows too, so `l` must move right. Symmetrically, if the sum overflows, `r` must move left. Each move discards a whole row or column of candidate pairs, so the algorithm visits at most `n` pointer positions total. The invariant: every pair we've skipped is provably not the answer.

## Algorithm
1. Start `l = 0`, `r = n - 1`.
2. Compute `s = arr[l] + arr[r]`.
3. If `s == T`, return `(l, r)`.
4. If `s < T`, increment `l`. Else decrement `r`.
5. Repeat until `l >= r`.

```python
def two_sum_sorted(arr, T):
    l, r = 0, len(arr) - 1
    while l < r:
        s = arr[l] + arr[r]
        if s == T:
            return (l, r)
        if s < T:
            l += 1
        else:
            r -= 1
    return None
```

## Walkthrough
On `[1, 3, 4, 6, 8, 11]`, target `10`:

- Step 1 — `l=0, r=5`: `1 + 11 = 12 > 10` → `r--`.
- Step 2 — `l=0, r=4`: `1 + 8 = 9 < 10` → `l++`.
- Step 3 — `l=1, r=4`: `3 + 8 = 11 > 10` → `r--`.
- Step 4 — `l=1, r=3`: `3 + 6 = 9 < 10` → `l++`.
- Step 5 — `l=2, r=3`: `4 + 6 = 10` → return `(2, 3)`.

<div class="dsa-viz" data-algo="two-sum-sorted"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Forgetting the array is **already sorted** — if it isn't, a hash-map solution in O(n) time / O(n) space is the right call.
- LeetCode 167 uses **1-indexed** return values — read the problem statement carefully.
- With duplicates and a "find all unique pairs" twist, advance `l` and `r` past equal neighbours after each match.
- For 3Sum / 4Sum, the outer loop fixes one (or two) elements; only the inner pair is two-pointer. Don't try to two-pointer everything at once.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/">167. Two Sum II — Input Array Is Sorted (Easy)</a> — the canonical statement; mind the 1-indexing.</li>
    <li><a href="https://leetcode.com/problems/two-sum/">1. Two Sum (Easy)</a> — unsorted variant; hash-map is the cleaner path.</li>
    <li><a href="https://leetcode.com/problems/squares-of-a-sorted-array/">977. Squares of a Sorted Array (Easy)</a> — merge from both ends because squares grow at both extremes.</li>
    <li><a href="https://leetcode.com/problems/sum-of-square-numbers/">633. Sum of Square Numbers (Medium)</a> — same template over the implicit range `[0, sqrt(c)]`.</li>
    <li><a href="https://leetcode.com/problems/two-sum-iv-input-is-a-bst/">653. Two Sum IV — Input is a BST (Easy)</a> — in-order iterators from both ends mimic two pointers.</li>
    <li><a href="https://leetcode.com/problems/merge-sorted-array/">88. Merge Sorted Array (Easy)</a> — write from the tail to avoid overwriting.</li>
    <li><a href="https://leetcode.com/problems/k-diff-pairs-in-an-array/">532. K-diff Pairs in an Array (Medium)</a> — same idea with difference instead of sum.</li>
    <li><a href="https://leetcode.com/problems/3sum/">15. 3Sum (Medium)</a> — fix one element, two-pointer the rest.</li>
    <li><a href="https://leetcode.com/problems/3sum-closest/">16. 3Sum Closest (Medium)</a> — track the running best difference.</li>
    <li><a href="https://leetcode.com/problems/4sum/">18. 4Sum (Medium)</a> — two nested fixed indices, then two-pointer.</li>
  </ul>
</div>
