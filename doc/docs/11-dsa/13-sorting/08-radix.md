# 08 — Radix Sort (LSD)

> Sorting • Position 8/8

## Problem
Sort fixed-width integers (or strings) in linear time when keys are too sparse for counting sort.

## Intuition
Run counting sort on the **least-significant digit first**, then the next digit, then the next — `d` passes total. Because each pass uses a stable counting sort, keys with the same current digit stay in the order established by earlier (less-significant) passes. **Invariant**: after pass `i`, the array is correctly sorted by the bottom `i` digits. After `d` passes the entire key is sorted. For 64-bit integers in base 256 that's 8 passes regardless of n — total cost O(8n) which is linear in n.

## Algorithm
Iterate digits from least to most significant, stable-sorting on each.

```python
def radix_sort(a, base=10):
    if not a: return a
    lo = min(a)
    a = [x - lo for x in a]              # shift to non-negative
    max_v = max(a)
    exp = 1
    while exp <= max_v:
        a = counting_by_digit(a, exp, base)
        exp *= base
    return [x + lo for x in a]

def counting_by_digit(a, exp, base):
    cnt = [0] * base
    for v in a: cnt[(v // exp) % base] += 1
    for i in range(1, base): cnt[i] += cnt[i - 1]
    out = [0] * len(a)
    for v in reversed(a):
        d = (v // exp) % base
        cnt[d] -= 1
        out[cnt[d]] = v
    return out
```

## Walkthrough
The widget sorts `[170, 45, 75, 90, 802, 24, 2, 66]` in base 10 (10 buckets per pass):

1. **Pass 0 — ones digit (10⁰).** Each value drops into bucket `value % 10`. Bucket `d=0` collects `[170, 90]`, `d=2` collects `[802, 2]`, `d=5` collects `[45, 75]`, and so on. Flatten left-to-right → `[170, 90, 802, 2, 24, 45, 75, 66]`.
2. **Pass 1 — tens digit (10¹).** Digits of the current array: `7, 9, 0, 0, 2, 4, 7, 6`. Bucket `d=0` gets `[802, 2]`, `d=7` gets `[170, 75]` — note `170` lands before `75` because the previous pass already settled their ones-digit order. Flatten → `[802, 2, 24, 45, 66, 170, 75, 90]`.
3. **Pass 2 — hundreds digit (10²).** Six values have hundreds-digit `0`, one has `1` (`170`), one has `8` (`802`). Bucket `d=0` collects `[2, 24, 45, 66, 75, 90]` in their already-correct relative order.
4. **Stability matters.** Because each per-digit step is stable, ties on the current digit retain the order from the previous (less-significant) pass — that's why earlier work isn't undone.
5. **End.** After flattening pass 2 → `[2, 24, 45, 66, 75, 90, 170, 802]`. Max value 802 has 3 digits, so 3 passes were enough.

<div class="dsa-viz" data-algo="radix-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(d · (n + k))</strong></span>
  <span>space <strong>O(n + k)</strong></span>
  <span>stable? <strong>yes</strong></span>
  <span>in-place? <strong>no</strong></span>
</div>

## Pitfalls
- **Stability is mandatory** — if the per-digit sort isn't stable, earlier digits get scrambled. Use counting sort, not insertion or selection.
- LSD-radix needs **fixed-width** keys; for variable-length strings, use MSD-radix or left-pad.
- Negative numbers: shift everything by `−min` before sorting, then shift back.
- Choosing base 10 is intuitive but inefficient. Real implementations use base 256 (one byte per pass) — 4 passes for a 32-bit int, 8 for 64-bit.
- "Radix sort is linear" hides the constant `d`. For genuinely large keys (e.g., 1000-digit strings), radix can lose to comparison sorts.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/sort-an-array/">Sort an Array (Med)</a> — bring radix to the benchmark.</li>
    <li><a href="https://leetcode.com/problems/maximum-gap/">Maximum Gap (Hard)</a> — classic radix or bucket sort application.</li>
    <li><a href="https://leetcode.com/problems/relative-sort-array/">Relative Sort Array (Easy)</a> — bounded values let radix shine.</li>
    <li><a href="https://leetcode.com/problems/h-index/">H-Index (Med)</a> — counting/radix on citations.</li>
    <li><a href="https://leetcode.com/problems/rank-transform-of-an-array/">Rank Transform of an Array (Easy)</a> — sort to assign ranks.</li>
    <li><a href="https://leetcode.com/problems/sort-integers-by-the-number-of-1-bits/">Sort Integers by Number of 1 Bits (Easy)</a> — composite key sort.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-increasing-frequency/">Sort Array by Increasing Frequency (Easy)</a> — pair sort.</li>
    <li><a href="https://leetcode.com/problems/sorting-the-sentence/">Sorting the Sentence (Easy)</a> — index-based placement.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-parity/">Sort Array By Parity (Easy)</a> — partition by single bit.</li>
    <li><a href="https://leetcode.com/problems/wiggle-sort/">Wiggle Sort (Med)</a> — sort then interleave.</li>
  </ul>
</div>
