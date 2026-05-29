---
title: Two Pointers
---

# DSA · 01 · Two Pointers

> Pairs of indices walking the array — converge from ends, slow/fast partition.

## When to use this pattern

- The input is a **sorted array** and the question asks about a **pair / triplet** with some sum or difference property.
- The problem says **"in place"** — remove an element, compact zeros, dedupe — and bans extra memory.
- You're checking a **palindrome** or any symmetric property where the ends matter.
- Two **walls / heights** define an area, volume, or capacity (`container with most water`, `trapping rain water`).
- A **slow/fast** split is needed to partition the array (move zeros, sort colors, Dutch flag).

## The shape of the solution

Maintain two indices — most often `l` at the left and `r` at the right, or `slow` and `fast` both starting at 0. On each step, look at the elements they point to and **make one decision**: which pointer advances, and what (if anything) gets written. The invariant is that everything outside `[l, r]` (or before `slow`) has already been resolved correctly, so when the pointers meet or cross you're done. The trick is choosing the comparison: `arr[l] + arr[r]` vs `target`, `height[l]` vs `height[r]`, `arr[fast]` vs `arr[slow]`. Get the comparison right and the rest is mechanical.

## Topics in this section

<div class="topic-grid">

  <a class="topic-card" href="01-reverse-array/">
    <span class="topic-card__num">01</span>
    <h3>Reverse array in place</h3>
    <p>The simplest two-pointer move — swap ends and walk inward.</p>
  </a>

  <a class="topic-card" href="02-two-sum-sorted/">
    <span class="topic-card__num">02</span>
    <h3>Two Sum on sorted array</h3>
    <p>Converge from both ends, using the sum to decide which pointer moves.</p>
  </a>

  <a class="topic-card" href="03-remove-duplicates/">
    <span class="topic-card__num">03</span>
    <h3>Remove duplicates (in place)</h3>
    <p>Slow/fast partition — slow marks the write head, fast scans.</p>
  </a>

  <a class="topic-card" href="04-container-most-water/">
    <span class="topic-card__num">04</span>
    <h3>Container With Most Water</h3>
    <p>Two walls, shrinking width — always move the shorter side.</p>
  </a>

  <a class="topic-card" href="05-3sum/">
    <span class="topic-card__num">05</span>
    <h3>3Sum</h3>
    <p>Fix one element, two-pointer the rest — the canonical reduction.</p>
  </a>

  <a class="topic-card" href="06-trapping-rain-water/">
    <span class="topic-card__num">06</span>
    <h3>Trapping Rain Water</h3>
    <p>Track the running max on each side — the lower side decides water held.</p>
  </a>

</div>

## Common variations

- **Same direction (slow/fast)** vs **opposite directions (l/r).** Slow/fast partitions in place; opposite-end converges on a sum or area.
- **Need to sort first.** 3Sum, 4Sum, K-diff pairs — sorting is the enabling step; budget it into your complexity.
- **Skip duplicates.** When the array can contain repeats and the question asks for *unique* tuples, advance the pointer past equal neighbours after each match.
- **Circular array.** Concatenate the array with itself and run a windowed two-pointer over `2n`.
- **Linked list flavour.** Slow/fast on a list gives you cycle detection (Floyd) and middle-of-list — the same pattern, different cursor type.
