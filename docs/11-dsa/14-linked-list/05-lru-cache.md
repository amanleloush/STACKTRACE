# 05 — LRU Cache

> Linked List • Position 5/5

## Problem
Design a cache supporting `get(key)` and `put(key, value)` in O(1), evicting the least-recently-used entry when capacity is exceeded.

## Intuition
You need two things in O(1): **lookup by key** (hash map) and **ordering by recency with constant-time removal from the middle** (doubly-linked list). Keep a hash map `key → DLL node`. The DLL has a dummy head and dummy tail; the node next to head is most-recently-used, the node before tail is least-recently-used. **Invariant**: every key in the map points to a node currently in the DLL, and DLL order is exactly recency order from MRU (front) to LRU (back). Every operation touches one map slot and at most two DLL pointer flips.

## Algorithm
HashMap + doubly-linked list with sentinel head/tail.

```python
class Node:
    __slots__ = ("k", "v", "prev", "nxt")
    def __init__(self, k, v):
        self.k, self.v = k, v
        self.prev = self.nxt = None

class LRUCache:
    def __init__(self, cap):
        self.cap = cap
        self.m = {}
        self.head = Node(0, 0)           # sentinels
        self.tail = Node(0, 0)
        self.head.nxt = self.tail
        self.tail.prev = self.head

    def _remove(self, n):
        n.prev.nxt, n.nxt.prev = n.nxt, n.prev

    def _add_front(self, n):
        n.prev = self.head
        n.nxt = self.head.nxt
        self.head.nxt.prev = n
        self.head.nxt = n

    def get(self, k):
        if k not in self.m: return -1
        n = self.m[k]
        self._remove(n); self._add_front(n)
        return n.v

    def put(self, k, v):
        if k in self.m:
            n = self.m[k]; n.v = v
            self._remove(n); self._add_front(n)
            return
        if len(self.m) == self.cap:
            lru = self.tail.prev
            self._remove(lru); del self.m[lru.k]
        n = Node(k, v); self.m[k] = n; self._add_front(n)
```

## Walkthrough
The widget runs 8 operations on a cache with `cap = 2`: `put(1,1) · put(2,2) · get(1) · put(3,3) · get(2) · put(4,4) · get(1) · get(3)`.

1. **Fill the cache.** `put(1,1)` then `put(2,2)` insert at head. DLL becomes `head → (2=2) → (1=1) → tail`. Most-recent on the left, LRU on the right.
2. **`get(1)` is a hit.** Move node `1` to head → `(1=1) → (2=2)`. Readout shows `returned: 1`. The whole point of LRU: a touched key is no longer near eviction.
3. **`put(3,3)` triggers eviction.** Insert `(3=3)` at head, size jumps to 3 > cap → pop tail. The tail is `(2=2)` because we just demoted it in step 2 → evict it. DLL = `(3=3) → (1=1)`.
4. **`get(2)` misses.** Not in the DLL anymore → `returned: -1`. `put(4,4)` then inserts at head and evicts the new tail `(1=1)` → DLL = `(4=4) → (3=3)`.
5. **End — `get(1)` misses, `get(3)` hits.** `get(1)` returns `-1`. `get(3)` finds the node, moves it to head → final DLL `(3=3) → (4=4)`. Every operation touched one map entry and a constant number of DLL pointers.

<div class="dsa-viz" data-algo="lru-cache"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(1) per op</strong></span>
  <span>space <strong>O(capacity)</strong></span>
</div>

## Pitfalls
- Skipping sentinel head/tail — every insertion/deletion then has to handle "is this the only node" / "is this the head/tail" edge cases.
- Forgetting to update the map on eviction — you leak a key pointing to a freed node.
- Updating the value but forgetting to move the node to front on `put` of an existing key — the LRU order goes stale.
- In Java/Python, `LinkedHashMap` / `OrderedDict` gives this almost for free; interviewers usually want you to implement the DLL by hand.
- LFU (LC 460) generalizes the same idea with a frequency dimension — a `freq → DLL` map plus the key map.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/lru-cache/">LRU Cache (Med)</a> — canonical.</li>
    <li><a href="https://leetcode.com/problems/lfu-cache/">LFU Cache (Hard)</a> — LRU + frequency dimension.</li>
    <li><a href="https://leetcode.com/problems/all-oone-data-structure/">All O`one Data Structure (Hard)</a> — DLL of buckets by count.</li>
    <li><a href="https://leetcode.com/problems/design-front-middle-back-queue/">Design Front Middle Back Queue (Med)</a> — two deques.</li>
    <li><a href="https://leetcode.com/problems/design-skiplist/">Design Skiplist (Hard)</a> — probabilistic ordered map.</li>
    <li><a href="https://leetcode.com/problems/design-hashset/">Design HashSet (Easy)</a> — bucket array of lists.</li>
    <li><a href="https://leetcode.com/problems/design-hashmap/">Design HashMap (Easy)</a> — bucket array with key/value pairs.</li>
    <li><a href="https://leetcode.com/problems/insert-delete-getrandom-o1/">Insert Delete GetRandom O(1) (Med)</a> — array + index map.</li>
    <li><a href="https://leetcode.com/problems/insert-delete-getrandom-o1-duplicates-allowed/">Insert Delete GetRandom O(1) Duplicates allowed (Hard)</a> — set of indices per value.</li>
    <li><a href="https://leetcode.com/problems/design-underground-system/">Design Underground System (Med)</a> — two hash maps.</li>
  </ul>
</div>
