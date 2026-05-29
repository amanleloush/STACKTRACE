---
title: Heap / Priority Queue
---

# DSA · 07 · Heap / Priority Queue

> Top-K, median of stream, K closest, scheduling — anywhere you need fast min/max.

## When to use this pattern

- The problem mentions **"top K"**, **"K largest"**, **"K smallest"**, or **"K closest"**.
- You need the **median** of a running stream or the smallest/largest element repeatedly.
- You're **merging K sorted sequences** and want the next item in O(log K).
- You're **scheduling** jobs by priority, cooldown, or cost (Dijkstra, task scheduler, IPO).
- You need **frequency-based** answers ("top K frequent") and a sort would be overkill.

## The shape of the solution

A heap is a binary tree stored as an array where each parent is ≤ (min-heap) or ≥ (max-heap) its children. Python's `heapq` is a min-heap; negate values for max-heap behavior. The two operations you care about are `push` and `pop`, both O(log n). Building a heap from a list is O(n) via `heapify`. The common trick for top-K is to keep a heap of size K and evict the worst — that gives O(n log K) instead of O(n log n) for a full sort.

When you see "running" or "stream" or "as elements arrive," reach for a heap. When you see "K of something," reach for a size-K heap.

## Topics in this section

<div class="topic-grid">

  <a class="topic-card" href="01-top-k/">
    <span class="topic-card__num">01</span>
    <h3>Top K Largest</h3>
    <p>Keep a min-heap of size K — the root is the K-th largest.</p>
  </a>

  <a class="topic-card" href="02-merge-k-sorted/">
    <span class="topic-card__num">02</span>
    <h3>Merge K Sorted Lists</h3>
    <p>Heap of K heads — pop the smallest, push its successor.</p>
  </a>

  <a class="topic-card" href="03-median-of-stream/">
    <span class="topic-card__num">03</span>
    <h3>Median of Stream</h3>
    <p>Two heaps — max-heap on the low half, min-heap on the high half.</p>
  </a>

  <a class="topic-card" href="04-k-closest-points/">
    <span class="topic-card__num">04</span>
    <h3>K Closest Points</h3>
    <p>Max-heap of size K keyed on squared distance — evict the farthest.</p>
  </a>

  <a class="topic-card" href="05-task-scheduler/">
    <span class="topic-card__num">05</span>
    <h3>Task Scheduler with Cooldown</h3>
    <p>Max-heap on frequency + cooldown queue for the n-step gap.</p>
  </a>

</div>

## Common variations

- **Lazy deletion** — when you can't remove an arbitrary heap entry, mark it stale and skip it on pop.
- **Indexed heap / heap + hash** — supports `decrease-key` in O(log n) (Dijkstra with updates).
- **Two-heap pattern** — median, sliding-window median, IPO-style "pick best feasible."
- **Fixed-size heap** — for top-K, the heap size is bounded by K, not n.
