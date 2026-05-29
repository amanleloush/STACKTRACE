# 03 — Merge Two Sorted Lists

> Linked List • Position 3/5

## Problem
Given two sorted linked lists, splice them into a single sorted list and return its head.

## Intuition
Walk two pointers down the input lists; on each step append whichever has the smaller head to the output and advance that pointer. **Invariant**: the output is a sorted list whose elements are exactly the consumed prefix of both inputs. When one list is exhausted, the rest of the other is already sorted and can be linked in O(1) — no copying. A **dummy head** lets you avoid special-casing the first append.

## Algorithm
Two-pointer merge into a dummy-headed list.

```python
def merge_two(l1, l2):
    dummy = ListNode(0)
    tail = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next = l1
            l1 = l1.next
        else:
            tail.next = l2
            l2 = l2.next
        tail = tail.next
    tail.next = l1 or l2                 # tail link
    return dummy.next
```

## Walkthrough
The widget merges `a = 1 → 4 → 5 → 8` and `b = 2 → 3 → 6 → 7`:

1. **Start.** Both pointers at head. Compare `1 ≤ 2` → thread `a`'s 1 onto the merged tail → `merged = 1`. Advance `a → 4`.
2. **`b` runs cheap.** `4 > 2` → take `b`'s 2 → `merged = 1 → 2`; advance `b → 3`. Next compare `4 > 3` → take `b`'s 3 → `merged = 1 → 2 → 3`; advance `b → 6`.
3. **`a` catches up.** Now `4 ≤ 6` → take `a`'s 4 → `merged = 1 → 2 → 3 → 4`. Then `5 ≤ 6` → take `a`'s 5 → `merged = 1 → 2 → 3 → 4 → 5`.
4. **`b` finishes its middle.** `8 > 6` and `8 > 7` send both of `b`'s remaining nodes onto the tail → `merged = 1 → 2 → 3 → 4 → 5 → 6 → 7`. Now `b` is exhausted.
5. **End — leftover splice.** With `b` empty, the leftover branch appends `a`'s remaining `8` in O(1) → final `1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`.

<div class="dsa-viz" data-algo="merge-two-sorted-ll"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n + m)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Forgetting the dummy head — your first `if` has to special-case "is this the very first node" and the code doubles in size.
- Using `<` instead of `<=` is correct for ordering but breaks stability across the two inputs (rare to matter).
- Forgetting the tail link `tail.next = l1 or l2` leaves the merged list short.
- Returning `dummy` instead of `dummy.next` returns a leading zero.
- For k sorted lists, generalize with a min-heap of `(value, list_id, node)` — see LC 23 Merge k Sorted Lists.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/merge-two-sorted-lists/">Merge Two Sorted Lists (Easy)</a> — the canonical version.</li>
    <li><a href="https://leetcode.com/problems/merge-k-sorted-lists/">Merge k Sorted Lists (Hard)</a> — heap-based k-way merge.</li>
    <li><a href="https://leetcode.com/problems/sort-list/">Sort List (Med)</a> — merge sort = repeated merge.</li>
    <li><a href="https://leetcode.com/problems/merge-sorted-array/">Merge Sorted Array (Easy)</a> — array version, merge from the back.</li>
    <li><a href="https://leetcode.com/problems/partition-list/">Partition List (Med)</a> — two dummy heads, then concatenate.</li>
    <li><a href="https://leetcode.com/problems/merge-in-between-linked-lists/">Merge In Between Linked Lists (Med)</a> — splice one list into another.</li>
    <li><a href="https://leetcode.com/problems/convert-binary-number-in-a-linked-list-to-integer/">Convert Binary Number in a Linked List to Integer (Easy)</a> — single traversal.</li>
    <li><a href="https://leetcode.com/problems/next-greater-node-in-linked-list/">Next Greater Node In Linked List (Med)</a> — monotonic stack on a list.</li>
    <li><a href="https://leetcode.com/problems/odd-even-linked-list/">Odd Even Linked List (Med)</a> — two dummy heads, interleave.</li>
    <li><a href="https://leetcode.com/problems/swapping-nodes-in-a-linked-list/">Swapping Nodes in a Linked List (Med)</a> — two-pointer offset.</li>
  </ul>
</div>
