# 02 — Jump Game (greedy farthest)

> Greedy • Position 2/5

## Problem
Given `nums` where `nums[i]` is the max jump from index `i`, can you reach the last index? (And for Jump Game II, in how few jumps?)

## Intuition
You don't need to enumerate paths — just track the **farthest index reachable so far**. Sweep left to right; at each `i ≤ reach`, update `reach = max(reach, i + nums[i])`. If `reach` ever stalls at an index `< n-1` while `i` catches up to it, you're stuck. For Jump Game II, the trick is to think in **levels**: maintain a current jump's right boundary; when `i` hits it, you must have used another jump, and the new boundary is the farthest reached so far. This is BFS on indices without the queue.

## Algorithm
```python
def can_jump(nums):
    reach = 0
    for i, v in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + v)
    return True

def jump_ii(nums):
    jumps = end = farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == end:                # consumed current jump
            jumps += 1
            end = farthest
    return jumps
```

## Walkthrough
1. `nums = [2,3,1,1,4]`. `reach = 0`.
2. `i=0, v=2` → `reach = max(0, 0+2) = 2`.
3. `i=1, v=3` → `reach = max(2, 1+3) = 4`. Already covers last index.
4. Loop completes without `i > reach`. Return **True**.
5. Jump II on same array: at `i=0`, farthest=2, end=0 → jump (jumps=1, end=2). At `i=1`, farthest=4. At `i=2`, end consumed → jump (jumps=2, end=4). Answer = 2.

<div class="dsa-viz" data-algo="jump-game"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Updating `reach` for indices `i > reach` — you can't stand there, so you can't jump from there.
- For Jump Game II, looping to `n` instead of `n-1`: the last index doesn't trigger another jump.
- Off-by-one when `nums[i] = 0` — you stall, not fail, unless `i == reach < n-1`.
- Confusing "max jump = `nums[i]`" with "exact jump" — Jump Game IV uses different rules.
- Trying DP first; the O(n²) DP times out on large inputs where greedy is the intended solution.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/jump-game/">55 Jump Game (Med)</a> — canonical reachability sweep.</li>
    <li><a href="https://leetcode.com/problems/jump-game-ii/">45 Jump Game II (Med)</a> — minimum jumps via BFS-by-level.</li>
    <li><a href="https://leetcode.com/problems/jump-game-iii/">1306 Jump Game III (Med)</a> — graph reachability with ±nums[i].</li>
    <li><a href="https://leetcode.com/problems/jump-game-v/">1340 Jump Game V (Hard)</a> — DP with memo, not greedy.</li>
    <li><a href="https://leetcode.com/problems/jump-game-vi/">1696 Jump Game VI (Med)</a> — monotonic deque on DP.</li>
    <li><a href="https://leetcode.com/problems/gas-station/">134 Gas Station (Med)</a> — circular variant of the frontier idea.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-refueling-stops/">871 Minimum Number of Refueling Stops (Hard)</a> — heap of skipped stations.</li>
    <li><a href="https://leetcode.com/problems/video-stitching/">1024 Video Stitching (Med)</a> — Jump Game II on intervals.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-taps-to-open-to-water-a-garden/">1326 Minimum Number of Taps to Open to Water a Garden (Hard)</a> — intervals → Jump Game II.</li>
    <li><a href="https://leetcode.com/problems/partition-labels/">763 Partition Labels (Med)</a> — last-occurrence farthest pointer.</li>
  </ul>
</div>
