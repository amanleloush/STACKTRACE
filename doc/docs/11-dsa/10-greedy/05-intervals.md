# 05 — Interval Merging

> Greedy • Position 5/5

## Problem
Given intervals, merge all overlapping ones into the smallest set of disjoint intervals that covers the same points.

## Intuition
Sort by **start time**. Sweep left to right keeping one "active" interval `[s, e]`. For each new `[s', e']`: if `s' ≤ e`, they overlap — extend `e = max(e, e')`. Otherwise the active interval is done; push it and start a new one with `[s', e']`. The proof: after sorting by start, anything that overlaps the active interval must overlap it on the left, so a single "running end" is all you need. The same scan trivially answers room-count (max active at once), non-overlap count, and intersection enumeration with sibling variants.

## Algorithm
```python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    out = []
    for s, e in intervals:
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out
```

## Walkthrough
Example: `intervals = [[1,3], [2,6], [8,10], [15,18]]` (already sorted by start).

1. **Start.** `out = []`. Take `[1, 3]`: output is empty → **append**. `out = [[1, 3]]`.
2. **`[2, 6]` overlaps.** `2 ≤ out[-1].end = 3` → **merge**: extend last end to `max(3, 6) = 6`. `out = [[1, 6]]`.
3. **`[8, 10]` is disjoint.** `8 > 6` → **append**. `out = [[1, 6], [8, 10]]`.
4. **`[15, 18]` is disjoint.** `15 > 10` → **append**. `out = [[1, 6], [8, 10], [15, 18]]`.
5. **End.** Three merged intervals returned — the input's two overlapping intervals collapsed into `[1, 6]`.

<div class="dsa-viz" data-algo="intervals"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log n)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- Sorting by end works for activity selection but **breaks** merging — you'll miss overlaps that end before a later-starting longer one.
- Touching vs overlapping: `[1,3]` and `[3,5]` — decide whether to merge based on the problem statement (LC 56 merges them).
- For "meeting rooms II", don't try to merge — use a min-heap of end times instead.
- For inserting a new interval (LC 57), don't re-sort; do a three-phase sweep (before, overlap-and-extend, after).
- Mutating the input list while iterating — make `out` separate or work on indices.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/merge-intervals/">56 Merge Intervals (Med)</a> — canonical sweep.</li>
    <li><a href="https://leetcode.com/problems/insert-interval/">57 Insert Interval (Med)</a> — three-phase variant.</li>
    <li><a href="https://leetcode.com/problems/meeting-rooms/">252 Meeting Rooms (Easy)</a> — sort and check adjacent overlaps.</li>
    <li><a href="https://leetcode.com/problems/meeting-rooms-ii/">253 Meeting Rooms II (Med)</a> — heap of end times.</li>
    <li><a href="https://leetcode.com/problems/non-overlapping-intervals/">435 Non-overlapping Intervals (Med)</a> — sort by end, count keeps.</li>
    <li><a href="https://leetcode.com/problems/partition-labels/">763 Partition Labels (Med)</a> — last-occurrence map → merge.</li>
    <li><a href="https://leetcode.com/problems/interval-list-intersections/">986 Interval List Intersections (Med)</a> — two-pointer on two sorted lists.</li>
    <li><a href="https://leetcode.com/problems/employee-free-time/">759 Employee Free Time (Hard)</a> — merge, then gaps.</li>
    <li><a href="https://leetcode.com/problems/minimum-interval-to-include-each-query/">1851 Minimum Interval to Include Each Query (Hard)</a> — offline sort + heap.</li>
    <li><a href="https://leetcode.com/problems/maximum-earnings-from-taxi/">2008 Maximum Earnings From Taxi (Med)</a> — DP on sorted intervals.</li>
  </ul>
</div>
