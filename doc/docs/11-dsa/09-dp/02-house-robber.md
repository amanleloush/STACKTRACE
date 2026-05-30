# 02 — House Robber

> Dynamic Programming • Position 2/11

## Problem
Given an array of non-negative integers where `nums[i]` is the loot in house `i`, return the maximum total you can rob without robbing two adjacent houses.

## Intuition
At each house you face a binary choice: **rob it** and skip the previous, or **skip it** and inherit the best result up to the previous house. That decision only depends on the two preceding answers, so this is a 1D DP with the same shape as Fibonacci — the difference is that we *maximize* instead of *sum*. The recurrence captures the adjacency constraint exactly.

## State & recurrence
- State: `dp[i]` = max loot achievable considering houses `0..i`.
- Transition: `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.
- Base case: `dp[0] = nums[0]`, `dp[1] = max(nums[0], nums[1])`.

## Algorithm
```python
def rob(nums: list[int]) -> int:
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]
    # rolling-2 scalars: prev2 = dp[i-2], prev1 = dp[i-1]
    prev2, prev1 = nums[0], max(nums[0], nums[1])
    for i in range(2, len(nums)):
        prev2, prev1 = prev1, max(prev1, prev2 + nums[i])
    return prev1
```

## Walkthrough
The widget runs on `nums = [2, 7, 9, 3, 1, 5, 8]`:

1. **Bases.** `dp[0] = 2` and `dp[1] = max(2, 7) = 7`. Watch the bottom `dp` row light up with `2, 7` while the rest stays blank.
2. **i = 2 (value 9).** `skip = dp[1] = 7`, `take = dp[0] + 9 = 11`. `dp[2] = max(7, 11) = 11` — **TAKE** this house (we rob 0 and 2).
3. **i = 3 (value 3).** `skip = 11`, `take = dp[1] + 3 = 10`. `dp[3] = 11` — **SKIP**, robbing house 3 isn't worth it.
4. **i = 5 (value 5).** `skip = dp[4] = 12`, `take = dp[3] + 5 = 16`. `dp[5] = 16` — **TAKE**, robbing house 5 on top of `{0, 2, 4}` wins.
5. **End.** After processing all 7 houses, `dp[6] = 20` — the maximum loot is **20** (rob houses 0, 2, 4, 6).

<div class="dsa-viz" data-algo="house-robber"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Forgetting the `dp[1] = max(nums[0], nums[1])` base — `nums[1]` alone is wrong when `nums[0]` is larger.
- Updating `prev2` and `prev1` in the wrong order; use parallel assignment.
- Confusing "adjacent" with "consecutive non-zero" — adjacency is purely about indices.
- Negative numbers — the problem typically guarantees non-negative; if not, you may need to allow `dp[i] = dp[i-1]` to skip losses.
- Missing the edge case `len(nums) == 1`.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/house-robber/">198. House Robber (Medium)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/house-robber-ii/">213. House Robber II (Medium)</a> — circular street; run twice excluding either endpoint.</li>
    <li><a href="https://leetcode.com/problems/house-robber-iii/">337. House Robber III (Medium)</a> — same idea on a binary tree with post-order DP.</li>
    <li><a href="https://leetcode.com/problems/delete-and-earn/">740. Delete and Earn (Medium)</a> — bucket by value, then House Robber.</li>
    <li><a href="https://leetcode.com/problems/paint-house/">256. Paint House (Medium)</a> — three-color adjacency DP.</li>
    <li><a href="https://leetcode.com/problems/paint-house-ii/">265. Paint House II (Hard)</a> — k colors, track best and second-best.</li>
    <li><a href="https://leetcode.com/problems/paint-fence/">276. Paint Fence (Medium)</a> — no three same colors in a row.</li>
    <li><a href="https://leetcode.com/problems/house-robber/">198. House Robber (Medium)</a> — re-solve with memoization to compare paradigms.</li>
    <li><a href="https://leetcode.com/problems/longest-arithmetic-subsequence/">1027. Longest Arithmetic Subsequence (Medium)</a> — DP keyed by index.</li>
    <li><a href="https://leetcode.com/problems/solving-questions-with-brainpower/">2140. Solving Questions With Brainpower (Medium)</a> — backward DP with skip distance.</li>
  </ul>
</div>
