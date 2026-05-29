# 04 — Huffman Coding

> Greedy • Position 4/5

## Problem
Given symbol frequencies, build a prefix-free binary code that minimizes total encoded length: `sum(freq[c] · depth[c])`.

## Intuition
Two observations drive the proof. **(1) The two least-frequent symbols must be siblings at the deepest level** — if not, swap them with whatever's down there and the total weighted depth strictly improves. **(2) After merging those two into a single "super-symbol" with frequency = sum, the residual problem is the same shape on one fewer leaf.** So a min-heap of frequencies, repeatedly extracting two and pushing their sum, builds an optimal tree from the leaves up. The shape of the tree records the code; the algorithm itself never tracks bits.

## Algorithm
```python
import heapq

def huffman_cost(freqs):
    heap = list(freqs)
    heapq.heapify(heap)
    total = 0
    while len(heap) > 1:
        a = heapq.heappop(heap)
        b = heapq.heappop(heap)
        total += a + b              # contributes to depth of both
        heapq.heappush(heap, a + b)
    return total
```

## Walkthrough
Example: symbol frequencies `a:5, b:9, c:12, d:13, e:16, f:45`. Min-heap holds the six leaves.

1. **Merge the two smallest leaves.** Pop `a:5`, then pop `b:9`. Create parent node with freq `5 + 9 = 14`, push back. Heap = `[c:12, d:13, 14, e:16, f:45]`.
2. **Merge 12 and 13.** Pop `c:12`, pop `d:13`. New parent freq `25`, push. Heap = `[14, e:16, 25, f:45]`.
3. **Merge 14 and 16.** Pop the freshly merged 14-node, pop `e:16`. New parent freq `30`, push. Heap = `[25, 30, f:45]`.
4. **Merge 25 and 30.** Pop them, create parent freq `55`, push. Heap = `[f:45, 55]`.
5. **Final merge → root.** Pop `f:45`, pop 55 → root has freq `100`. Heap collapses to a single node — the Huffman tree is complete. Total weighted path length = `14 + 25 + 30 + 55 + 100 = 224`.

<div class="dsa-viz" data-algo="huffman"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n log n)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- Pushing the sum **before** popping the second smallest — you'll merge a fresh sum with itself.
- Using a max-heap by accident (negation flip) — Python's `heapq` is min by default; double-check Java's `PriorityQueue` reverse comparator.
- For ties, the tree shape isn't unique but the cost is — don't assert specific codes in tests.
- Single-symbol input: cost is 0 (or 1 if the problem demands at least one bit per symbol — check the spec).
- Forgetting that "merging two smallest" generalizes — LC 1167, 2208, 2336 all use the same heap loop with different per-step costs.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/minimum-cost-to-connect-sticks/">1167 Minimum Cost to Connect Sticks (Med)</a> — Huffman in disguise.</li>
    <li><a href="https://leetcode.com/problems/maximum-product-after-k-increments/">2233 Maximum Product After K Increments (Med)</a> — min-heap increments.</li>
    <li><a href="https://leetcode.com/problems/minimize-deviation-in-array/">1675 Minimize Deviation in Array (Hard)</a> — max-heap halving.</li>
    <li><a href="https://leetcode.com/problems/minimum-operations-to-halve-array-sum/">2208 Minimum Operations to Halve Array Sum (Med)</a> — max-heap greedy halve.</li>
    <li><a href="https://leetcode.com/problems/smallest-number-in-infinite-set/">2336 Smallest Number in Infinite Set (Med)</a> — heap + set.</li>
    <li><a href="https://leetcode.com/problems/distant-barcodes/">1054 Distant Barcodes (Med)</a> — max-heap by count.</li>
    <li><a href="https://leetcode.com/problems/rearrange-string-k-distance-apart/">358 Rearrange String k Distance Apart (Hard)</a> — heap + cooldown queue.</li>
    <li><a href="https://leetcode.com/problems/longest-happy-string/">1405 Longest Happy String (Med)</a> — max-heap by remaining count.</li>
    <li><a href="https://leetcode.com/problems/task-scheduler/">621 Task Scheduler (Med)</a> — max-heap with idle slots.</li>
    <li><a href="https://leetcode.com/problems/find-median-from-data-stream/">295 Find Median from Data Stream (Hard)</a> — dual-heap pattern.</li>
  </ul>
</div>
