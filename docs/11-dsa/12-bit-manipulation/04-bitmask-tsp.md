# 04 — Bitmask DP — Travelling Salesman

> Bit Manipulation • Position 4/4

## Problem
Given an `n×n` distance matrix (`n ≤ 20`), find the shortest tour visiting every city exactly once and returning to the start.

## Intuition
The state is **(set of visited cities, current city)** — once you know which cities you've visited and where you are, the future is independent of the past. Encode the visited set as a bitmask: bit `i` set means city `i` is done. There are `2^n · n` states; each looks at `n` predecessors. Total `O(2^n · n²)` time and `O(2^n · n)` space. For `n = 20` that's roughly 4·10^8 — tight but doable. The shift from "permutation search" (n! ≈ 2.4·10^18 at n=20) to "subset DP" (~ 4·10^8) is what makes the problem tractable.

## Algorithm
```python
def tsp(dist):
    n = len(dist)
    INF = float("inf")
    dp = [[INF] * n for _ in range(1 << n)]
    dp[1][0] = 0                                    # start at city 0
    for mask in range(1 << n):
        for u in range(n):
            if dp[mask][u] == INF or not (mask >> u) & 1: continue
            for v in range(n):
                if (mask >> v) & 1: continue        # v already visited
                nmask = mask | (1 << v)
                dp[nmask][v] = min(dp[nmask][v], dp[mask][u] + dist[u][v])
    full = (1 << n) - 1
    return min(dp[full][u] + dist[u][0] for u in range(1, n))
```

## Walkthrough
Example: 4 cities with symmetric distances `[[0,10,15,20], [10,0,35,25], [15,35,0,30], [20,25,30,0]]`. Start at city 0.

1. **Base state.** `dp[mask=0001][i=0] = 0` — only city 0 visited, currently sitting there.
2. **Expand by popcount = 1.** From `(0001, 0)` relax three transitions: `dp[0011][1] = 0+10 = 10`, `dp[0101][2] = 0+15 = 15`, `dp[1001][3] = 0+20 = 20`.
3. **Expand by popcount = 2.** E.g. from `(0011, 1)`: relax to `dp[0111][2] = 10+35 = 45`, `dp[1011][3] = 10+25 = 35`. From `(0101, 2)`: `dp[0111][1] = 15+35 = 50`, `dp[1101][3] = 15+30 = 45`. And so on for `(1001, 3)`.
4. **Expand by popcount = 3.** Each `(popcount=2)` state relaxes one transition to a popcount-3 state. After this layer, `dp[FULL=1111][i]` is filled for `i ∈ {1, 2, 3}` — e.g. the path `0→2→3→1` gives `dp[1111][1] = 15+30+25 = 70`.
5. **Close the tour.** Take `min over i of dp[1111][i] + dist[i][0]`: candidate end-cities give `dp[1111][1]+10 = 80`, `dp[1111][2]+15 = 80`, `dp[1111][3]+20 = 80`. **Best tour cost = 80.**

<div class="dsa-viz" data-algo="bitmask-tsp"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(2^n · n²)</strong></span>
  <span>space <strong>O(2^n · n)</strong></span>
</div>

## Pitfalls
- Iterating masks out of order — must go increasing so subsets are filled before supersets.
- Forgetting to require `(mask >> u) & 1` — you'll transition from impossible states.
- Returning `min(dp[full])` without adding `dist[u][0]` — that's the open-tour answer, not the closed cycle.
- Using `n > 22` — memory blows up. For larger n, look at branch-and-bound or held-karp with bitset compression.
- Submask iteration uses `sub = (sub - 1) & mask` (not just decrement) — easy to mis-write and burn a contest.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/find-the-shortest-superstring/">943 Find the Shortest Superstring (Hard)</a> — TSP over string-overlap costs.</li>
    <li><a href="https://leetcode.com/problems/smallest-sufficient-team/">1125 Smallest Sufficient Team (Hard)</a> — set-cover bitmask DP.</li>
    <li><a href="https://leetcode.com/problems/stickers-to-spell-word/">691 Stickers to Spell Word (Hard)</a> — bitmask of needed letters.</li>
    <li><a href="https://leetcode.com/problems/shortest-path-visiting-all-nodes/">847 Shortest Path Visiting All Nodes (Hard)</a> — BFS on `(node, mask)`.</li>
    <li><a href="https://leetcode.com/problems/maximum-students-taking-exam/">1349 Maximum Students Taking Exam (Hard)</a> — row-by-row bitmask DP.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-work-sessions-to-finish-the-tasks/">1986 Minimum Number of Work Sessions (Med)</a> — submask DP.</li>
    <li><a href="https://leetcode.com/problems/maximum-number-of-achievable-transfer-requests/">1601 Maximum Number of Achievable Transfer Requests (Hard)</a> — enumerate request subsets.</li>
    <li><a href="https://leetcode.com/problems/campus-bikes-ii/">1066 Campus Bikes II (Med)</a> — assignment via bitmask DP.</li>
    <li><a href="https://leetcode.com/problems/minimum-incompatibility/">1681 Minimum Incompatibility (Hard)</a> — subset partition DP.</li>
    <li><a href="https://leetcode.com/problems/beautiful-arrangement/">526 Beautiful Arrangement (Med)</a> — permutation count via mask DP.</li>
  </ul>
</div>
