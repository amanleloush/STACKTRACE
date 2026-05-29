# 04 — Path Sum (root-to-leaf)

> DFS • Position 4/5

## Problem
Given a binary tree and a target sum, return `True` if some root-to-leaf path's values add up to the target.

## Intuition
DFS the tree, **carrying the remaining target down**. When you reach a leaf, the path matches iff the leaf's value equals what's left of the target. The **invariant** is that at any call, `remaining` equals `target − sum(values on the current recursion stack above this node)`. No global state, no backtracking bookkeeping — just a parameter that shrinks.

## Algorithm
At each node, check if it's a leaf and matches; otherwise recurse with the reduced target into whichever children exist.

```python
def hasPathSum(root, target):
    if not root: return False
    if not root.left and not root.right:
        return root.val == target
    remaining = target - root.val
    return (hasPathSum(root.left, remaining)
            or hasPathSum(root.right, remaining))
```

For "collect all paths" variants, pass a `path` list and `append` on the way down, `pop` on the way up — classic backtracking.

## Walkthrough
Tree `5 → (4, 8)`, `4 → (11)`, `11 → (7, 2)`, `8 → (13, 4)`, `4 → (1)`. Target = `22`.

1. **Start at `5`** with `rem = 22`. Descend left into `4`: `rem = 22 - 5 = 17`.
2. At `4`, descend into `11`: `rem = 17 - 4 = 13`. At `11`, descend left into `7`: `rem = 13 - 11 = 2`.
3. **Leaf `7`** — val `7 ≠ rem 2`, backtrack to `11`.
4. From `11`, descend right into `2`: `rem = 2`. **Leaf `2`** — val `2 == rem 2` → **FOUND**.
5. The recursion unwinds returning `True`. Path: `5 → 4 → 11 → 2` summing to `22`.

<div class="dsa-viz" data-algo="path-sum"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(h)</strong> stack, h = tree height</span>
</div>

## Pitfalls
- Treating a node with one child as a leaf — only nodes with **both** children null are leaves.
- Returning `True` at the root when the *cumulative* sum reaches target but you're not yet at a leaf.
- For "Path Sum III" (any node to any descendant), forgetting prefix-sum + hashmap trick — naive O(n²) often TLEs.
- Mutating a shared path list and forgetting the `pop` after recursion — paths bleed into siblings.
- Integer overflow when sums get large (not Python, but bites in Java/C++).

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/path-sum/">112. Path Sum (Easy)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/path-sum-ii/">113. Path Sum II (Medium)</a> — return all matching paths.</li>
    <li><a href="https://leetcode.com/problems/path-sum-iii/">437. Path Sum III (Medium)</a> — any-to-any with prefix-sum hashmap.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-maximum-path-sum/">124. Binary Tree Maximum Path Sum (Hard)</a> — postorder, return one-side max.</li>
    <li><a href="https://leetcode.com/problems/sum-root-to-leaf-numbers/">129. Sum Root to Leaf Numbers (Medium)</a> — carry digits as you descend.</li>
    <li><a href="https://leetcode.com/problems/binary-tree-paths/">257. Binary Tree Paths (Easy)</a> — all root-to-leaf strings.</li>
    <li><a href="https://leetcode.com/problems/path-sum-iv/">666. Path Sum IV (Medium)</a> — implicit tree encoded in integers.</li>
    <li><a href="https://leetcode.com/problems/smallest-string-starting-from-leaf/">988. Smallest String Starting From Leaf (Medium)</a> — DFS + lexicographic compare.</li>
    <li><a href="https://leetcode.com/problems/pseudo-palindromic-paths-in-a-binary-tree/">1457. Pseudo-Palindromic Paths in a Binary Tree (Medium)</a> — DFS with bitmask parity.</li>
    <li><a href="https://leetcode.com/problems/time-needed-to-inform-all-employees/">1376. Time Needed to Inform All Employees (Medium)</a> — root-to-leaf with weighted edges.</li>
  </ul>
</div>
