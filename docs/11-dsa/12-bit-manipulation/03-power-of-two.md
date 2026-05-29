# 03 — Power of Two (n & (n-1))

> Bit Manipulation • Position 3/4

## Problem
Return True iff `n` is a power of two — i.e., has exactly one set bit.

## Intuition
Subtracting 1 from a power of two flips all bits at and below the lone set bit: `1000 - 1 = 0111`. AND them together and you get zero. For any other positive integer, at least one higher bit survives the AND. So `n > 0 and (n & (n-1)) == 0` is the entire check. The same idiom counts set bits one at a time (Brian Kernighan's algorithm — each iteration clears one bit), and lets you isolate the lowest set bit with `n & -n` in two's complement.

## Algorithm
```python
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0
```

## Walkthrough
Example: `n = 16` (shown over an 8-bit window).

1. **Input.** `n = 16` → binary `00010000` — a single set bit at position 4.
2. **Compute `n − 1`.** `n - 1 = 15` → binary `00001111`. Every bit at and below the lone set bit has flipped.
3. **AND bit-by-bit.** Line up the rows: `00010000 & 00001111`. No column has a 1 in both rows → every output bit is 0.
4. **Check the result.** `n & (n-1) = 00000000 = 0` (decimal 0).
5. **End.** Result is zero and `n > 0` → `16` **IS a power of two**. (Re-running with `n = 12 = 1100` would give `12 & 11 = 1000 ≠ 0` → not a power of two.)

<div class="dsa-viz" data-algo="power-of-two"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(1)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Forgetting the `n > 0` guard — `(0 & -1) == 0`, so 0 would falsely pass.
- For power-of-three/four/etc., the bit trick doesn't generalize cleanly. LC 326: check `n > 0 and (3^19) % n == 0`. LC 342: power of two **and** the set bit is at an even position (`n & 0xAAAAAAAA == 0`).
- Confusing `n & -n` (isolates lowest set bit) with `n & (n-1)` (clears lowest set bit).
- Using `Math.log` — floating-point error makes it unreliable for large powers.
- In Java/C++, watch sign on `Integer.MIN_VALUE`: `n-1` overflows for `n = 0x80000000`, but the AND still yields 0.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/power-of-two/">231 Power of Two (Easy)</a> — canonical `n & (n-1)`.</li>
    <li><a href="https://leetcode.com/problems/power-of-three/">326 Power of Three (Easy)</a> — divide by 3 or check largest power.</li>
    <li><a href="https://leetcode.com/problems/power-of-four/">342 Power of Four (Easy)</a> — power of two + even-position set bit.</li>
    <li><a href="https://leetcode.com/problems/number-of-1-bits/">191 Number of 1 Bits (Easy)</a> — Kernighan iteration.</li>
    <li><a href="https://leetcode.com/problems/hamming-distance/">461 Hamming Distance (Easy)</a> — popcount of XOR.</li>
    <li><a href="https://leetcode.com/problems/add-binary/">67 Add Binary (Easy)</a> — bit-wise carry loop.</li>
    <li><a href="https://leetcode.com/problems/gray-code/">89 Gray Code (Med)</a> — `i ^ (i >> 1)`.</li>
    <li><a href="https://leetcode.com/problems/reverse-bits/">190 Reverse Bits (Easy)</a> — 32-loop or byte-swap.</li>
    <li><a href="https://leetcode.com/problems/missing-number/">268 Missing Number (Easy)</a> — XOR or sum.</li>
    <li><a href="https://leetcode.com/problems/complement-of-base-10-integer/">1009 Complement of Base 10 Integer (Easy)</a> — XOR with width mask.</li>
  </ul>
</div>
