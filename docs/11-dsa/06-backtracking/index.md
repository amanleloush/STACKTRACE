---
title: Backtracking
---

# DSA · 06 · Backtracking

> Try, recurse, undo — subsets, permutations, N-queens, word search.

## When to use this pattern
- The problem says **"generate all ..."**, **"find all ..."**, or **"count all ..."** valid configurations.
- You need every **path, combination, or permutation** — not just one optimal answer.
- The input is small (typically `n ≤ 20`) and the search space is exponential but heavily prunable.
- You can describe the state as a **partial solution** that can be extended one decision at a time.
- A natural pruning rule exists (constraint, used-set, monotonicity) that lets you abandon subtrees early.

## The shape of the solution
Backtracking is DFS on a **decision tree**. At each node you make a choice, recurse, then **undo the choice** before trying the next. The choice you just made is the difference between this branch and its sibling — undoing it is what lets you reuse the same `path` buffer across the whole search instead of allocating fresh state per leaf. The skeleton is always: *base case → capture solution → loop over candidates → choose → recurse → un-choose*. Pruning is what separates a 2-second solution from a 2-hour timeout — sort, dedupe, and add constraint checks **before** the recursive call.

## Topics in this section

<div class="topic-grid">
  <a class="topic-card" href="01-subsets/">
    <span class="topic-card__num">01</span>
    <h3>Subsets</h3>
    <p>Include-or-exclude at every index.</p>
  </a>
  <a class="topic-card" href="02-permutations/">
    <span class="topic-card__num">02</span>
    <h3>Permutations</h3>
    <p>Pick from remaining at each level.</p>
  </a>
  <a class="topic-card" href="03-combinations/">
    <span class="topic-card__num">03</span>
    <h3>Combinations</h3>
    <p>Choose k of n with a monotone start index.</p>
  </a>
  <a class="topic-card" href="04-n-queens/">
    <span class="topic-card__num">04</span>
    <h3>N-Queens</h3>
    <p>Place row-by-row with column/diagonal guards.</p>
  </a>
  <a class="topic-card" href="05-word-search/">
    <span class="topic-card__num">05</span>
    <h3>Word Search</h3>
    <p>Grid DFS with mark/unmark per cell.</p>
  </a>
  <a class="topic-card" href="06-generate-parentheses/">
    <span class="topic-card__num">06</span>
    <h3>Generate Parentheses</h3>
    <p>Two counters, two pruning rules.</p>
  </a>
</div>

## Common variations
**Subsets / combinations** use a monotone `start` index to avoid duplicate orderings. **Permutations** use a `used[]` array (or pick-from-remaining) because order matters. **Sorted-input + skip-duplicates** (`if i > start and nums[i] == nums[i-1]: continue`) is the dedupe trick that turns `Subsets II` and `Permutations II` from broken to correct. **Constraint propagation** (columns/diagonals for N-Queens, character counts for word puzzles) is how interview-quality solutions hit the time limit. When the problem only asks for **one** valid configuration, return `True` up the stack the moment you find it — no need to enumerate the rest.
