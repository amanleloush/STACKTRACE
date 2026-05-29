# 04 — Remove Nth From End

> Linked List • Position 4/5

## Problem
Remove the N-th node from the end of a singly-linked list in one pass.

## Intuition
You can't index from the end without first knowing the length — *unless* you maintain a constant gap. Send `fast` N steps ahead, then advance both `fast` and `slow` until `fast` reaches the tail; at that point `slow` is sitting on the predecessor of the node to remove. **Invariant**: `fast` is always exactly N nodes ahead of `slow`. Combine with a **dummy head** so removing the actual head node (N == length) is the same code path as removing any other.

## Algorithm
Two pointers with an N-step offset and a dummy head.

```python
def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):                   # advance fast n steps
        fast = fast.next
    while fast.next:                     # both move until fast at tail
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next           # skip the target
    return dummy.next
```

## Walkthrough
The widget runs on `• → 1 → 2 → 3 → 4 → 5` (`•` is the dummy) with `n = 2`:

1. **Start.** Both `slow` and `fast` sit on the dummy node `•`. The dummy lets the head-removal case share one code path with the rest.
2. **Advance `fast` n+1 = 3 steps.** Each step: `fast → 1`, `fast → 2`, `fast → 3`. Now the gap from `slow` (still at dummy) to `fast` is exactly 3.
3. **Walk both until `fast` walks off the end.** `slow → 1, fast → 4`. `slow → 2, fast → 5`. `slow → 3, fast → null`. The loop exits because `fast` has run past the tail.
4. **`slow.next` is the target.** With `slow` on value `3`, its `next` pointer holds value `4` — the 2nd node from the end — which is exactly what we splice out.
5. **End.** Delete `slow.next` (value 4) in O(1) by rewiring `slow.next = slow.next.next`. Final list: `• → 1 → 2 → 3 → 5` (return `dummy.next`).

<div class="dsa-viz" data-algo="remove-nth-end"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- No dummy head → removing the first node (when N == length) is a special case that's easy to get wrong.
- Off-by-one on the offset — advancing `fast` `N` steps from `dummy` makes the gap `N`, which is what you want; advancing from `head` makes the gap `N − 1`.
- Loop condition `while fast.next` vs `while fast` — the first one stops with `fast` at the tail (so `slow` is at the predecessor); the second stops with `fast = None` (so `slow` is at the target). Pick one consistent variant.
- Failing to free the removed node is harmless in Python; in C/C++ that's a leak.
- The same offset trick gives you "find the middle" (gap = `n/2`) and "find Kth from end" (gap = K).

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/remove-nth-node-from-end-of-list/">Remove Nth Node From End of List (Med)</a> — canonical.</li>
    <li><a href="https://leetcode.com/problems/middle-of-the-linked-list/">Middle of the Linked List (Easy)</a> — fast/slow with a 1-step gap doubled.</li>
    <li><a href="https://leetcode.com/problems/palindrome-linked-list/">Palindrome Linked List (Easy)</a> — find middle, reverse, compare.</li>
    <li><a href="https://leetcode.com/problems/reorder-list/">Reorder List (Med)</a> — middle + reverse + weave.</li>
    <li><a href="https://leetcode.com/problems/rotate-list/">Rotate List (Med)</a> — find tail, count length, break at offset.</li>
    <li><a href="https://leetcode.com/problems/partition-list/">Partition List (Med)</a> — two dummy heads.</li>
    <li><a href="https://leetcode.com/problems/reverse-linked-list-ii/">Reverse Linked List II (Med)</a> — locate two boundaries, reverse between.</li>
    <li><a href="https://leetcode.com/problems/swapping-nodes-in-a-linked-list/">Swapping Nodes in a Linked List (Med)</a> — two pointers, swap values.</li>
    <li><a href="https://leetcode.com/problems/delete-the-middle-node-of-a-linked-list/">Delete the Middle Node (Med)</a> — fast/slow + predecessor.</li>
    <li><a href="https://leetcode.com/problems/swap-nodes-in-pairs/">Swap Nodes in Pairs (Med)</a> — pointer surgery in pairs.</li>
  </ul>
</div>
