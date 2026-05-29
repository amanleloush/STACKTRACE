---
title: Monotonic Stack
---

# DSA · 15 · Monotonic Stack

> Next greater element, daily temperatures, largest rectangle.

## When to use this pattern
- Problem mentions "next greater / previous smaller / nearest taller" — verbatim trigger.
- You need histogram-style answers: largest rectangle, maximal trapping, span.
- Brackets / expression matching / score-of-parentheses — a vanilla stack pattern.
- A scan needs to remember a *sorted* subset of indices seen so far.
- You're doing O(n²) range comparisons that boil down to "for each i, find the closest j with property P".

## The shape of the solution
Sweep the array once with an auxiliary stack of **indices** (not values — you usually need the position). Maintain a monotone order: e.g., values **strictly decreasing** from bottom to top for "next greater". Before pushing the current index, **pop** every stacked index whose value violates the order — those popped indices have their answer right now (the current index is their next-greater). Amortized analysis: every index is pushed and popped at most once, so total work across the loop is O(n) even though the inner pop loop can spike. Brackets are a degenerate special case: push openers, pop on matching closers.

## Topics in this section
<div class="topic-grid">
  <a class="topic-card" href="01-valid-parentheses/"><span class="topic-card__num">01</span><h3>Valid Parentheses</h3><p>Plain stack: push openers, match on close — the gentle introduction.</p></a>
  <a class="topic-card" href="02-next-greater/"><span class="topic-card__num">02</span><h3>Next Greater Element</h3><p>Monotonic decreasing stack of indices — every pop gets its answer.</p></a>
  <a class="topic-card" href="03-daily-temperatures/"><span class="topic-card__num">03</span><h3>Daily Temperatures</h3><p>Next-greater applied to temperatures — record the *distance*, not the value.</p></a>
  <a class="topic-card" href="04-largest-rectangle/"><span class="topic-card__num">04</span><h3>Largest Rectangle in Histogram</h3><p>For each bar, find nearest smaller left and right with one pass and a sentinel.</p></a>
</div>

## Common variations
**Two passes** — left-to-right for "previous smaller", right-to-left for "next smaller". **Circular arrays** (LC 503) — extend the sweep to `2n` iterations. **Monotonic deques** (LC 239 sliding window max) — same monotone discipline, both ends mutable. **Cartesian trees** are built from a monotonic stack and unlock RMQ-flavored problems. The hardest monotonic-stack problems are the ones where the *invariant changes* (e.g., LC 84 → LC 85 maximal rectangle of 0/1 matrix).
