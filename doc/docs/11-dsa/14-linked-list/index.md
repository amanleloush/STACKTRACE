---
title: Linked List
---

# DSA · 14 · Linked List

> Reverse, cycle, merge, LRU cache — pointer surgery patterns.

## When to use this pattern
- The problem statement literally hands you a `ListNode head` — most LC linked-list tags.
- You need to detect a cycle, find its entry, or measure list length without extra memory.
- Two lists must be merged or intersected without converting to arrays.
- You need O(1) insert/delete given a node reference (LRU/LFU caches).
- A position is described relative to the end ("Nth from end", "middle") — two-pointer or fast/slow wins.

## The shape of the solution
Almost every linked-list problem is one of three pointer tricks. **Dummy head** — allocate a placeholder before the real head so you don't special-case the first node. **Fast/slow pointers** — fast moves two steps for every one of slow; they detect cycles, find the middle, and locate the N-th-from-end node in one pass. **Three-pointer reverse** — `prev`, `cur`, `next` walk the list flipping arrows. Combined with a hash map (node → DLL node) you get the constant-time LRU cache. The discipline is to draw the arrows on paper before you write code — pointer bugs are silent and brutal.

## Topics in this section
<div class="topic-grid">
  <a class="topic-card" href="01-reverse/"><span class="topic-card__num">01</span><h3>Reverse linked list</h3><p>Flip arrows in place with three pointers — the foundational operation.</p></a>
  <a class="topic-card" href="02-cycle-floyd/"><span class="topic-card__num">02</span><h3>Cycle detection (Floyd)</h3><p>Tortoise and hare — detect, then locate the entry node in O(1) extra space.</p></a>
  <a class="topic-card" href="03-merge-two-sorted/"><span class="topic-card__num">03</span><h3>Merge two sorted lists</h3><p>Dummy head + two pointers stitch two sorted lists in one pass.</p></a>
  <a class="topic-card" href="04-remove-nth-end/"><span class="topic-card__num">04</span><h3>Remove Nth from end</h3><p>Two pointers offset by N find the predecessor in a single pass.</p></a>
  <a class="topic-card" href="05-lru-cache/"><span class="topic-card__num">05</span><h3>LRU Cache</h3><p>HashMap + doubly-linked list — O(1) get and put with eviction.</p></a>
</div>

## Common variations
**Doubly-linked lists** add `prev` pointers — a few problems (LRU, design problems) genuinely need them. **Circular lists** show up in Josephus and round-robin schedulers. **Random pointers** (LC 138) test deep-copy with mapping tables. **Skip lists** appear in some design problems but aren't typical interview fare. The same pointer-surgery skills generalize to trees — many tree problems are easier once you think of them as linked lists with two children.
