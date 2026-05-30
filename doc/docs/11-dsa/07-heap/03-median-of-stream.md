# 03 — Median of Stream

> Heap / Priority Queue • Position 3/5

## Problem
Numbers arrive one at a time. After each insertion, return the median of all numbers seen so far.

## Intuition
Split the data into a **lower half** (everything ≤ median) and an **upper half** (everything ≥ median). Keep the lower half in a **max-heap** so its root is the largest of the small ones, and the upper half in a **min-heap** so its root is the smallest of the big ones. The invariant: **`len(low) == len(high)` or `len(low) == len(high) + 1`, and `max(low) ≤ min(high)`.** The median is `low.top()` (odd count) or the average of both tops (even count).

## Algorithm
Push to `low` (max-heap). Move `low`'s top to `high` to keep `high`'s root ≥ `low`'s root. If `high` grew too big, move its top back to `low`.

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.low = []   # max-heap (store as negatives)
        self.high = []  # min-heap

    def add(self, x):
        heapq.heappush(self.low, -x)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self):
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2
```

## Walkthrough
Example: stream `[5, 15, 1, 3, 8, 7, 9, 10, 6]`.

1. **Seed with 5, 15.** `5` lands in `low` (max-heap empty). `15 > low.top=5` → push to `high`. After: `low=[5]`, `high=[15]` — sizes balanced, median = (5+15)/2 = **10**.
2. **Insert 1, 3.** `1 ≤ 5` → push to `low`; balanced, no rebalance. `3 ≤ 5` → push to `low`; now `|low|=3 > |high|+1=2`, so move `low.top=5` to `high`. State: `low={3,1}`, `high={5,15}`, median = (3+5)/2 = **4**.
3. **Insert 8, 7.** `8 > 3` → push to `high`; `|high|=3 > |low|=2` → move `high.top=5` back to `low`. Then `7 > 5` → push to `high`; sizes equal, median = (5+7)/2 = **6**.
4. **Insert 9.** `9 > 5` → push to `high`; `|high|=4 > |low|=3` → move `high.top=7` back to `low`. State: `low={7,5,3,1}`, `high={8,9,15}`, median = low.top = **7**.
5. **Insert 10, 6 → end.** `10` flows into `high`; `6 ≤ 7` flows into `low`. Final state: `low={7,6,5,3,1}`, `high={8,9,10,15}`, `|low|=5`, `|high|=4` → odd-count median = low.top = **7**.

<div class="dsa-viz" data-algo="median-of-stream"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(log n) per insert, O(1) median</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- **Always shuffle through both heaps** — push into `low`, immediately move `low`'s top to `high`, then rebalance. This keeps `max(low) ≤ min(high)` automatically.
- **Python max-heap** — negate on push and pop. Off-by-one signs are the #1 bug here.
- **Even-count median** is the *average* — return a float or be careful with integer division.
- For **sliding-window median**, you need an indexed heap or a multiset; plain heaps can't remove arbitrary elements in O(log n).
- **Stream is mutable** — don't store all numbers in a list "just in case"; the heaps are your full state.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/find-median-from-data-stream/">295 Find Median from Data Stream (Hard)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/sliding-window-median/">480 Sliding Window Median (Hard)</a> — add lazy deletion or a multiset.</li>
    <li><a href="https://leetcode.com/problems/median-of-two-sorted-arrays/">4 Median of Two Sorted Arrays (Hard)</a> — binary search, not heap, but related.</li>
    <li><a href="https://leetcode.com/problems/finding-mk-average/">1825 Finding MK Average (Hard)</a> — three multisets / heaps for streaming stats.</li>
    <li><a href="https://leetcode.com/problems/kth-largest-element-in-a-stream/">703 Kth Largest Element in a Stream (Easy)</a> — single-heap warm-up.</li>
    <li><a href="https://leetcode.com/problems/ipo/">502 IPO (Hard)</a> — two-heap "best feasible" pattern.</li>
    <li><a href="https://leetcode.com/problems/maximum-performance-of-a-team/">1383 Maximum Performance of a Team (Hard)</a> — sort + size-K heap.</li>
    <li><a href="https://leetcode.com/problems/process-tasks-using-servers/">1882 Process Tasks Using Servers (Med)</a> — two-heap scheduling.</li>
    <li><a href="https://leetcode.com/problems/single-threaded-cpu/">1834 Single-Threaded CPU (Med)</a> — time-ordered + priority heap.</li>
    <li><a href="https://leetcode.com/problems/find-median-from-data-stream/">295 Find Median from Data Stream (Hard)</a> — re-implement after a week.</li>
  </ul>
</div>
