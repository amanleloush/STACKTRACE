# 03 — Remove duplicates from sorted array

> Two Pointers • 3/6

## Problem
Given a sorted array, remove duplicates **in place** so each element appears once. Return the new length `k`; the first `k` slots should hold the unique values. O(1) extra space.

## Intuition
Because the array is sorted, all duplicates of a value sit next to each other. Use a **slow/fast** pair: `slow` is the write head pointing at the next slot to fill; `fast` scans forward. Whenever `arr[fast]` is *new* (differs from `arr[slow]`), bump `slow` and copy. The invariant is that `arr[0..slow]` is the deduped prefix at all times — and because `slow <= fast`, the write never overwrites unread data.

## Algorithm
1. If the array is empty, return 0.
2. Set `slow = 0`. For `fast = 1 .. n-1`:
   - If `arr[fast] != arr[slow]`, increment `slow`, then `arr[slow] = arr[fast]`.
3. Return `slow + 1`.

```python
def remove_duplicates(arr):
    if not arr:
        return 0
    slow = 0
    for fast in range(1, len(arr)):
        if arr[fast] != arr[slow]:
            slow += 1
            arr[slow] = arr[fast]
    return slow + 1
```

## Walkthrough
On `[1, 1, 2, 2, 3, 4, 4]`:

- Step 1 — `slow=0, fast=1`: `arr[1]=1 == arr[0]=1`, skip.
- Step 2 — `slow=0, fast=2`: `arr[2]=2 != 1`, advance → `slow=1`, write `arr[1]=2` → `[1, 2, 2, 2, 3, 4, 4]`.
- Step 3 — `slow=1, fast=3`: `arr[3]=2 == arr[1]=2`, skip.
- Step 4 — `slow=1, fast=4`: `3 != 2`, advance → `slow=2`, write `arr[2]=3` → `[1, 2, 3, 2, 3, 4, 4]`.
- Step 5 — `slow=2, fast=5`: `4 != 3`, advance → `slow=3`, write `arr[3]=4` → `[1, 2, 3, 4, 3, 4, 4]`.

Final unique prefix length is `4`; the tail past `slow` is leftover garbage you ignore.

<div class="dsa-viz" data-algo="remove-duplicates"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Returning the **modified array** when the problem expects the **length** — LeetCode 26 wants `k`.
- Comparing `arr[fast] != arr[fast - 1]` works only because the array is sorted; on unsorted input you'd need a hash set.
- For "at most twice" (LC 80), keep a counter or compare `arr[fast]` against `arr[slow - 1]` — the same template with a wider window.
- "Move zeros to the end" looks different but is the same slow/fast pattern with a different predicate.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/remove-duplicates-from-sorted-array/">26. Remove Duplicates from Sorted Array (Easy)</a> — the canonical problem.</li>
    <li><a href="https://leetcode.com/problems/remove-element/">27. Remove Element (Easy)</a> — slow/fast with a "skip this value" predicate.</li>
    <li><a href="https://leetcode.com/problems/move-zeroes/">283. Move Zeroes (Easy)</a> — same idea; non-zeros get written forward.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-parity/">905. Sort Array By Parity (Easy)</a> — partition evens left, odds right.</li>
    <li><a href="https://leetcode.com/problems/duplicate-zeros/">1089. Duplicate Zeros (Easy)</a> — count, then write from the tail to avoid overwriting.</li>
    <li><a href="https://leetcode.com/problems/sort-array-by-parity-ii/">922. Sort Array By Parity II (Easy)</a> — two write pointers, one for evens and one for odds.</li>
    <li><a href="https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/">80. Remove Duplicates from Sorted Array II (Medium)</a> — allow at most two of each.</li>
    <li><a href="https://leetcode.com/problems/merge-sorted-array/">88. Merge Sorted Array (Easy)</a> — slow/fast from the tail.</li>
    <li><a href="https://leetcode.com/problems/string-compression/">443. String Compression (Medium)</a> — run-length encode in place with a write head.</li>
    <li><a href="https://leetcode.com/problems/sort-colors/">75. Sort Colors / Dutch National Flag (Medium)</a> — three-way partition with `low`, `mid`, `high`.</li>
  </ul>
</div>
