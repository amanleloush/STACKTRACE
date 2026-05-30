---
title: BFS
---

# DSA · 04 · BFS

> Layered exploration — shortest path in unweighted graphs and grids.

## When to use this pattern

- The problem asks for **shortest path / fewest steps** between two nodes in an **unweighted** graph.
- You need to process nodes **level by level** — e.g. tree-by-depth, all cells at distance `k`.
- The state space is a graph or grid maze, and you can model moves as edges.
- You have multiple sources expanding simultaneously (rotting oranges, walls-and-gates).
- The "edges" are abstract — string transformations (Word Ladder), lock combinations, sliding puzzles.

## The shape of the solution

Push the start node(s) into a queue, mark them visited, then repeatedly pop and expand neighbours. Each level of the queue corresponds to one extra step of distance from the source(s). The visited set (or distance map) prevents re-expanding nodes and guarantees O(V + E) total work. The key invariant: **the first time BFS reaches a node, it does so via a shortest path** — that's why BFS beats DFS for unweighted shortest path. For grids, neighbours are the 4 (or 8) adjacent cells; for graphs, they're adjacency-list entries; for abstract puzzles, they're whatever moves the problem defines.

## Topics in this section

<div class="topic-grid">

  <a class="topic-card" href="01-bfs-graph/">
    <span class="topic-card__num">01</span>
    <h3>BFS on graph</h3>
    <p>Queue + visited set on a generic adjacency list.</p>
  </a>

  <a class="topic-card" href="02-bfs-grid/">
    <span class="topic-card__num">02</span>
    <h3>BFS on grid</h3>
    <p>4-directional moves with bounds and obstacle checks.</p>
  </a>

  <a class="topic-card" href="03-level-order/">
    <span class="topic-card__num">03</span>
    <h3>Tree level-order traversal</h3>
    <p>Process nodes one level at a time — the bedrock tree BFS.</p>
  </a>

  <a class="topic-card" href="04-multi-source/">
    <span class="topic-card__num">04</span>
    <h3>Multi-source BFS</h3>
    <p>Seed the queue with all sources at once — distances stay correct.</p>
  </a>

  <a class="topic-card" href="05-word-ladder/">
    <span class="topic-card__num">05</span>
    <h3>Word Ladder</h3>
    <p>BFS on a string-transformation graph — the canonical abstract BFS.</p>
  </a>

</div>

## Common variations

- **Bidirectional BFS** — expand from source and target simultaneously, stop when they meet. Cuts search space from `b^d` to `2·b^(d/2)`.
- **0-1 BFS** — for graphs with edge weights 0 and 1, use a deque (push-front for 0, push-back for 1) instead of a heap. O(V + E).
- **Multi-source seed** — instead of running BFS from each source independently, seed them all into the queue at distance 0.
- **Track parents** — to reconstruct the shortest path itself, store `parent[node]` and walk back from the target.
- **Distance vs visited** — use a distance map when you need the actual distance; a visited set when you only need reachability.
