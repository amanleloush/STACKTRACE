# 04 — K Closest Points to Origin

> Heap / Priority Queue • Position 4/5

## Problem
Given a list of 2D points, return the K closest to the origin (Euclidean distance).

## Intuition
Same template as top-K largest, just keyed differently. We want the K **smallest** distances, so we keep a **max-heap of size K**: the heap's root is the *worst* (farthest) of our current K candidates. Any incoming point closer than the root displaces it. The invariant: **the heap holds the K closest points seen so far, and its root is the K-th closest (i.e., the farthest of the keepers).**

## Algorithm
Push every point with key = squared distance. Whenever the heap exceeds K, pop the worst. No need to square-root — squared distance preserves ordering.

```python
import heapq

def k_closest(points, k):
    heap = []  # max-heap: store (-dist², point)
    for x, y in points:
        d2 = x * x + y * y
        heapq.heappush(heap, (-d2, x, y))
        if len(heap) > k:
            heapq.heappop(heap)        # evict the farthest of the top-(K+1)
    return [[x, y] for _, x, y in heap]
```

## Walkthrough
Example: 8 points `[(1,3), (-2,2), (5,8), (0,1), (3,-1), (-3,4), (2,2), (6,-2)]` with squared distances `[10, 8, 89, 1, 10, 25, 8, 40]`. `K = 3`.

1. **Fill the heap to K.** Push points 0, 1, 2 (d² = 10, 8, 89). Max-heap = `{89, 10, 8}` with root = 89 (the farthest).
2. **Point 3 (d²=1) displaces the farthest.** Push (1) → size 4 > 3 → pop the root **89**. Heap = `{10, 8, 1}`.
3. **Points 4 and 5.** d²=10 ties the root; pushing then popping just removes the new copy of 10 (heap unchanged). d²=25 is worse than the current root 10 → push then pop evicts 25 immediately. Heap stays `{10, 8, 1}`.
4. **Point 6 (d²=8) bumps a 10.** Push 8 → root becomes 10, pop it. Heap = `{8, 8, 1}`. Point 7 (d²=40) is worse than 8 → pop it back out. Heap unchanged.
5. **End.** Survivors are indices `{1, 3, 6}` = `(-2,2), (0,1), (2,2)` — the 3 closest points to the origin.

<div class="dsa-viz" data-algo="k-closest-points"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log K)</strong></span>
  <span>space <strong>O(K)</strong></span>
</div>

## Pitfalls
- **Use squared distance** — no `sqrt`, no float drift, same ordering.
- **Max-heap for closest** — same counter-intuitive flip as top-K largest. Negate keys for `heapq`.
- **Quickselect** is O(n) average and beats heap when K is large; know both.
- **Ties** — when two points have equal distance, problems usually allow any order. Confirm with the interviewer.
- **3D / higher dims** — same template, just `d² = sum(c² for c in coords)`.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/k-closest-points-to-origin/">973 K Closest Points to Origin (Med)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-words/">692 Top K Frequent Words (Med)</a> — same template, different key.</li>
    <li><a href="https://leetcode.com/problems/top-k-frequent-elements/">347 Top K Frequent Elements (Med)</a> — hash-count + heap.</li>
    <li><a href="https://leetcode.com/problems/find-k-closest-elements/">658 Find K Closest Elements (Med)</a> — sorted input → two-pointer beats heap.</li>
    <li><a href="https://leetcode.com/problems/kth-largest-element-in-an-array/">215 Kth Largest (Med)</a> — same template, simpler key.</li>
    <li><a href="https://leetcode.com/problems/find-the-kth-largest-integer-in-the-array/">1985 Find the Kth Largest Integer (Med)</a> — string-based comparator.</li>
    <li><a href="https://leetcode.com/problems/ugly-number-ii/">264 Ugly Number II (Med)</a> — heap to generate sorted sequence.</li>
    <li><a href="https://leetcode.com/problems/super-ugly-number/">313 Super Ugly Number (Med)</a> — heap with K prime factors.</li>
    <li><a href="https://leetcode.com/problems/k-th-smallest-prime-fraction/">786 K-th Smallest Prime Fraction (Med)</a> — heap over pairs.</li>
    <li><a href="https://leetcode.com/problems/campus-bikes/">1057 Campus Bikes (Med)</a> — heap on (distance, worker, bike).</li>
  </ul>
</div>
