---
title: Bit Manipulation
---

# DSA · 12 · Bit Manipulation

> XOR tricks, popcount DP, bitmask DP for exponential state compression.

## When to use this pattern
- The phrase "appears once, all others appear twice" almost always wants XOR.
- "Power of two / four / single bit set" reduces to one line with `n & (n-1)`.
- Subset enumeration with `n ≤ 20` — an `int` is your subset, bit `i` means element `i` is in.
- Counting bits across a range — recursive DP `f(x) = f(x >> 1) + (x & 1)`.
- TSP-style problems on small graphs — state = `(visited_mask, last_node)`.

## The shape of the solution
Every problem in this section pivots on one of four primitives. **XOR** ( `a ^ a = 0`, `a ^ 0 = a`, commutative ) for "cancel duplicates." **`n & (n-1)`** to clear the lowest set bit — counts bits in O(popcount) and detects powers of two. **`n & -n`** to isolate the lowest set bit (the "Brian Kernighan trick"). **Iterating subsets** of a mask with `sub = (sub - 1) & mask` — used in submask DP. Once you recognize which primitive applies, the code is usually shorter than its proof.

## Topics in this section
<div class="topic-grid">
  <a class="topic-card" href="01-single-number/"><span class="topic-card__num">01</span><h3>Single Number (XOR)</h3><p>Fold everything; duplicates cancel.</p></a>
  <a class="topic-card" href="02-counting-bits/"><span class="topic-card__num">02</span><h3>Counting Bits</h3><p>O(n) DP on popcount.</p></a>
  <a class="topic-card" href="03-power-of-two/"><span class="topic-card__num">03</span><h3>Power of Two</h3><p>One AND, one comparison.</p></a>
  <a class="topic-card" href="04-bitmask-tsp/"><span class="topic-card__num">04</span><h3>Bitmask TSP</h3><p>Subset DP for n ≤ 20.</p></a>
</div>

## Common variations
For "single number among triples" (LC 137), simulate a 3-state counter per bit with two ints and bit ops. For "two singles among pairs" (LC 260), XOR the whole array → result is `a^b`; pick any set bit of that, partition by that bit, XOR each half. Bitmask DP scales as O(2^n · n²) for TSP and O(3^n) for "iterate all submasks of all masks" — the second sum is famous: `Σ C(n,k) · 2^k = 3^n`. For huge `n`, switch to meet-in-the-middle (split into two halves of 2^(n/2) each).
