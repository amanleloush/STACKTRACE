# 01 — Top K Largest

> Heap / Priority Queue • Position 1/5

## Problem
Given an array and an integer K, return the K largest elements (or the K-th largest).

## Intuition
A full sort is O(n log n), but we only need K elements. Keep a **min-heap of size K** as you scan the array. The root is the smallest of your current top-K candidates — if a new element beats it, replace the root. The invariant: **the heap always contains the K largest elements seen so far, and its root is the K-th largest.**

## Algorithm
Maintain a min-heap. Push every element; whenever the heap exceeds size K, pop the smallest. At the end, the heap holds the answer; the root is the K-th largest.

```python
import heapq

def top_k_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)      # evict the smallest of the top-(K+1)
    return heap                       # K largest; heap[0] is K-th largest
```

## Walkthrough
Example: `nums = [3, 2, 1, 5, 6, 4]`, `K = 2`.

1. Push 3 → heap `[3]`.
2. Push 2 → heap `[2, 3]`. Size = K, no evict.
3. Push 1 → heap `[1, 3, 2]`. Pop 1 → heap `[2, 3]`.
4. Push 5 → heap `[2, 3, 5]`. Pop 2 → heap `[3, 5]`.
5. Push 6 → heap `[3, 5, 6]`. Pop 3 → heap `[5, 6]`. Root 5 is the 2nd largest.

<div class="dsa-viz" data-algo="top-k"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log K)</strong></span>
  <span>space <strong>O(K)</strong></span>
</div>

## Pitfalls
- **Min-heap for *largest*** — counter-intuitive but correct: you evict the smallest survivor.
- **Quickselect is O(n) average** for the K-th element; use it when K is large relative to n.
- For **top-K frequent**, hash-count first, then heap on `(count, value)` pairs.
- **Tie-breaking** — when frequencies tie, problems often want lexicographic order; push `(count, -ord(c))` or similar.
- Python's `heapq.nlargest(k, nums)` is the one-liner — know it exists, but be ready to hand-roll in an interview.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/kth-largest-element-in-an-array/">215 Kth Largest Element in an Array (Med)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-elements/">347 Top K Frequent Elements (Med)</a> — hash-count, then size-K heap.</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-words/">692 Top K Frequent Words (Med)</a> — tie-break on lexicographic order.</li>
    <li><a href="https://leetcode.com/problems/sort-characters-by-frequency/">451 Sort Characters By Frequency (Med)</a> — full sort via heap dump.</li>
    <li><a href="https://leetcode.com/problems/k-closest-points-to-origin/">973 K Closest Points to Origin (Med)</a> — same template, keyed on distance.</li>
    <li><a href="https://leetcode.com/problems/kth-largest-element-in-a-stream/">703 Kth Largest Element in a Stream (Easy)</a> — keep heap as state.</li>
    <li><a href="https://leetcode.com/problems/find-the-kth-largest-integer-in-the-array/">1985 Find the Kth Largest Integer in the Array (Med)</a> — heap on big-int strings.</li>
    <li><a href="https://leetcode.com/problems/find-subsequence-of-length-k-with-the-largest-sum/">2099 Find Subsequence of Length K With the Largest Sum (Easy)</a> — top-K with index recovery.</li>
    <li><a href="https://leetcode.com/problems/seat-reservation-manager/">1845 Seat Reservation Manager (Med)</a> — min-heap of free seat numbers.</li>
    <li><a href="https://leetcode.com/problems/path-with-minimum-effort/">1631 Path With Minimum Effort (Med)</a> — Dijkstra-flavored heap usage.</li>
  </ul>
</div>
