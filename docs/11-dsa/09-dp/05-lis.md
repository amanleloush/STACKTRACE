# 05 — Longest Increasing Subsequence (O(n log n))

> Dynamic Programming • Position 5/11

## Problem
Given an integer array `nums`, return the length of the longest strictly increasing subsequence — the elements need not be contiguous, but must appear in their original order.

## Intuition
The O(n²) DP is `dp[i] = 1 + max(dp[j])` over `j < i` with `nums[j] < nums[i]`. We can do better with **patience sorting**: maintain a `tails` array where `tails[k]` is the *smallest possible tail* of any increasing subsequence of length `k + 1` seen so far. For each new number, binary-search the leftmost tail that is `≥ nums[i]` and overwrite it; if none qualifies, append. The length of `tails` at the end equals the LIS length. The array `tails` itself is not the LIS, but its length is correct.

## State & recurrence
- State: `tails[k]` = smallest possible tail value of any length-`(k+1)` increasing subsequence.
- Transition: for each `x = nums[i]`, find `j = lower_bound(tails, x)`. If `j == len(tails)`, append `x`; otherwise set `tails[j] = x`.
- Base case: `tails = []`. Every `x` either extends the longest run or improves a shorter run's tail.

## Algorithm
```python
from bisect import bisect_left

def lengthOfLIS(nums: list[int]) -> int:
    tails: list[int] = []
    for x in nums:
        j = bisect_left(tails, x)   # strict increase → bisect_left
        if j == len(tails):
            tails.append(x)
        else:
            tails[j] = x
    return len(tails)

# For non-strict (allow equals), use bisect_right.
# For the O(n^2) DP that also recovers the actual subsequence:
#   dp[i] = 1 + max(dp[j] for j < i if nums[j] < nums[i], default=0)
```

## Walkthrough
The widget runs on `nums = [10, 9, 2, 5, 3, 7, 101, 18, 4]`:

1. **First three values shrink `tails`.** `10` appends → `[10]`. `9` lands at index 0 → replace → `[9]`. `2` lands at index 0 → replace → `[2]`. Each replacement leaves the length unchanged but lowers the best tail.
2. **`5` grows the run.** `bisect_left([2], 5) = 1` equals the length, so we append → `tails = [2, 5]`.
3. **`3` improves the length-2 tail.** `bisect_left([2, 5], 3) = 1` → overwrite `tails[1] = 3` → `[2, 3]`. The LIS still has length 2, but the tail is smaller and easier to extend.
4. **`7`, then `101`** both append → `[2, 3, 7]` then `[2, 3, 7, 101]`. `18` then replaces `101` at index 3 → `[2, 3, 7, 18]`.
5. **End — `4` overwrites `7`.** `bisect_left([2, 3, 7, 18], 4) = 2` → `tails = [2, 3, 4, 18]`. LIS length = **4** (note `tails` is *not* the LIS itself — `[2, 3, 4, 18]` doesn't appear in this order in the input).

<div class="dsa-viz" data-algo="lis"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log n)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- Treating `tails` as the actual LIS — it is not; it's only correct as a length witness.
- Using `bisect_right` when the problem demands *strictly* increasing — that admits equal values.
- Forgetting that the binary search must be on the running `tails` array, not the input.
- For 2D variants (Russian Doll Envelopes), sort by one dimension ascending and the other descending — the descending tiebreak prevents same-width envelopes from chaining.
- The O(n²) DP is easier to extend (counting paths, reconstructing the sequence) — pick the right tool for the question.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/longest-increasing-subsequence/">300. Longest Increasing Subsequence (Medium)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/russian-doll-envelopes/">354. Russian Doll Envelopes (Hard)</a> — 2D LIS with clever sort.</li>
    <li><a href="https://leetcode.com/problems/number-of-longest-increasing-subsequence/">673. Number of Longest Increasing Subsequence (Medium)</a> — count plus length.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-removals-to-make-mountain-array/">1671. Minimum Number of Removals to Make Mountain Array (Hard)</a> — LIS from both ends.</li>
    <li><a href="https://leetcode.com/problems/find-the-longest-valid-obstacle-course-at-each-position/">1964. Find the Longest Valid Obstacle Course at Each Position (Hard)</a> — non-strict LIS prefixes.</li>
    <li><a href="https://leetcode.com/problems/maximum-length-of-pair-chain/">646. Maximum Length of Pair Chain (Medium)</a> — interval-style LIS.</li>
    <li><a href="https://leetcode.com/problems/non-decreasing-subsequences/">491. Non-decreasing Subsequences (Medium)</a> — enumerate rather than length.</li>
    <li><a href="https://leetcode.com/problems/best-team-with-no-conflicts/">1626. Best Team With No Conflicts (Medium)</a> — weighted LIS.</li>
    <li><a href="https://leetcode.com/problems/largest-divisible-subset/">368. Largest Divisible Subset (Medium)</a> — LIS with a divisibility predicate.</li>
    <li><a href="https://leetcode.com/problems/longest-arithmetic-subsequence/">1027. Longest Arithmetic Subsequence (Medium)</a> — DP keyed by (index, difference).</li>
  </ul>
</div>
