---
title: Graph Algorithms
---

# DSA · 08 · Graph Algorithms

> Dijkstra, MST, Union-Find, topological sort — the graph algorithm toolkit.

## When to use this pattern

- **Shortest paths** between nodes with non-negative weights → Dijkstra; with negatives → Bellman-Ford; all-pairs → Floyd-Warshall.
- **Minimum spanning tree** for "connect everything cheapest" → Kruskal or Prim.
- **Dependencies / ordering** ("course schedule", "alien dictionary") → topological sort.
- **Connectivity / grouping** ("number of provinces", "redundant connection") → Union-Find.
- **Strongly connected components** in a directed graph ("critical connections") → Tarjan.

## The shape of the solution

Graph problems factor into two questions: *what representation?* (adjacency list almost always) and *what traversal?* (BFS for unweighted shortest paths, DFS for connectivity / topo, priority queue for weighted). The algorithms in this section are specialized traversals — Dijkstra is BFS with a priority queue, Kahn's topo is BFS over an in-degree map, Union-Find is "implicit" graph traversal via merging, and Tarjan is DFS with low-link bookkeeping.

Pick the algorithm by reading the problem's *operation* (shortest, connect, order, partition) and the *edge weight constraints* (none, non-negative, possibly negative, all-pairs).

## Topics in this section

<div class="topic-grid">

  <a class="topic-card" href="01-topological-sort/">
    <span class="topic-card__num">01</span>
    <h3>Topological Sort (Kahn)</h3>
    <p>BFS over in-degree zero — linear order of a DAG.</p>
  </a>

  <a class="topic-card" href="02-dijkstra/">
    <span class="topic-card__num">02</span>
    <h3>Dijkstra Shortest Path</h3>
    <p>Min-heap + non-negative weights — fastest single-source.</p>
  </a>

  <a class="topic-card" href="03-bellman-ford/">
    <span class="topic-card__num">03</span>
    <h3>Bellman-Ford</h3>
    <p>Relax every edge V-1 times — handles negative weights and detects negative cycles.</p>
  </a>

  <a class="topic-card" href="04-floyd-warshall/">
    <span class="topic-card__num">04</span>
    <h3>Floyd-Warshall</h3>
    <p>All-pairs shortest paths via triple loop — O(V³) but trivially correct.</p>
  </a>

  <a class="topic-card" href="05-union-find/">
    <span class="topic-card__num">05</span>
    <h3>Union-Find (DSU)</h3>
    <p>Path compression + union by rank — near-constant per-op.</p>
  </a>

  <a class="topic-card" href="06-kruskal/">
    <span class="topic-card__num">06</span>
    <h3>Kruskal MST</h3>
    <p>Sort edges, add if endpoints disjoint — Union-Find under the hood.</p>
  </a>

  <a class="topic-card" href="07-prim/">
    <span class="topic-card__num">07</span>
    <h3>Prim MST</h3>
    <p>Grow the tree one cheapest edge at a time — heap variant of Dijkstra.</p>
  </a>

  <a class="topic-card" href="08-tarjan-scc/">
    <span class="topic-card__num">08</span>
    <h3>Tarjan SCC</h3>
    <p>DFS + low-link — strongly connected components and bridges in one pass.</p>
  </a>

</div>

## Common variations

- **Multi-source** — seed Dijkstra/BFS with multiple starts; distance 0 for each.
- **K-shortest paths** — relax the "visited" invariant; allow up to K relaxations per node.
- **0-1 BFS** — deque + push to front for 0-weight edges, back for 1-weight; replaces Dijkstra at O(V+E).
- **A\*** — Dijkstra + admissible heuristic; same code, different key.
- **Bidirectional search** — meet in the middle; halves the explored frontier on average.
