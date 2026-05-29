# 01 — Single Number (XOR fold)

> Bit Manipulation • Position 1/4

## Problem
Every element appears twice except one. Find the one. Constant extra space.

## Intuition
XOR has three properties that collapse this problem to a one-liner: `a ^ a = 0`, `a ^ 0 = a`, and it's commutative + associative. Fold XOR across the whole array and every duplicated pair annihilates, leaving the lone element behind. No hash map, no sort, no extra memory — just one accumulator. This generalizes: for "two singles among pairs" XOR the whole thing to get `a ^ b`, then pick any set bit of `a^b` (it's a bit where they differ) and partition.

## Algorithm
```python
def single_number(nums):
    out = 0
    for x in nums:
        out ^= x
    return out
```

## Walkthrough
1. `nums = [4, 1, 2, 1, 2]`. `out = 0`.
2. XOR 4 → `out = 4` (binary `100`).
3. XOR 1 → `out = 5` (`101`).
4. XOR 2 → `out = 7` (`111`). XOR 1 → `out = 6` (`110`). XOR 2 → `out = 4` (`100`).
5. Loop ends. Return **4**. The two 1s and two 2s cancelled; 4 survived.

<div class="dsa-viz" data-algo="single-number-xor"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Reaching for a hash map "to be safe" — the problem explicitly tests that you know XOR.
- For LC 137 (every element thrice except one), naive XOR doesn't work — pairs of three don't cancel. Use two-bit counter trick: `ones = (ones ^ x) & ~twos; twos = (twos ^ x) & ~ones`.
- For LC 260 (two singles), forgetting to mask with `x & -x` to isolate the diff bit.
- Confusing "missing number" (LC 268) with single number — for missing, XOR all indices and all values.
- Sign extension in languages with signed integers: in Java, beware `Integer.MIN_VALUE`; in Python, ints are unbounded so no issue.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/single-number/">136 Single Number (Easy)</a> — canonical XOR fold.</li>
    <li><a href="https://leetcode.com/problems/single-number-ii/">137 Single Number II (Med)</a> — two-bit state per position.</li>
    <li><a href="https://leetcode.com/problems/single-number-iii/">260 Single Number III (Med)</a> — partition by isolated diff bit.</li>
    <li><a href="https://leetcode.com/problems/missing-number/">268 Missing Number (Easy)</a> — XOR indices and values.</li>
    <li><a href="https://leetcode.com/problems/find-the-duplicate-number/">287 Find the Duplicate Number (Med)</a> — Floyd's cycle, not XOR.</li>
    <li><a href="https://leetcode.com/problems/find-the-difference/">389 Find the Difference (Easy)</a> — XOR two strings.</li>
    <li><a href="https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/">421 Maximum XOR of Two Numbers (Med)</a> — binary trie.</li>
    <li><a href="https://leetcode.com/problems/hamming-distance/">461 Hamming Distance (Easy)</a> — popcount of XOR.</li>
    <li><a href="https://leetcode.com/problems/set-mismatch/">645 Set Mismatch (Easy)</a> — XOR pairs to find dup and missing.</li>
    <li><a href="https://leetcode.com/problems/complement-of-base-10-integer/">1009 Complement of Base 10 Integer (Easy)</a> — XOR with mask of same width.</li>
  </ul>
</div>
