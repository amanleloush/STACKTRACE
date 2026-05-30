---
title: Binary Search
---

# DSA · 03 · Binary Search

> Halve the search space — over indices, over answers, over rotated arrays.

## When to use this pattern

- The input is **sorted** (or you can sort it cheaply), or has a **monotonic property** along some axis.
- The problem asks "find / check if there exists an element" in O(log n) instead of O(n).
- You see phrasing like **"minimum X such that ..."** or **"maximum X such that ..."** — that's binary search on the answer.
- The array is sorted but **rotated** — search still collapses to O(log n) with a twist.
- You're hunting a **boundary** (first/last occurrence, leftmost true in a `FFFTTT` predicate).

## The shape of the solution

Maintain two pointers `lo` and `hi` that bracket the candidate range. Each iteration computes `mid = (lo + hi) // 2`, evaluates a **predicate** at `mid`, and discards half the range. The predicate is what changes between variants — for classic search it's `arr[mid] == target`; for "search on answer" it's `feasible(mid)`. The invariant is that the answer always lives in `[lo, hi]`. Pick your loop condition (`lo < hi` vs `lo <= hi`) and your halving (`hi = mid` vs `hi = mid - 1`) deliberately — off-by-one is the single biggest source of bugs in this family.

## Topics in this section

<div class="topic-grid">

  <a class="topic-card" href="01-classic/">
    <span class="topic-card__num">01</span>
    <h3>Classic binary search</h3>
    <p>Find a target in a sorted array — the canonical template.</p>
  </a>

  <a class="topic-card" href="02-first-last-occurrence/">
    <span class="topic-card__num">02</span>
    <h3>First / last occurrence</h3>
    <p>Boundary search — the leftmost or rightmost index that satisfies a predicate.</p>
  </a>

  <a class="topic-card" href="03-rotated-sorted/">
    <span class="topic-card__num">03</span>
    <h3>Search in rotated sorted array</h3>
    <p>The array is sorted but rotated — one half is always sorted.</p>
  </a>

  <a class="topic-card" href="04-search-on-answer/">
    <span class="topic-card__num">04</span>
    <h3>Binary search on answer</h3>
    <p>The answer itself is the search space — bracket it with a feasibility predicate.</p>
  </a>

  <a class="topic-card" href="05-2d-matrix/">
    <span class="topic-card__num">05</span>
    <h3>Search 2D matrix (staircase walk)</h3>
    <p>Sorted matrix — start from a corner and walk monotonically.</p>
  </a>

  <a class="topic-card" href="06-median-of-two/">
    <span class="topic-card__num">06</span>
    <h3>Median of two sorted arrays</h3>
    <p>O(log min(n, m)) — the hardest classic binary search problem.</p>
  </a>

</div>

## Common variations

- **Inclusive vs exclusive bounds.** `lo <= hi` with `mid - 1 / mid + 1` updates is the safest default; `lo < hi` with `hi = mid` is cleaner for boundary searches but trickier.
- **Overflow on `mid`.** In languages with fixed-width ints, use `mid = lo + (hi - lo) // 2` to avoid `lo + hi` overflow. Python is immune but the habit is good.
- **Predicate shape `FFFTTT`.** When searching for a boundary, mentally label each index as F or T — you're hunting the first T (or last F).
- **Duplicates flip the math.** With duplicates, you may need to advance `lo` past equal elements (e.g. rotated array II) which degrades the worst case to O(n).
- **Floating-point search.** Loop until `hi - lo < ε`, not until they meet exactly.
