---
title: Sorting
---

# DSA · 13 · Sorting

> From elementary swaps to non-comparison radix — pick the right tool.

## When to use this pattern
- Output needs to be ordered — by a key, by frequency, by custom comparator.
- A faster downstream algorithm requires sorted input (binary search, two pointers, sweep line).
- You need a stable order that preserves the relative position of equal keys.
- Input keys are small integers or fixed-width strings — non-comparison sorts win.
- The data is mostly sorted already — insertion sort is linear; quicksort degrades.

## The shape of the solution
Every comparison sort is bounded by Ω(n log n) — you cannot beat it without exploiting structure in the keys. Within that bound the trade-offs are about *stability*, *in-place behavior*, *cache locality*, and *worst-case vs average*. Merge sort guarantees O(n log n) but allocates; quicksort is faster in practice but quadratic on adversarial input; heap sort is in-place O(n log n) but cache-hostile. When keys are integers in a bounded range, counting and radix sort drop to O(n + k) — linear time, at the cost of O(n + k) auxiliary memory. Pick by reading the constraints: range of values, stability requirement, memory budget.

## Comparison table

| Algorithm | Time avg | Time worst | Space | Stable | In-place |
| --- | --- | --- | --- | --- | --- |
| Bubble | O(n²) | O(n²) | O(1) | yes | yes |
| Insertion | O(n²) | O(n²) | O(1) | yes | yes |
| Selection | O(n²) | O(n²) | O(1) | no | yes |
| Merge | O(n log n) | O(n log n) | O(n) | yes | no |
| Quick | O(n log n) | O(n²) | O(log n) stack | no | yes |
| Heap | O(n log n) | O(n log n) | O(1) | no | yes |
| Counting | O(n + k) | O(n + k) | O(n + k) | yes | no |
| Radix | O(d·(n + k)) | O(d·(n + k)) | O(n + k) | yes | no |

## Topics in this section
<div class="topic-grid">
  <a class="topic-card" href="01-bubble/"><span class="topic-card__num">01</span><h3>Bubble sort</h3><p>Adjacent swaps bubble the largest element to the end on each pass.</p></a>
  <a class="topic-card" href="02-insertion/"><span class="topic-card__num">02</span><h3>Insertion sort</h3><p>Grow a sorted prefix one element at a time by shifting larger keys right.</p></a>
  <a class="topic-card" href="03-selection/"><span class="topic-card__num">03</span><h3>Selection sort</h3><p>Scan for the minimum and swap it into place — n passes, minimal writes.</p></a>
  <a class="topic-card" href="04-merge/"><span class="topic-card__num">04</span><h3>Merge sort</h3><p>Divide, recurse, merge — stable O(n log n) with O(n) auxiliary space.</p></a>
  <a class="topic-card" href="05-quick/"><span class="topic-card__num">05</span><h3>Quick sort (Lomuto)</h3><p>Pick a pivot, partition, recurse — fastest in practice, quadratic worst case.</p></a>
  <a class="topic-card" href="06-heap/"><span class="topic-card__num">06</span><h3>Heap sort</h3><p>Build a max-heap then sift the root to the end — in-place O(n log n).</p></a>
  <a class="topic-card" href="07-counting/"><span class="topic-card__num">07</span><h3>Counting sort</h3><p>Tally occurrences then write keys back in order — linear when k is small.</p></a>
  <a class="topic-card" href="08-radix/"><span class="topic-card__num">08</span><h3>Radix sort (LSD)</h3><p>Counting-sort by each digit from least to most significant — linear for fixed width.</p></a>
</div>

## Common variations
**Hybrid sorts** — Timsort (Python, Java) and Introsort (C++ STL) blend insertion / merge / quick / heap to win on real-world data. **Partial sorts** — `nth_element` (quickselect) returns the k-th order statistic in O(n) average. **External sorts** — when data doesn't fit in memory, merge sort streams runs from disk. **Custom comparators** — most languages let you sort by key (Python `key=`, Java `Comparator`), which is how "sort by frequency then lexicographic" problems are usually solved.
