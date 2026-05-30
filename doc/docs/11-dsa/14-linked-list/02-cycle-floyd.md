# 02 — Cycle Detection (Floyd)

> Linked List • Position 2/5

## Problem
Determine whether a linked list has a cycle, and if so, return the node where the cycle begins.

## Intuition
Send two pointers down the list — `slow` advances one step, `fast` advances two. If there's no cycle, `fast` falls off the end (`None`). If there *is* a cycle, the fast pointer eventually laps the slow one and they meet inside the loop. **Invariant**: every step, the gap `(fast − slow) mod cycle_length` decreases by 1, so within at most `cycle_length` extra iterations after both enter the loop they collide. To find the **start** of the cycle, reset one pointer to head and advance both one step at a time — they meet at the entry point (provable from arithmetic on `2 · slow_distance = fast_distance`).

## Algorithm
Two-phase Floyd's tortoise and hare.

```python
def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            break
    else:
        return None                      # no cycle

    slow = head
    while slow is not fast:              # phase 2: find entry
        slow = slow.next
        fast = fast.next
    return slow
```

## Walkthrough
List `3 → 2 → 0 → -4 → (back to 2)` — cycle entry at node `2`.

1. `slow = 3`, `fast = 3`. Step: `slow = 2`, `fast = 0`.
2. Step: `slow = 0`, `fast = 2` (jumped through `-4` and looped). Not equal.
3. Step: `slow = -4`, `fast = -4`. Equal — cycle confirmed.
4. Phase 2: reset `slow = 3` (head). Step both: `slow = 2`, `fast = 2`. Equal.
5. Return `2` — the cycle entry node.

<div class="dsa-viz" data-algo="floyd-cycle"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- The loop condition `while fast and fast.next` — if you only check `fast`, you'll crash on `fast.next.next`.
- Starting `slow` and `fast` at different nodes breaks the math; start them both at `head`.
- Hash-set solution is O(n) space — the whole point of Floyd is O(1) space. Mention both in interviews.
- Phase 2 needs `is`, not `==` — you're comparing node identity, not values (though for LC it usually works either way because node values can repeat).
- The same trick finds duplicates in an array treated as a function (LC 287) — `nums[i]` becomes the "next pointer".

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/linked-list-cycle/">Linked List Cycle (Easy)</a> — detection only.</li>
    <li><a href="https://leetcode.com/problems/linked-list-cycle-ii/">Linked List Cycle II (Med)</a> — return cycle entry.</li>
    <li><a href="https://leetcode.com/problems/find-the-duplicate-number/">Find the Duplicate Number (Med)</a> — Floyd on an implicit function.</li>
    <li><a href="https://leetcode.com/problems/happy-number/">Happy Number (Easy)</a> — Floyd on digit-square sequence.</li>
    <li><a href="https://leetcode.com/problems/circular-array-loop/">Circular Array Loop (Med)</a> — Floyd with direction constraint.</li>
    <li><a href="https://leetcode.com/problems/palindrome-linked-list/">Palindrome Linked List (Easy)</a> — fast/slow finds middle.</li>
    <li><a href="https://leetcode.com/problems/middle-of-the-linked-list/">Middle of the Linked List (Easy)</a> — pure fast/slow.</li>
    <li><a href="https://leetcode.com/problems/remove-nth-node-from-end-of-list/">Remove Nth Node From End of List (Med)</a> — two-pointer offset.</li>
    <li><a href="https://leetcode.com/problems/intersection-of-two-linked-lists/">Intersection of Two Linked Lists (Easy)</a> — pointer aliasing.</li>
    <li><a href="https://leetcode.com/problems/reorder-list/">Reorder List (Med)</a> — middle + reverse + merge.</li>
  </ul>
</div>
