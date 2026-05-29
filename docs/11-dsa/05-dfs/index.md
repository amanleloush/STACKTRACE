---
title: DFS
---

# DSA · 05 · DFS

> Go deep first — flood fill, cycle detection, tree traversals.

## When to use this pattern
- You need to **explore every node of a connected region** (islands, flood fill, enclaves).
- You want **any path** from A to B, not the shortest one (BFS owns shortest-in-unweighted).
- You're working on a **tree** — preorder, inorder, postorder, path sums, diameter.
- You need to **detect a cycle** in a directed or undirected graph.
- The recursion depth fits the stack (or you've rewritten it iteratively for huge inputs).

## The shape of the solution
DFS is a single recursive function — `dfs(node)` — that marks the node visited, then calls itself on each unvisited neighbour. The recursion stack *is* the path you're currently exploring; when the function returns, you've finished one branch and the caller continues with the next. For graphs you carry a `visited` set; for trees you don't need one because there are no back-edges. The two superpowers are **returning a value from below** (subtree sum, height, path-existence) and **mutating state on the way down and undoing it on the way up** (backtracking, three-color cycle detection).

## Topics in this section

<div class="topic-grid">
  <a class="topic-card" href="01-dfs-graph/">
    <span class="topic-card__num">01</span>
    <h3>DFS on graph</h3>
    <p>The skeleton: visited set, recursive neighbour walk.</p>
  </a>
  <a class="topic-card" href="02-number-of-islands/">
    <span class="topic-card__num">02</span>
    <h3>Number of Islands</h3>
    <p>Flood fill — the canonical 2D DFS.</p>
  </a>
  <a class="topic-card" href="03-tree-traversals/">
    <span class="topic-card__num">03</span>
    <h3>Tree traversals</h3>
    <p>Preorder, inorder, postorder — when to do the work.</p>
  </a>
  <a class="topic-card" href="04-path-sum/">
    <span class="topic-card__num">04</span>
    <h3>Path Sum</h3>
    <p>Root-to-leaf accumulation with backtracking.</p>
  </a>
  <a class="topic-card" href="05-cycle-detection/">
    <span class="topic-card__num">05</span>
    <h3>Cycle detection</h3>
    <p>Three-color marking for directed graphs.</p>
  </a>
</div>

## Common variations
Iterative DFS with an explicit stack mirrors the recursive version one-to-one and avoids stack overflow on deep graphs. For undirected graphs cycle detection only needs a `visited` set plus the parent pointer; for directed graphs you need the **three-color** trick (white = unseen, gray = on current path, black = finished) because revisiting a black node is fine but hitting a gray one is a back-edge. Tree problems often blend DFS with **postorder accumulation** — compute children first, then combine — which is how diameter, balanced-check, and max-path-sum all work in one pass.
