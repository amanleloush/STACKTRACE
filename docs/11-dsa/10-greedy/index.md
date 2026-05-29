---
title: Greedy
---

# DSA · 10 · Greedy

> Local choice → global optimum when an exchange argument holds.

## When to use this pattern
- The problem asks for a "minimum/maximum X with constraints" and a sort order makes the right choice obvious.
- Interval problems: pick the one that ends first, the one that starts latest, the one that covers the most.
- Jump-style problems where you track the farthest you can reach and ratchet a frontier forward.
- Scheduling, partitioning, and packing where you can prove "swapping in the greedy choice never makes the answer worse."
- Huffman-like constructions where repeatedly taking the two smallest elements rebuilds an optimal tree.

## The shape of the solution
Sort the input by the right key — earliest finish time, smallest weight, longest reach — and sweep once. Maintain a tiny piece of state (a running frontier, a current end, a heap of pending items) and commit to the greedy choice without looking back. The hard work isn't the loop; it's the **exchange argument** that says "for any optimal solution that disagrees with my choice, I can swap in my choice and not get worse." When that argument doesn't hold (e.g., coin change with arbitrary denominations), greedy silently lies — fall back to DP.

## Topics in this section
<div class="topic-grid">
  <a class="topic-card" href="01-activity-selection/"><span class="topic-card__num">01</span><h3>Activity Selection</h3><p>Earliest finish time wins.</p></a>
  <a class="topic-card" href="02-jump-game/"><span class="topic-card__num">02</span><h3>Jump Game</h3><p>Track the farthest reachable index.</p></a>
  <a class="topic-card" href="03-gas-station/"><span class="topic-card__num">03</span><h3>Gas Station</h3><p>Reset start on every deficit.</p></a>
  <a class="topic-card" href="04-huffman/"><span class="topic-card__num">04</span><h3>Huffman Coding</h3><p>Repeatedly merge the two smallest.</p></a>
  <a class="topic-card" href="05-intervals/"><span class="topic-card__num">05</span><h3>Interval Merging</h3><p>Sort by start, extend the active end.</p></a>
</div>

## Common variations
"Pick the interval that ends earliest" solves activity selection, arrow shots, and non-overlap counts — they're the same problem with different objectives. Jump-style problems (Jump Game I/II, Video Stitching, Tap Watering) all reduce to "what's the farthest I can reach from anywhere in the current frontier?" Huffman generalizes to any "merge two smallest" cost-minimization (connect sticks, halve array sum). When a greedy proof fails, it usually fails because the input has a hidden dependency that DP would catch — e.g., gas station works greedy because the total-fuel test guarantees a solution exists.
