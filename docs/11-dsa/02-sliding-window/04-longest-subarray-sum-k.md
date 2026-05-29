# 04 — Longest subarray with sum ≤ K

> Sliding Window • 4/5

## Problem
Given an array of **non-negative** integers and an integer `K`, return the length of the longest contiguous subarray whose sum is at most `K`.

## Intuition
Non-negativity makes the window *monotone*: adding an element can only increase the sum, so if `[l, r]` violates `sum <= K`, every wider window does too — `l` must advance. That's the magic that makes the sliding window correct. Maintain a running `s`; expand `r`, and whenever `s > K`, shrink `l` until `s <= K` again. The invariant: at every step, `s == sum(arr[l..r])` and the window is the *longest valid window ending at `r`*. Each index moves at most twice, so the sweep is O(n). Without the non-negativity assumption, you'd need prefix sums + a BIT or deque trick.

## Algorithm
1. `l = 0, s = 0, best = 0`.
2. For `r` in 0..n-1:
   - `s += arr[r]`.
   - While `s > K`: `s -= arr[l]; l += 1`.
   - `best = max(best, r - l + 1)`.
3. Return `best`.

```python
def longest_sum_at_most_k(arr, K):
    l = s = best = 0
    for r in range(len(arr)):
        s += arr[r]
        while s > K:
            s -= arr[l]
            l += 1
        best = max(best, r - l + 1)
    return best
```

## Walkthrough
On `arr = [2, 1, 5, 1, 3, 2]`, `K = 7`:

1. **Extend.** `r=0` → `sum=2`, window `[2]`, `best=1`. `r=1` → `sum=3`, window `[2,1]`, `best=2`.
2. `r=2` → `sum=8 > 7`. **Shrink:** drop `arr[0]=2`, `sum=6`, `l=1`. Window `[1,5]`, `best` stays at `2`.
3. `r=3` → `sum=7`, exactly at the limit. Window `[1,5,1]`, `best=3`.
4. `r=4` → `sum=10 > 7`. Shrink: drop `1` → `9`, drop `5` → `4`, now `l=3`. Window `[1,3]`. `r=5` → `sum=6`, window `[1,3,2]`, length 3, `best` stays at `3`.
5. **End.** Return `best = 3`.

<div class="dsa-viz" data-algo="longest-subarray-sum-k"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- **Negative numbers break the monotonicity.** With negatives, shrinking left can make the sum *grow*, so the window can't shrink-only. Switch to prefix sums + sorted structure.
- Confusing `<= K` with `== K`. For exact-K problems, use a hash map of prefix sums.
- Forgetting to update `best` *after* the inner while — the window must be valid first.
- "Minimum size subarray sum ≥ K" (LC 209) is the mirror — shrink while `s >= K`, record on shrink.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/minimum-size-subarray-sum/">209. Minimum Size Subarray Sum (Medium)</a> — the mirror: shortest subarray with sum >= K.</li>
    <li><a href="https://leetcode.com/problems/max-consecutive-ones-iii/">1004. Max Consecutive Ones III (Medium)</a> — same template; treat each zero as cost 1.</li>
    <li><a href="https://leetcode.com/problems/get-equal-substrings-within-budget/">1208. Get Equal Substrings Within Budget (Medium)</a> — window with a numeric cost budget.</li>
    <li><a href="https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element/">1493. Longest Subarray of 1s After Deleting One Element (Medium)</a> — at most one zero allowed.</li>
    <li><a href="https://leetcode.com/problems/subarray-product-less-than-k/">713. Subarray Product Less Than K (Medium)</a> — multiply instead of add; count subarrays.</li>
    <li><a href="https://leetcode.com/problems/fruit-into-baskets/">904. Fruit Into Baskets (Medium)</a> — at most two distinct values.</li>
    <li><a href="https://leetcode.com/problems/maximum-sum-of-distinct-subarrays-with-length-k/">2461. Maximum Sum of Distinct Subarrays With Length K (Medium)</a> — fixed window with distinctness.</li>
    <li><a href="https://leetcode.com/problems/binary-subarrays-with-sum/">930. Binary Subarrays With Sum (Medium)</a> — "exactly K = atMost(K) - atMost(K - 1)".</li>
    <li><a href="https://leetcode.com/problems/count-number-of-nice-subarrays/">1248. Count Number of Nice Subarrays (Medium)</a> — same atMost trick on odd-counts.</li>
    <li><a href="https://leetcode.com/problems/subarrays-with-k-different-integers/">992. Subarrays with K Different Integers (Hard)</a> — the canonical "exactly K" reduction.</li>
  </ul>
</div>
