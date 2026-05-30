# 07 — Counting Sort

> Sorting • Position 7/8

## Problem
Sort an array of integers in a known small range in linear time.

## Intuition
Don't compare — *tally*. Build a count array `cnt[v]` of how many times each value `v` appears, then walk `cnt` in order and write each value back to the output that many times. To keep stability and to handle satellite data, do a **prefix-sum** pass over `cnt` so that `cnt[v]` becomes the *position* where the next `v` should land in the output, then iterate the input from right to left placing each element. **Invariant** (stable version): after the right-to-left placement, equal keys appear in their original relative order. Total work is O(n + k) where `k` is the range of values.

## Algorithm
Tally → prefix sum → place from right.

```python
def counting_sort(a):
    if not a: return a
    lo, hi = min(a), max(a)
    k = hi - lo + 1
    cnt = [0] * k
    for v in a:                          # tally
        cnt[v - lo] += 1
    for i in range(1, k):                # prefix sum
        cnt[i] += cnt[i - 1]
    out = [0] * len(a)
    for v in reversed(a):                # place from right for stability
        cnt[v - lo] -= 1
        out[cnt[v - lo]] = v
    return out
```

## Walkthrough
The widget sorts `[4, 2, 2, 8, 3, 3, 1]` with `K = max = 8` (the simple "emit each value `count[v]` times" variant — see Pitfalls for the stable prefix-sum form):

1. **Tally pass.** Walk the input; each step increments one bucket. After processing `4, 2, 2`, `count = [0, 0, 2, 0, 1, 0, 0, 0, 0]`.
2. **Tally complete.** After all 7 inputs: `count = [0, 1, 2, 2, 1, 0, 0, 0, 1]` — one `1`, two `2`s, two `3`s, one `4`, one `8`.
3. **Emit phase, v = 0..3.** `count[0] = 0` → skip. `v=1` → emit `1` once → `out = [1]`. `v=2` → emit `2` twice → `out = [1, 2, 2]`. `v=3` → emit `3` twice → `out = [1, 2, 2, 3, 3]`.
4. **Mid-emit, v = 4, 5..7.** `v=4` → emit `4` once → `out = [1, 2, 2, 3, 3, 4]`. `v=5, 6, 7` all have `count = 0` → skip (the "current" highlight moves but nothing is appended).
5. **End — v = 8.** Emit `8` once → `out = [1, 2, 2, 3, 3, 4, 8]`. Zero comparisons performed; the output emerged from three linear walks.

<div class="dsa-viz" data-algo="counting-sort"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n + k)</strong></span>
  <span>space <strong>O(n + k)</strong></span>
  <span>stable? <strong>yes</strong></span>
  <span>in-place? <strong>no</strong></span>
</div>

## Pitfalls
- **Blows up when `k` is huge** — sorting `[0, 10⁹]` of length 5 with a count array of size 10⁹ is a disaster. Use only when `k = O(n)`.
- Forgetting to shift by `lo` when the minimum is negative — your indices go out of bounds.
- Iterating the input *left-to-right* during placement breaks stability — always right-to-left after prefix sums.
- The "simple" version that just writes `v` `cnt[v]` times works for plain integers but loses satellite data — for objects keyed by an integer, you need the stable placement.
- Counting sort is the **stable subroutine** that makes radix sort work.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/sort-an-array/">Sort an Array (Med)</a> — bounded range = counting wins.</li>
    <li><a href="https://leetcode.com/problems/relative-sort-array/">Relative Sort Array (Easy)</a> — counting + custom ordering.</li>
    <li><a href="https://leetcode.com/problems/height-checker/">Height Checker (Easy)</a> — counting sort of heights ≤ 100.</li>
    <li><a href="https://leetcode.com/problems/h-index/">H-Index (Med)</a> — counting on citations.</li>
    <li><a href="https://leetcode.com/problems/rank-transform-of-an-array/">Rank Transform of an Array (Easy)</a> — counting / hashing.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-increasing-frequency/">Sort Array by Increasing Frequency (Easy)</a> — count, sort by count.</li>
    <li><a href="https://leetcode.com/problems/sort-characters-by-frequency/">Sort Characters By Frequency (Med)</a> — bucket by frequency.</li>
    <li><a href="https://leetcode.com/problems/sort-colors/">Sort Colors (Med)</a> — counting on three values.</li>
    <li><a href="https://leetcode.com/problems/sort-integers-by-the-number-of-1-bits/">Sort Integers by Number of 1 Bits (Easy)</a> — bucket by popcount.</li>
    <li><a href="https://leetcode.com/problems/sorting-the-sentence/">Sorting the Sentence (Easy)</a> — counting-style placement.</li>
  </ul>
</div>
