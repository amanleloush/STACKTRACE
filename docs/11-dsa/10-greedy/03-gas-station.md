# 03 — Gas Station (circular tour)

> Greedy • Position 3/5

## Problem
At station `i` you gain `gas[i]` and pay `cost[i]` to drive to `i+1` (circular). Return the starting index that lets you complete the loop, or `-1`.

## Intuition
Two facts unlock the O(n) greedy. **First**, a solution exists iff `sum(gas) ≥ sum(cost)` — otherwise no start can possibly work. **Second**, if you start at `i` and run out of gas at `j`, then no station in `[i, j]` can be a valid start: each of those would have arrived at `j` with even less fuel than you did. So you reset the candidate start to `j+1` and keep sweeping. One pass, no backtracking — the exchange argument is "any failed prefix is forever unusable."

## Algorithm
```python
def can_complete(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    tank, start = 0, 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:           # i is unreachable from start
            start, tank = i + 1, 0
    return start
```

## Walkthrough
Example: `gas = [1, 2, 3, 4, 5]`, `cost = [3, 4, 5, 1, 2]`.

1. **Init.** `tank = 0`, `total = 0`, `start = 0`. (Total gas 15 = total cost 15 → a solution exists.)
2. **i=0.** `diff = 1 − 3 = −2`. `tank → −2 < 0` → **reset**: `start = 1`, `tank = 0`. `total = −2`.
3. **i=1, i=2.** Same story: `diff = −2` each time → reset `start` to 2, then 3. After `i=2`, `total = −6`, `tank = 0`, `start = 3`.
4. **i=3, i=4.** `diff = 4 − 1 = 3` → `tank = 3`, `total = −3`. Then `diff = 5 − 2 = 3` → `tank = 6`, `total = 0`. No more resets.
5. **End.** Loop ends; `total = 0 ≥ 0` → return `start = 3`. Starting at station **3** lets the trip complete.

<div class="dsa-viz" data-algo="gas-station"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Forgetting the global feasibility check — without it, you might return a "start" that still fails.
- Trying to simulate from every station — O(n²) and unnecessary.
- Resetting `tank` to `gas[i+1] - cost[i+1]` instead of `0` — you advance `start` past the failure first.
- Misreading the cost: `cost[i]` is from `i` to `i+1`, not from `i-1` to `i`.
- Assuming uniqueness — the problem guarantees a unique answer when one exists, but writing code that depends on uniqueness can break on variants.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/gas-station/">134 Gas Station (Med)</a> — canonical problem.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-refueling-stops/">871 Minimum Number of Refueling Stops (Hard)</a> — heap of skipped tanks.</li>
    <li><a href="https://leetcode.com/problems/jump-game/">55 Jump Game (Med)</a> — sibling frontier-sweep pattern.</li>
    <li><a href="https://leetcode.com/problems/jump-game-ii/">45 Jump Game II (Med)</a> — minimum-step variant.</li>
    <li><a href="https://leetcode.com/problems/partition-labels/">763 Partition Labels (Med)</a> — running deficit-style sweep.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-taps-to-open-to-water-a-garden/">1326 Minimum Number of Taps to Open to Water a Garden (Hard)</a> — frontier on intervals.</li>
    <li><a href="https://leetcode.com/problems/video-stitching/">1024 Video Stitching (Med)</a> — Jump Game II on segments.</li>
    <li><a href="https://leetcode.com/problems/jump-game-iii/">1306 Jump Game III (Med)</a> — BFS reachability.</li>
    <li><a href="https://leetcode.com/problems/jump-game-vi/">1696 Jump Game VI (Med)</a> — DP + monotonic deque.</li>
    <li><a href="https://leetcode.com/problems/jump-game-v/">1340 Jump Game V (Hard)</a> — DP with sorted indices.</li>
  </ul>
</div>
