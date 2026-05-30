# 01 — Reverse Linked List

> Linked List • Position 1/5

## Problem
Reverse a singly-linked list and return the new head.

## Intuition
Walk the list with three pointers — `prev` (last visited), `cur` (current), `next` (lookahead). At every step you save `cur.next`, point `cur.next` back to `prev`, then advance both pointers one step. **Invariant**: at the start of each iteration, the prefix from `prev` back to the original tail is already reversed, and `cur` is the head of the remaining unreversed suffix. When `cur` becomes `None`, `prev` is the new head.

## Algorithm
Iterative three-pointer flip.

```python
def reverse_list(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next                   # save
        cur.next = prev                  # flip
        prev = cur                       # advance prev
        cur = nxt                        # advance cur
    return prev                          # new head
```

Recursive variant (O(n) stack):

```python
def reverse_list(head):
    if not head or not head.next: return head
    new_head = reverse_list(head.next)
    head.next.next = head
    head.next = None
    return new_head
```

## Walkthrough
Reverse `1 → 2 → 3 → 4 → 5 → None`.

1. `prev = None`, `cur = 1`. Save `nxt = 2`. Flip `1.next = None`. Advance: `prev = 1`, `cur = 2`.
2. Save `nxt = 3`. Flip `2.next = 1`. Advance: `prev = 2`, `cur = 3`. List from `prev`: `2 → 1 → None`.
3. Save `nxt = 4`. Flip `3.next = 2`. Advance: `prev = 3`, `cur = 4`.
4. Save `nxt = 5`. Flip `4.next = 3`. Advance: `prev = 4`, `cur = 5`.
5. Save `nxt = None`. Flip `5.next = 4`. Advance: `prev = 5`, `cur = None`. Loop exits, return `5`. Final list: `5 → 4 → 3 → 2 → 1 → None`.

<div class="dsa-viz" data-algo="reverse-linked-list"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Forgetting to save `cur.next` before mutating — you lose the rest of the list.
- Returning `head` instead of `prev` — `head` is now the new tail, not the new head.
- Recursive version blows the stack on long lists; prefer iterative.
- For partial reversal (LC 92, 25), introduce a dummy head and reverse a sublist, then stitch it back — don't try to handle head edges in the loop.
- The same three-pointer pattern reverses doubly-linked lists too; just swap `prev` and `next` fields on every node.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/reverse-linked-list/">Reverse Linked List (Easy)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/reverse-linked-list-ii/">Reverse Linked List II (Med)</a> — reverse positions m..n with a dummy head.</li>
    <li><a href="https://leetcode.com/problems/reverse-nodes-in-k-group/">Reverse Nodes in K-Group (Hard)</a> — chained partial reversals.</li>
    <li><a href="https://leetcode.com/problems/swap-nodes-in-pairs/">Swap Nodes in Pairs (Med)</a> — reverse in groups of 2.</li>
    <li><a href="https://leetcode.com/problems/palindrome-linked-list/">Palindrome Linked List (Easy)</a> — reverse second half, compare.</li>
    <li><a href="https://leetcode.com/problems/reorder-list/">Reorder List (Med)</a> — split, reverse second half, weave.</li>
    <li><a href="https://leetcode.com/problems/rotate-list/">Rotate List (Med)</a> — find tail, close ring, break at offset.</li>
    <li><a href="https://leetcode.com/problems/partition-list/">Partition List (Med)</a> — two dummy heads, then concatenate.</li>
    <li><a href="https://leetcode.com/problems/odd-even-linked-list/">Odd Even Linked List (Med)</a> — interleave with two dummy heads.</li>
    <li><a href="https://leetcode.com/problems/reverse-nodes-in-even-length-groups/">Reverse Nodes in Even Length Groups (Med)</a> — conditional group reversal.</li>
  </ul>
</div>
