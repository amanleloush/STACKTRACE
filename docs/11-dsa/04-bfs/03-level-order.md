# 03 — Tree Level-Order Traversal

> BFS • Position 3/5

## Problem
Given the root of a binary tree, return a list of lists where the *i*-th list contains all node values at depth *i*.

## Intuition
A tree is a graph with no cycles, so BFS doesn't even need a visited set — each node has exactly one path from the root. The standard trick to separate levels is to snapshot the queue size **at the start of each iteration** and dequeue exactly that many nodes — those are the current level. Append them to a sub-list, then push their children. After the inner loop completes, the sub-list is a full level.

## Algorithm
1. If `root` is null, return `[]`.
2. Initialize `q = [root]` and `result = []`.
3. While `q` is non-empty:
   - Snapshot `level_size = len(q)`.
   - For `i` in `range(level_size)`: pop a node, append its value to the current level, push its non-null children.
   - Append the current level to `result`.

```python
from collections import deque

def level_order(root):
    if not root:
        return []
    result = []
    q = deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        result.append(level)
    return result
```

## Walkthrough
Tree (root `1`, with children `2, 3` and grandchildren `4, 5, 6, 7`):

```
        1
       / \
      2   3
     / \ / \
    4  5 6  7
```

1. **Init.** `queue = [1]`, `out = []`.
2. **Level 0.** Snapshot size = 1. Pop `1`, push children `[2, 3]`. Level complete: `[1]`.
3. **Level 1.** Snapshot size = 2. Pop `2`, push `[4, 5]`. Pop `3`, push `[6, 7]`. Level complete: `[2, 3]`.
4. **Level 2.** Snapshot size = 4. Pop `4, 5, 6, 7` — none have children. Level complete: `[4, 5, 6, 7]`.
5. Queue empty → done. Output: `[[1], [2, 3], [4, 5, 6, 7]]`.

<div class="dsa-viz" data-algo="level-order"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(w)</strong></span>
</div>

`w` is the maximum tree width (up to `n/2` for a complete tree).

## Pitfalls
- **Snapshot `len(q)` before the inner loop** — if you use `for _ in q`, Python iterates as you mutate. Save the size first.
- **Forgetting to check null children** — `if node.left` and `if node.right` are mandatory.
- For **N-ary trees**, iterate over `node.children` instead of `left`/`right`.
- **Reverse level order** (LC 107) — collect levels then `result[::-1]`, or use `collections.deque.appendleft`.
- **Right-side view** (LC 199) — same template, but append only the last element of each level.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/binary-tree-level-order-traversal/">102. Binary Tree Level Order Traversal (Medium)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-level-order-traversal-ii/">107. Level Order II (Medium)</a> — same, reversed.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-right-side-view/">199. Right Side View (Medium)</a> — last node per level.</li>
    <li><a href="https://leetcode.com/problems/find-largest-value-in-each-tree-row/">515. Largest Value in Each Tree Row (Medium)</a> — max per level.</li>
    <li><a href="https://leetcode.com/problems/average-of-levels-in-binary-tree/">637. Average of Levels (Easy)</a> — mean per level.</li>
    <li><a href="https://leetcode.com/problems/populating-next-right-pointers-in-each-node/">116. Populating Next Right Pointers (Medium)</a> — link nodes within a level.</li>
    <li><a href="https://leetcode.com/problems/populating-next-right-pointers-in-each-node-ii/">117. Populating Next Right Pointers II (Medium)</a> — non-perfect tree variant.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-vertical-order-traversal/">314. Vertical Order Traversal (Medium)</a> — BFS with column index.</li>
    <li><a href="https://leetcode.com/problems/vertical-order-traversal-of-a-binary-tree/">987. Vertical Order Traversal II (Hard)</a> — same, tie-break by value.</li>
    <li><a href="https://leetcode.com/problems/cousins-in-binary-tree/">993. Cousins in Binary Tree (Easy)</a> — BFS with parent tracking.</li>
  </ul>
</div>
