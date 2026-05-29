---
title: DSA · Interview Prep
---

# Phase 11 · DSA — Interview Prep

> **Learn algorithms by *watching* them run.** Every algorithm here ships with a step-by-step visualization where you see the state evolve and the corresponding line of code light up. Pattern-first, the way working engineers think about problems, the way [HelloInterview](https://www.hellointerview.com/learn/code) and [USACO Guide](https://usaco.guide/) structure them.

<div class="topic-grid">

  <a class="topic-card" href="00-foundations/">
    <span class="topic-card__num">00</span>
    <h3>Foundations</h3>
    <p>Big-O, recursion, the pattern map — read this first if you're rusty.</p>
  </a>

  <a class="topic-card" href="01-two-pointers/">
    <span class="topic-card__num">01</span>
    <h3>Two Pointers</h3>
    <p>Pairs of indices walking the array — converge from ends, slow/fast, partition.</p>
  </a>

  <a class="topic-card" href="02-sliding-window/">
    <span class="topic-card__num">02</span>
    <h3>Sliding Window</h3>
    <p>Maintain a window [l, r] over a sequence; expand right, shrink left.</p>
  </a>

  <a class="topic-card" href="03-binary-search/">
    <span class="topic-card__num">03</span>
    <h3>Binary Search</h3>
    <p>Halve the search space — over indices, over answers, over rotated arrays.</p>
  </a>

  <a class="topic-card" href="04-bfs/">
    <span class="topic-card__num">04</span>
    <h3>BFS</h3>
    <p>Layered exploration — shortest path in unweighted graphs and grids.</p>
  </a>

  <a class="topic-card" href="05-dfs/">
    <span class="topic-card__num">05</span>
    <h3>DFS</h3>
    <p>Go deep first — flood fill, cycle detection, tree traversals.</p>
  </a>

  <a class="topic-card" href="06-backtracking/">
    <span class="topic-card__num">06</span>
    <h3>Backtracking</h3>
    <p>Try, recurse, undo — subsets, permutations, N-queens, word search.</p>
  </a>

  <a class="topic-card" href="07-heap/">
    <span class="topic-card__num">07</span>
    <h3>Heap / Priority Queue</h3>
    <p>Top-K, median of stream, K closest, scheduling — anywhere you need fast min/max.</p>
  </a>

  <a class="topic-card" href="08-graphs/">
    <span class="topic-card__num">08</span>
    <h3>Graph Algorithms</h3>
    <p>Dijkstra, Bellman-Ford, MST, Union-Find, topological sort, SCC.</p>
  </a>

  <a class="topic-card" href="09-dp/">
    <span class="topic-card__num">09</span>
    <h3>Dynamic Programming</h3>
    <p>Tabulation vs memoization — Fibonacci, knapsack, LIS, LCS, edit distance.</p>
  </a>

  <a class="topic-card" href="10-greedy/">
    <span class="topic-card__num">10</span>
    <h3>Greedy</h3>
    <p>Local choice → global optimum when an exchange argument holds.</p>
  </a>

  <a class="topic-card" href="11-trie/">
    <span class="topic-card__num">11</span>
    <h3>Trie</h3>
    <p>Prefix trees for autocomplete, word dictionaries, multi-pattern search.</p>
  </a>

  <a class="topic-card" href="12-bit-manipulation/">
    <span class="topic-card__num">12</span>
    <h3>Bit Manipulation</h3>
    <p>XOR tricks, popcount DP, bitmask DP for exponential state compression.</p>
  </a>

  <a class="topic-card" href="13-sorting/">
    <span class="topic-card__num">13</span>
    <h3>Sorting</h3>
    <p>Bubble, insertion, selection, merge, quick, heap, counting, radix.</p>
  </a>

  <a class="topic-card" href="14-linked-list/">
    <span class="topic-card__num">14</span>
    <h3>Linked List</h3>
    <p>Reverse, cycle, merge, LRU cache — pointer surgery patterns.</p>
  </a>

  <a class="topic-card" href="15-stack-monotonic/">
    <span class="topic-card__num">15</span>
    <h3>Monotonic Stack</h3>
    <p>Next greater element, daily temperatures, largest rectangle.</p>
  </a>

</div>

## How to use this section

1. **Pick a pattern** — the cards above. Start with the ones that come up most: Two Pointers, Sliding Window, Binary Search, BFS, DFS, DP.
2. **Read the explanation** — every page has the algorithm in plain English, intuition, complexity, and pitfalls.
3. **Step through the visualization** — every page has an interactive widget with Play / Step / Reset and a code panel that highlights the currently-executing line. Click *step ›* and watch the state evolve.
4. **Practice on LeetCode** — every page ends with curated practice problems (top ~10 per pattern) ranked easy → hard.

## Why pattern-first

Interview problems are rarely truly novel — they're variations on a small set of patterns. Once you can recognize the pattern in the first 60 seconds of reading the problem ("this is sliding window because we want the longest contiguous range satisfying X"), the implementation becomes mechanical. This section trains pattern recognition.

## Time / space cheat sheet

| Operation | Array | Sorted Array | Hash Map | BST (balanced) | Heap | Trie |
| --- | --- | --- | --- | --- | --- | --- |
| Lookup | O(n) | O(log n) | O(1) avg | O(log n) | O(n) | O(L) |
| Insert | O(1) end / O(n) middle | O(n) | O(1) avg | O(log n) | O(log n) | O(L) |
| Delete | O(n) | O(n) | O(1) avg | O(log n) | O(log n) | O(L) |
| Min/Max | O(n) | O(1) | O(n) | O(log n) | O(1) | O(L) |
| Range | O(n) | O(log n + k) | O(n) | O(log n + k) | — | — |

L = key length. k = output size.

## External references

- [HelloInterview — Learn Code](https://www.hellointerview.com/learn/code) · interview-focused, pattern-first.
- [USACO Guide](https://usaco.guide/) · competitive-programming grade content, very thorough.
- [NeetCode 150 / 250](https://neetcode.io/) · LeetCode list mapped to patterns.
- [CP Algorithms](https://cp-algorithms.com/) · reference implementations and proofs.
