---
title: Bit Manipulation — cheatsheet
---

# Bit Manipulation · Cheatsheet

> One-page recall. Print, paste in Notion, glance before the interview.

## Trigger
**You see in the problem:** "XOR", "count set bits", "power of two / four", "single number among duplicates", "subset enumeration with n ≤ 20", "bitmask DP / TSP", "swap without temp variable".

**Reach for this pattern when:**
- The problem hints at **binary structure** — flags, sets of ≤ 32/64 items, parity.
- Pair / duplicate logic that screams **XOR** (a^a=0, a^0=a).
- **Bitmask DP** for n ≤ 20 — encode subset as an int.
- You need to enumerate **all subsets** of a set quickly.

**Don't reach for it when:**
- The cleverness gains < 5 lines but readability collapses — for interview, use straightforward code unless asked.
- The set is large (> 64 items) — use real sets/bitsets.

## The mental model
An integer is a packed array of bits. Each bit position is a switch. Bitwise ops do **per-position parallel computation** in O(1). Combine them with arithmetic tricks (`x & -x`, `x & (x-1)`) for set-bit manipulation. For DP, a state = subset of items encoded as an int from 0 to 2^n - 1.

## Skeleton

```python
# Core operations
x | (1 << i)        # set bit i
x & ~(1 << i)       # clear bit i
x ^ (1 << i)        # toggle bit i
(x >> i) & 1        # read bit i

# Tricks
x & -x              # lowest set bit (as a value)
x & (x - 1)         # x with lowest set bit cleared
x | (x + 1)         # x with lowest cleared bit set

# Count set bits (popcount)
def popcount(x):
    c = 0
    while x:
        x &= x - 1
        c += 1
    return c
# or: bin(x).count('1')  /  x.bit_count() in Python 3.10+

# XOR trick: find the unique number where others appear twice
def single_number(nums):
    r = 0
    for n in nums: r ^= n
    return r

# Iterate all subsets of a mask
m = mask
while m > 0:
    process(m)
    m = (m - 1) & mask
# Iterate all masks of size n: for m in range(1 << n): ...

# Bitmask DP skeleton (TSP-style)
def tsp(dist):
    n = len(dist)
    INF = float('inf')
    dp = [[INF] * n for _ in range(1 << n)]
    dp[1][0] = 0                       # start at city 0
    for mask in range(1 << n):
        for u in range(n):
            if dp[mask][u] == INF or not (mask >> u) & 1: continue
            for v in range(n):
                if (mask >> v) & 1: continue
                nm = mask | (1 << v)
                dp[nm][v] = min(dp[nm][v], dp[mask][u] + dist[u][v])
    return min(dp[(1 << n) - 1][v] + dist[v][0] for v in range(1, n))
```

## Complexity
- Each bit op: **O(1)**.
- Bitmask DP: **O(2^n × n)** or **O(2^n × n²)**.
- Subset enumeration of n items: **O(2^n)**.

## Variants in this pattern
1. **XOR pairing** — find the one (or two) elements appearing odd times.
2. **Power-of-two check** — `x > 0 and x & (x - 1) == 0`.
3. **Counting bits** — popcount, Brian Kernighan's `x &= x-1` loop.
4. **Subset enumeration** — iterate all subsets of an n-bit mask.
5. **Bitmask DP / TSP / assignment** — small-n exhaustive optimization.
6. **Bit-tricks for sets** — fast set ops on ≤ 64-element universes (membership, union, intersect).

## Top problems
- [LC 136 — Single Number](https://leetcode.com/problems/single-number/) (Easy) — XOR everything.
- [LC 137 — Single Number II](https://leetcode.com/problems/single-number-ii/) (Med) — bit-counting mod 3.
- [LC 191 — Number of 1 Bits](https://leetcode.com/problems/number-of-1-bits/) (Easy) — popcount.
- [LC 338 — Counting Bits](https://leetcode.com/problems/counting-bits/) (Easy) — `dp[i] = dp[i >> 1] + (i & 1)`.
- [LC 231 — Power of Two](https://leetcode.com/problems/power-of-two/) (Easy) — `n > 0 and n & (n-1) == 0`.
- [LC 78 — Subsets](https://leetcode.com/problems/subsets/) (Med) — also solvable by iterating mask 0..(1<<n)-1.
- [LC 847 — Shortest Path Visiting All Nodes](https://leetcode.com/problems/shortest-path-visiting-all-nodes/) (Hard) — bitmask + BFS.

## Common bugs / pitfalls
- **Operator precedence** — `(x >> i) & 1` needs parens; `x >> i & 1` is also fine but write parens for safety.
- **Signed vs unsigned** in Java/C++ — Python is fine, but elsewhere right-shift on negatives differs (`>>` vs `>>>` in Java).
- **`x & (x - 1) == 0`** also matches `x == 0` — guard with `x > 0` for power-of-two checks.
- **Bitmask subset enumeration** off-by-one — loop is `m = (m-1) & mask` until `m == 0`; then process `m == 0` separately (empty subset).
- **Shifting by ≥ bit width** is undefined in C/C++ (Python is fine). Don't `1 << 32` casually in other languages.
- **XOR doesn't help** when duplicates appear 3+ times — use bit-counting mod 3 (LC 137).

## In 30 seconds
Per-bit parallel ops in O(1). XOR for "find the odd one out", bitmask for "subset of ≤ 20 things". Memorize `x & -x`, `x & (x-1)`, popcount, and the subset-of-mask iteration trick.
