# 05 — Task Scheduler with Cooldown

> Heap / Priority Queue • Position 5/5

## Problem
Given a list of tasks (each labeled by a character) and a cooldown `n` (the same task can't run within `n` steps), find the minimum number of CPU cycles to finish all tasks.

## Intuition
At each cycle, you want to run the task with the highest remaining count — that's a **max-heap on frequencies**. But you can't run a task again until its cooldown expires, so popped tasks go into a **cooldown queue** along with the time they become eligible. The invariant: **the heap holds every task that's available *now*; the queue holds every task waiting for its cooldown to lapse.**

## Algorithm
Count frequencies, build a max-heap. Each cycle: pop the most-frequent task (if any), decrement, and if it still has runs left, push `(eligible_time, count)` to the cooldown queue. At the start of each cycle, move all queue entries whose eligibility has arrived back into the heap. If the heap is empty, the CPU idles. Stop when both structures are empty.

```python
import heapq
from collections import Counter, deque

def least_interval(tasks, n):
    heap = [-c for c in Counter(tasks).values()]
    heapq.heapify(heap)
    queue = deque()   # (ready_time, neg_count)
    t = 0
    while heap or queue:
        t += 1
        if heap:
            cnt = heapq.heappop(heap) + 1   # one less remaining
            if cnt < 0:
                queue.append((t + n, cnt))
        if queue and queue[0][0] == t:
            heapq.heappush(heap, queue.popleft()[1])
    return t
```

## Walkthrough
Example: `tasks = ['A','A','A','B','B','B']`, `n = 2`. Initial heap = `[A×3, B×3]`.

1. **t=1: emit A.** Pop A (count 3) → schedule = `[A]`; park `(A, count=2, ready@3)` in the cooldown queue. Heap = `[B×3]`.
2. **t=2: emit B.** Cooldown front (`ready@3`) isn't ready. Pop B → schedule = `[A, B]`; park `(B, 2, @4)`. Heap empty; queue = `[A×2@3, B×2@4]`.
3. **t=3: release A, emit A.** Cooldown front `A×2@3` is ready → push back into heap. Pop A → schedule = `[A, B, A]`; park `(A, 1, @5)`.
4. **t=4–5: B then A.** Each tick releases the next-ready task, emits it, and parks the decremented copy. After t=5, schedule = `[A, B, A, B, A]`; only `(B, 1, @6)` remains in the cooldown queue.
5. **t=6: emit final B → done.** Release `B×1@6`, emit it. Count was 1, not parked. Heap and queue both empty → schedule = `[A, B, A, B, A, B]`, total time = **6**.

<div class="dsa-viz" data-algo="task-scheduler"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(T log K)</strong></span>
  <span>space <strong>O(K)</strong></span>
</div>

Where T is the total cycles and K is the number of distinct tasks (≤ 26 for letters → effectively O(T)).

## Pitfalls
- **Idle cycles count** — when the heap is empty but the queue isn't, the CPU still ticks forward.
- **Closed-form shortcut** — `max((maxFreq - 1) * (n + 1) + tieCount, len(tasks))` gives the answer in O(T). Mention it once you've coded the heap version.
- **Cooldown queue is FIFO** — entries become eligible in insertion order because each lasts the same `n` cycles.
- **Don't push back zero-count tasks** — they're done; pushing them wastes log K.
- For **task-with-deadline / per-task cost** variants, the heap key changes but the queue mechanism stays the same.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/task-scheduler/">621 Task Scheduler (Med)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/rearrange-string-k-distance-apart/">358 Rearrange String k Distance Apart (Hard)</a> — same template, output the schedule.</li>
    <li><a href="https://leetcode.com/problems/reorganize-string/">767 Reorganize String (Med)</a> — k=2 special case.</li>
    <li><a href="https://leetcode.com/problems/single-threaded-cpu/">1834 Single-Threaded CPU (Med)</a> — heap on (processingTime, index).</li>
    <li><a href="https://leetcode.com/problems/process-tasks-using-servers/">1882 Process Tasks Using Servers (Med)</a> — two heaps for free/busy.</li>
    <li><a href="https://leetcode.com/problems/the-number-of-the-smallest-unoccupied-chair/">1942 The Number of the Smallest Unoccupied Chair (Med)</a> — heap of free chairs + arrival time heap.</li>
    <li><a href="https://leetcode.com/problems/ipo/">502 IPO (Hard)</a> — sort by capital, max-heap on profit.</li>
    <li><a href="https://leetcode.com/problems/find-median-from-data-stream/">295 Find Median from Data Stream (Hard)</a> — two-heap warm-up.</li>
    <li><a href="https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended/">1353 Maximum Number of Events That Can Be Attended (Med)</a> — greedy + heap on end time.</li>
    <li><a href="https://leetcode.com/problems/the-number-of-the-smallest-unoccupied-chair/">1942 The Number of the Smallest Unoccupied Chair (Med)</a> — re-implement for two-heap drill.</li>
  </ul>
</div>
