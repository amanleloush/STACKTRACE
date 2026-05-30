# 04 — Binary Search on Answer

> Binary Search • Position 4/6

## Problem
The input isn't sorted — but the **answer** is a number in a known range `[lo, hi]`, and there's a monotonic feasibility check: if `mid` works, every value above (or below) also works. Find the optimal value.

## Intuition
Frame the problem as a `FFFTTT` predicate. Example: "Can Koko finish all the bananas in `H` hours eating `k` per hour?" If `k=10` works then `k=11` certainly works — feasibility is monotonic in `k`. The optimal eating speed is the leftmost `T`. The actual problem (finishing bananas) becomes a black-box `feasible(k)` function that you call inside an otherwise-vanilla binary search over `k`. You never sort anything — you sort the *answer space*.

## Algorithm
1. Determine the answer range `[lo, hi]` from the problem constraints.
2. Write `feasible(mid)` — does this candidate satisfy the constraint?
3. Binary search for the leftmost `mid` where `feasible(mid)` is true (or rightmost where it's false, depending on the variant).

```python
def search_on_answer(lo, hi, feasible):
    # Leftmost mid such that feasible(mid) is True.
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

# LC 875 — Koko Eating Bananas
def min_eating_speed(piles, h):
    def feasible(k):
        return sum((p + k - 1) // k for p in piles) <= h
    return search_on_answer(1, max(piles), feasible)
```

## Walkthrough
LC 875 — `piles = [3, 6, 7, 11]`, `h = 8`:

1. Range: `lo=1, hi=11`. `mid=6` → hours = `1+1+2+2 = 6 <= 8` → feasible. `hi=6`.
2. `lo=1, hi=6` → `mid=3` → hours = `1+2+3+4 = 10 > 8` → not feasible. `lo=4`.
3. `lo=4, hi=6` → `mid=5` → hours = `1+2+2+3 = 8 <= 8` → feasible. `hi=5`.
4. `lo=4, hi=5` → `mid=4` → hours = `1+2+2+3 = 8 <= 8` → feasible. `hi=4`.
5. Loop ends. Answer = `4`.

<div class="dsa-viz" data-algo="bsearch-on-answer"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n · log R)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

`R` is the size of the answer range; `n` is the cost of one `feasible()` call.

## Pitfalls
- **Forgetting to prove monotonicity.** If `feasible` isn't monotonic, binary search is invalid. State it explicitly.
- **Wrong bounds.** Set `lo` to the smallest plausible answer and `hi` to the largest. Sloppy bounds either crash `feasible` or miss the answer.
- **Floor vs ceil arithmetic** inside `feasible`. `(p + k - 1) // k` is "ceiling of p/k" — the common gotcha.
- **Maximize vs minimize.** Decide whether you want the leftmost `T` (minimize feasible) or the rightmost `T` (maximize feasible) — they need different templates.
- **Cost of `feasible`** can dominate. If it's O(n²) you've built an O(n² log R) solution; check before submitting.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/sqrtx/">69. Sqrt(x) (Easy)</a> — search on integer square root.</li>
    <li><a href="https://leetcode.com/problems/valid-perfect-square/">367. Valid Perfect Square (Easy)</a> — feasibility = `mid*mid >= n`.</li>
    <li><a href="https://leetcode.com/problems/koko-eating-bananas/">875. Koko Eating Bananas (Medium)</a> — the canonical example.</li>
    <li><a href="https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/">1011. Capacity To Ship Packages Within D Days (Medium)</a> — search on ship capacity.</li>
    <li><a href="https://leetcode.com/problems/split-array-largest-sum/">410. Split Array Largest Sum (Hard)</a> — search on the largest subarray sum.</li>
    <li><a href="https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/">1283. Find the Smallest Divisor Given a Threshold (Medium)</a> — search on the divisor.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/">1482. Minimum Days to Make Bouquets (Medium)</a> — search on day count.</li>
    <li><a href="https://leetcode.com/problems/minimize-the-maximum-difference-of-pairs/">2616. Minimize the Maximum Difference of Pairs (Medium)</a> — search on the maximum gap.</li>
    <li><a href="https://leetcode.com/problems/path-with-minimum-effort/">1631. Path With Minimum Effort (Medium)</a> — feasibility = reachable under max-effort threshold.</li>
    <li><a href="https://leetcode.com/problems/swim-in-rising-water/">778. Swim in Rising Water (Hard)</a> — search on water level.</li>
  </ul>
</div>
