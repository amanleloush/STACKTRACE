---
title: Monotonic Stack — cheatsheet
---

# Monotonic Stack · Cheatsheet

> One-page recall. Print, paste in Notion, glance before the interview.

## Trigger

**You see in the problem:**
- "Next greater / smaller element" or "previous greater / smaller element".
- "How many days / steps until …", "span" problems.
- "Largest rectangle in histogram", "trapping rain water", "remove K digits", "stock span".
- A brute force has two nested loops with the inner loop scanning forward/backward for a comparison.

**Reach for this pattern when:** for each element, you need the nearest element to its left/right that satisfies a strict ordering (greater, smaller, ≥, ≤).

**Don't reach for it when:** you need the *global* min/max — that's a single variable. Or when you need "any matching element" without an ordering constraint — that's a hash map.

## The mental model

A **monotonic stack** is a stack you maintain in one strict direction. When you encounter an element that would violate the order, you pop until the order is restored — and *those pops* are when you produce answers.

Two variants:

- **Monotonic decreasing (`heights[stack[-1]] > h[i]` triggers pop)** — produces "next smaller element" answers.
- **Monotonic increasing (`heights[stack[-1]] < h[i]` triggers pop)** — produces "next greater element" answers.

Each element is pushed at most once and popped at most once → total work O(n).

## Skeleton — next greater element

```python
def next_greater(a):
    n = len(a)
    res = [-1] * n
    stack = []                            # indices, monotonically decreasing values
    for i in range(n):
        while stack and a[stack[-1]] < a[i]:
            j = stack.pop()
            res[j] = a[i]
        stack.append(i)
    return res
```

## Skeleton — largest rectangle in histogram

```python
def largest_rect(h):
    h = h + [0]                          # sentinel forces all pops at the end
    stack, best = [], 0
    for i, x in enumerate(h):
        while stack and h[stack[-1]] > x:
            top = stack.pop()
            width = i if not stack else i - stack[-1] - 1
            best = max(best, h[top] * width)
        stack.append(i)
    return best
```

## Complexity

- Time: O(n) — amortized, since each element is pushed once and popped once.
- Space: O(n) for the stack in the worst case (e.g., a sorted input).

## Variants in this pattern

1. **Next greater / next smaller** — vary the pop condition; store indices for span.
2. **Previous greater / previous smaller** — scan right-to-left, or maintain a stack of unpopped indices.
3. **Circular array variants** — iterate the array twice (length 2n) and use `i % n` for output.
4. **Two-sided spans (histogram-style)** — combine "previous smaller" and "next smaller" to bound rectangles.
5. **Sentinel-driven drain** — append a sentinel value (0 or ∞) so the final pops happen inside the loop.
6. **Lexicographic optimization (remove K digits)** — pop while top is greater than current and pops remaining.
7. **Stock span / daily temperatures** — distance to next greater element.

## Top problems

- [LC 496 — Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/) (Easy) — the canonical.
- [LC 503 — Next Greater Element II](https://leetcode.com/problems/next-greater-element-ii/) (Med) — circular array.
- [LC 739 — Daily Temperatures](https://leetcode.com/problems/daily-temperatures/) (Med) — span variant.
- [LC 901 — Online Stock Span](https://leetcode.com/problems/online-stock-span/) (Med) — span, streaming.
- [LC 84 — Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/) (Hard) — the masterclass; uses both directions implicitly.
- [LC 85 — Maximal Rectangle](https://leetcode.com/problems/maximal-rectangle/) (Hard) — LC 84 applied per row.
- [LC 42 — Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/) (Hard) — monotonic stack OR two-pointer.
- [LC 907 — Sum of Subarray Minimums](https://leetcode.com/problems/sum-of-subarray-minimums/) (Med) — contribution counting with mono stack.
- [LC 402 — Remove K Digits](https://leetcode.com/problems/remove-k-digits/) (Med) — lexicographic variant.

## Common bugs / pitfalls

- **Storing values instead of indices.** Almost always you need the index — for span computation, for write-back position. Push indices, read values via `a[stack[-1]]`.
- **Strict vs. non-strict comparison.** `<` vs `≤` controls duplicate handling. For "next *strictly* greater", use `<`; for "next ≥", use `≤`. Pick deliberately.
- **Forgetting to drain.** After the main loop, the stack still holds elements with no "next greater". Either leave them as -1 (default) or use a sentinel (∞ for next-smaller, 0 for largest-rectangle).
- **Wrong direction.** "Previous greater" needs an increasing stack scanned left-to-right (or decreasing right-to-left). Easy to confuse.
- **Mishandling circular arrays.** Iterating 2n times is the trick; just don't write to `res[i]` when `i >= n`.

## In 30 seconds

**Monotonic stack = "the unpopped elements all have the same ordering against you." When you arrive and break the order, pop and answer them.** Push indices, not values. Drain with a sentinel. Each element costs O(1) amortized.
