# 01 — Activity Selection

> Greedy • Position 1/5

## Problem
Given intervals, pick the maximum number that don't overlap.

## Intuition
Sort by **finish time**. Always commit to the activity that ends earliest among those still available — it leaves the most room on the right for everything that follows. The exchange argument: any optimal schedule whose first pick ends later than the greedy pick can swap that first pick for the greedy one without losing any later activities, because the greedy pick frees up strictly more future time. Iterate the argument and the greedy schedule is at least as long as any optimal one.

## Algorithm
Sort by end. Walk left to right; keep an activity if its start is `≥` the last kept end.

```python
def max_activities(intervals):
    intervals.sort(key=lambda x: x[1])  # by finish time
    count, last_end = 0, float("-inf")
    for s, e in intervals:
        if s >= last_end:
            count += 1
            last_end = e
    return count
```

## Walkthrough
Example (already sorted by finish): `[(1,4), (3,5), (0,6), (5,7), (3,9), (5,9), (6,10), (8,11), (8,12), (2,14), (12,16)]`.

1. **Start.** `last_finish = −∞`, `chosen = []`. Take `(1,4)` — start ≥ −∞ → **accept**, set `last_finish = 4`.
2. **Skip overlap, accept (5,7).** `(3,5)` and `(0,6)` both start before 4 → **skip**. `(5,7)` starts at 5 ≥ 4 → **accept**, `last_finish = 7`.
3. **Skip three, accept (8,11).** `(3,9)`, `(5,9)`, `(6,10)` all start before 7 → skip. `(8,11)` starts at 8 ≥ 7 → **accept**, `last_finish = 11`.
4. **Skip two, accept (12,16).** `(8,12)` and `(2,14)` start before 11 → skip. `(12,16)` starts at 12 ≥ 11 → **accept**, `last_finish = 16`.
5. **End.** Greedy chose 4 non-overlapping activities: `{(1,4), (5,7), (8,11), (12,16)}`.

<div class="dsa-viz" data-algo="activity-selection"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Sorting by start time instead of end — gives wrong answer on small inputs like `[(1,10),(2,3),(4,5)]`.
- Off-by-one on touching intervals: decide upfront whether `[1,3)` and `[3,5)` count as overlapping. LC 435 treats touching as **not** overlapping; LC 252/253 may differ.
- Forgetting that the count is what matters, not the specific schedule — many optima exist.
- Greedy by **shortest duration** is a famous wrong heuristic; counterexample: `[(0,5),(4,6),(5,10)]`.
- For weighted activity selection (each interval has a value), greedy fails — use DP with binary search.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/non-overlapping-intervals/">435 Non-overlapping Intervals (Med)</a> — same problem, minimize removals = n − greedy count.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/">452 Minimum Number of Arrows to Burst Balloons (Med)</a> — count of "lanes" = activity selection on ends.</li>
    <li><a href="https://leetcode.com/problems/merge-intervals/">56 Merge Intervals (Med)</a> — sort by start, extend or push.</li>
    <li><a href="https://leetcode.com/problems/remove-covered-intervals/">1288 Remove Covered Intervals (Med)</a> — sort by start asc, end desc; track running max end.</li>
    <li><a href="https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended/">1353 Maximum Number of Events That Can Be Attended (Med)</a> — heap of ends per day.</li>
    <li><a href="https://leetcode.com/problems/video-stitching/">1024 Video Stitching (Med)</a> — sort by start, jump farthest end within reach.</li>
    <li><a href="https://leetcode.com/problems/set-intersection-size-at-least-two/">757 Set Intersection Size At Least Two (Hard)</a> — variant requiring two points per interval.</li>
    <li><a href="https://leetcode.com/problems/maximum-length-of-pair-chain/">646 Maximum Length of Pair Chain (Med)</a> — direct restatement of activity selection.</li>
    <li><a href="https://leetcode.com/problems/partition-labels/">763 Partition Labels (Med)</a> — last-occurrence map + extend the active end.</li>
    <li><a href="https://leetcode.com/problems/gas-station/">134 Gas Station (Med)</a> — greedy reset on deficit (sibling pattern).</li>
  </ul>
</div>
