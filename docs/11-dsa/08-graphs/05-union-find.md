# 05 — Union-Find (DSU)

> Graph Algorithms • Position 5/8

## Problem
Maintain a partition of N elements under two operations: `find(x)` returns the representative of x's group, and `union(x, y)` merges x's and y's groups. Detect whether two elements are in the same group in near-constant time.

## Intuition
Each group is a tree; the root is the representative. **Path compression** flattens the tree on every `find` so future queries are nearly direct. **Union by rank** always hangs the shorter tree under the taller one, keeping height in check. The invariant: **every element's `parent` chain eventually reaches the root of its current group**, and the amortized cost per op is O(α(n)) — the inverse Ackermann function, effectively constant for any n you'll see.

## Algorithm
Store `parent[i]` (self-rooted initially) and `rank[i]` (initially 0). `find` recursively follows parents while compressing. `union` finds both roots, attaches the lower-rank one under the higher-rank one.

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])    # path compression
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False                                  # already joined
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        return True
```

## Walkthrough
Example: N=6. Operations: union(0,1), union(2,3), union(0,2), find(3), union(4,5), find(1), find(5).

1. union(0,1): parent[1]=0, rank[0]=1.
2. union(2,3): parent[3]=2, rank[2]=1.
3. union(0,2): both rank 1 → parent[2]=0, rank[0]=2. Now group {0,1,2,3}.
4. find(3): 3 → 2 → 0; compress so parent[3]=0, parent[2]=0. Returns 0.
5. union(4,5): parent[5]=4. find(1)=0, find(5)=4 → different groups; final group count = 2.

<div class="dsa-viz" data-algo="union-find"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(α(n)) per op (amortized)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- **Both optimizations matter** — path compression alone or rank alone is O(log n); together you get α(n). Always do both.
- **Iterative `find`** prevents recursion-depth blowups on huge inputs — two-pass: find the root, then re-walk to compress.
- **Union by size** is equivalent to rank — pick one and stay consistent.
- **Per-group metadata** (count, sum, etc.) is easy: maintain `size[root]` and update on `union`.
- **DSU doesn't support split** — you can't undo a union without snapshots or a link-cut tree.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/number-of-provinces/">547 Number of Provinces (Med)</a> — connected components by unions.</li>
    <li><a href="https://leetcode.com/problems/redundant-connection/">684 Redundant Connection (Med)</a> — the edge whose endpoints are already joined.</li>
    <li><a href="https://leetcode.com/problems/redundant-connection-ii/">685 Redundant Connection II (Hard)</a> — directed variant; in-degree + DSU.</li>
    <li><a href="https://leetcode.com/problems/graph-valid-tree/">261 Graph Valid Tree (Med)</a> — DSU rejects any cycle-forming edge.</li>
    <li><a href="https://leetcode.com/problems/number-of-islands/">200 Number of Islands (Med)</a> — DSU on grid cells.</li>
    <li><a href="https://leetcode.com/problems/number-of-islands-ii/">305 Number of Islands II (Hard)</a> — DSU shines on dynamic adds.</li>
    <li><a href="https://leetcode.com/problems/satisfiability-of-equality-equations/">990 Satisfiability of Equality Equations (Med)</a> — union equals, then verify not-equals.</li>
    <li><a href="https://leetcode.com/problems/number-of-operations-to-make-network-connected/">1319 Number of Operations to Make Network Connected (Med)</a> — components minus 1.</li>
    <li><a href="https://leetcode.com/problems/most-stones-removed-with-same-row-or-column/">947 Most Stones Removed with Same Row or Column (Med)</a> — union by shared coord.</li>
    <li><a href="https://leetcode.com/problems/accounts-merge/">721 Accounts Merge (Med)</a> — DSU on emails, then collect groups.</li>
  </ul>
</div>
