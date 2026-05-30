# 03 — Tree traversals (pre / in / post)

> DFS • Position 3/5

## Problem
Visit every node of a binary tree exactly once, in one of three canonical orders.

## Intuition
The three orders differ only in **when you "visit" the node** relative to its children. **Preorder** visits *before* recursing — you see a node before its subtree, perfect for serialization. **Inorder** visits *between* left and right — on a BST it yields sorted output. **Postorder** visits *after* both children return — perfect for any "combine the answers from below" computation (heights, sums, diameters).

## Algorithm
Three nearly identical functions; the only thing that moves is the `visit(node)` line.

```python
def preorder(node, out):
    if not node: return
    out.append(node.val)         # visit
    preorder(node.left, out)
    preorder(node.right, out)

def inorder(node, out):
    if not node: return
    inorder(node.left, out)
    out.append(node.val)         # visit
    inorder(node.right, out)

def postorder(node, out):
    if not node: return
    postorder(node.left, out)
    postorder(node.right, out)
    out.append(node.val)         # visit
```

## Walkthrough
The viz uses a 7-node tree (root `1`, children `2, 3`, grandchildren `4, 5, 6, 7`) and an `order` input that toggles `pre` / `in` / `post`. Default is **inorder**:

1. **Start at root `1`.** Inorder rule: descend left first. Push frames `1 → 2 → 4` until `4` is a leaf.
2. **Visit `4`**, then return to `2` and **visit `2`** (between L and R). Descend right into `5`, **visit `5`**, return.
3. Pop back to `1` and **visit `1`**. Descend right into `3`.
4. From `3`, descend left into `6`, **visit `6`**, return, **visit `3`**, descend right, **visit `7`**.
5. **End.** Inorder output: `4 → 2 → 5 → 1 → 6 → 3 → 7`. Switch the input to `pre` to get `1, 2, 4, 5, 3, 6, 7` or `post` to get `4, 5, 2, 6, 7, 3, 1`.

<div class="dsa-viz" data-algo="tree-traversals"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(h)</strong> stack, h = tree height</span>
</div>

## Pitfalls
- Confusing preorder with BFS — preorder is depth-first, BFS is level-by-level.
- Assuming inorder gives sorted output on any tree — only on a **BST**.
- Hitting recursion limits on a skewed tree of 10⁵ nodes — Python default stack is 1000.
- Mutating the output list in place when the recursion expects a fresh list per call.
- Writing an iterative version with one stack but forgetting that postorder needs a "visited" marker or two stacks.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/binary-tree-preorder-traversal/">144. Binary Tree Preorder Traversal (Easy)</a> — recursive and iterative.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-inorder-traversal/">94. Binary Tree Inorder Traversal (Easy)</a> — Morris traversal for O(1) space.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-postorder-traversal/">145. Binary Tree Postorder Traversal (Easy)</a> — trickiest iteratively.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-level-order-traversal/">102. Binary Tree Level Order Traversal (Medium)</a> — BFS variant for contrast.</li>
    <li><a href="https://leetcode.com/problems/n-ary-tree-preorder-traversal/">589. N-ary Tree Preorder Traversal (Easy)</a> — same idea, more children.</li>
    <li><a href="https://leetcode.com/problems/n-ary-tree-postorder-traversal/">590. N-ary Tree Postorder Traversal (Easy)</a> — combine after all kids.</li>
    <li><a href="https://leetcode.com/problems/same-tree/">100. Same Tree (Easy)</a> — preorder structural compare.</li>
    <li><a href="https://leetcode.com/problems/symmetric-tree/">101. Symmetric Tree (Easy)</a> — mirrored DFS.</li>
    <li><a href="https://leetcode.com/problems/invert-binary-tree/">226. Invert Binary Tree (Easy)</a> — swap children, recurse.</li>
    <li><a href="https://leetcode.com/problems/diameter-of-binary-tree/">543. Diameter of Binary Tree (Easy)</a> — postorder height + global max.</li>
  </ul>
</div>
