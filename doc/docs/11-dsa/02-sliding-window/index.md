---
title: Sliding Window
---

# DSA · 02 · Sliding Window

> Maintain a window `[l, r]` over a sequence; expand right, shrink left.

## When to use this pattern

- The problem asks for the **longest / shortest contiguous** subarray or substring satisfying some property.
- A **fixed-size window** of length `k` slides across the array (max sum / max average / specific counts).
- You see phrasing like **"at most K of something"**, **"at most K distinct"**, or **"exactly K"** — the latter reduces to "at most K minus at most K - 1".
- The problem involves **anagrams / permutations** of a target inside a string.
- Brute force is "for every pair `(l, r)`" — that's O(n²) and is almost always replaceable by a window.

## The shape of the solution

Keep two indices `l` and `r` and a small piece of *window state* — a counter, a sum, a hash map of character frequencies. Expand: move `r` right, ingest `s[r]`. While the window violates the invariant, shrink: evict `s[l]`, move `l` right. Record the answer when the window is valid. Each index enters and leaves the window at most once, so the whole sweep is O(n) regardless of how nested the inner while looks. The art is choosing the right window state and the right "is this window valid?" check.

## Topics in this section

<div class="topic-grid">

  <a class="topic-card" href="01-fixed-window-max/">
    <span class="topic-card__num">01</span>
    <h3>Fixed-size window — max sum of K</h3>
    <p>The simplest variant — slide a length-K window and roll the sum.</p>
  </a>

  <a class="topic-card" href="02-longest-no-repeat/">
    <span class="topic-card__num">02</span>
    <h3>Longest substring without repeating characters</h3>
    <p>Variable-size window with a "last seen" hash map.</p>
  </a>

  <a class="topic-card" href="03-min-window-substring/">
    <span class="topic-card__num">03</span>
    <h3>Minimum Window Substring</h3>
    <p>Shrink-then-record — the hardest of the classic windows.</p>
  </a>

  <a class="topic-card" href="04-longest-subarray-sum-k/">
    <span class="topic-card__num">04</span>
    <h3>Longest subarray with sum ≤ K</h3>
    <p>Window monotonicity — when all elements are non-negative, shrinking is monotone.</p>
  </a>

  <a class="topic-card" href="05-permutation-in-string/">
    <span class="topic-card__num">05</span>
    <h3>Permutation in String</h3>
    <p>Fixed-size window matching a frequency map — fast hash equality.</p>
  </a>

</div>

## Common variations

- **Fixed vs variable size.** Fixed: enforce window length `== k` every step. Variable: the window grows and shrinks based on a predicate.
- **"At most K" vs "exactly K".** Compute "at most K" and "at most K - 1"; subtract. A classic trick used in subarrays-with-K-distinct-integers.
- **String windows with frequency maps.** Track a `matched` counter that increments only when a character's count *hits* the required count, decrements only when it *falls past*. Saves a costly dict comparison every step.
- **Window over a stream.** When n doesn't fit in memory, use a deque for the window contents.
- **Two-pointer vs sliding-window distinction.** Both walk indices, but a window keeps *state about everything inside* `[l, r]`; pure two-pointer only cares about the endpoints.
