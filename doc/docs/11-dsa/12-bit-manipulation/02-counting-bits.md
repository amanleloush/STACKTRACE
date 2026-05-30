# 02 — Counting Bits

> Bit Manipulation • Position 2/4

## Problem
For every integer in `[0, n]`, count the number of set bits. Return all `n+1` answers.

## Intuition
Three reformulations of the same DP, increasing in cleverness. **(a)** `popcount(i) = popcount(i >> 1) + (i & 1)` — the top bits of `i` are the same as `i//2`, plus possibly one more for the parity. **(b)** `popcount(i) = popcount(i & (i-1)) + 1` — `i & (i-1)` clears the lowest set bit, so the rest is recursive. **(c)** `popcount(i) = popcount(i - lowest_pow2(i)) + 1` — strip the highest power of two and recurse. All three are O(n); pick the one you remember.

## Algorithm
```python
def count_bits(n):
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits
```

## Walkthrough
Example: `n = 10`.

1. **Base case.** `dp[0] = 0` — zero has no set bits. Table = `[0, ·, ·, ·, ·, ·, ·, ·, ·, ·, ·]`.
2. **Odd `i` adds 1.** `i=1`: `dp[1] = dp[0] + 1 = 1`. `i=3`: `dp[3] = dp[1] + 1 = 2`. `i=5`: `dp[5] = dp[2] + 1 = 2`. `i=7`: `dp[7] = dp[3] + 1 = 3`. `i=9`: `dp[9] = dp[4] + 1 = 2`.
3. **Even `i` inherits from `i>>1`.** `i=2`: `dp[2] = dp[1] + 0 = 1`. `i=4`: `dp[4] = dp[2] + 0 = 1`. `i=6`: `dp[6] = dp[3] + 0 = 2`. `i=8`: `dp[8] = dp[4] + 0 = 1`. `i=10`: `dp[10] = dp[5] + 0 = 2`.
4. **Walk the binary rows.** The visualization highlights `i` (gold) and `i>>1` (cyan) on each tick — confirming that `dp[i]` reads the row above-and-half.
5. **End.** Final array `dp = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2]` — popcounts of 0…10.

<div class="dsa-viz" data-algo="counting-bits"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- Calling a library `popcount(i)` in a loop — O(n · log n), fine but misses the point of the problem.
- Off-by-one in array size — you need `n+1` entries, not `n`.
- Trying `bits[i] = bits[i-1] + …` — wrong; the recurrence is on `i >> 1`, not `i - 1`.
- For 64-bit ints in Java/C++, use unsigned right shift to avoid sign extension.
- In Python, `bin(i).count("1")` works but allocates a string per number; the DP is what's expected.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/counting-bits/">338 Counting Bits (Easy)</a> — canonical popcount DP.</li>
    <li><a href="https://leetcode.com/problems/number-of-1-bits/">191 Number of 1 Bits (Easy)</a> — per-number popcount via `n &= n-1`.</li>
    <li><a href="https://leetcode.com/problems/prime-number-of-set-bits-in-binary-representation/">762 Prime Number of Set Bits in Binary Representation (Easy)</a> — popcount + primality.</li>
    <li><a href="https://leetcode.com/problems/sort-integers-by-the-number-of-1-bits/">1356 Sort Integers by The Number of 1 Bits (Easy)</a> — popcount as sort key.</li>
    <li><a href="https://leetcode.com/problems/total-hamming-distance/">477 Total Hamming Distance (Med)</a> — count per bit position.</li>
    <li><a href="https://leetcode.com/problems/hamming-distance/">461 Hamming Distance (Easy)</a> — popcount of XOR.</li>
    <li><a href="https://leetcode.com/problems/binary-number-with-alternating-bits/">693 Binary Number with Alternating Bits (Easy)</a> — XOR with right-shift.</li>
    <li><a href="https://leetcode.com/problems/circular-permutation-in-binary-representation/">1238 Circular Permutation in Binary Representation (Med)</a> — Gray code with start.</li>
    <li><a href="https://leetcode.com/problems/gray-code/">89 Gray Code (Med)</a> — `i ^ (i >> 1)`.</li>
    <li><a href="https://leetcode.com/problems/convert-a-number-to-hexadecimal/">405 Convert a Number to Hexadecimal (Easy)</a> — 4-bit nibble loop.</li>
  </ul>
</div>
