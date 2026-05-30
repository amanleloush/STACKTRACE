# 01 — Reverse array in place

> Two Pointers • 1/6

## Problem
Given an array, reverse it in place using O(1) extra space.

## Intuition
The element at index `i` ultimately belongs at index `n - 1 - i`. Pair them up: swap `(0, n-1)`, then `(1, n-2)`, and so on, until the two indices meet in the middle. Each swap fixes two positions, so the loop runs exactly `n/2` times. The invariant is that everything outside `[l, r]` is already reversed; everything inside is untouched original order.

## Algorithm
1. Start `l = 0`, `r = n - 1`.
2. While `l < r`: swap `arr[l]` and `arr[r]`, then `l++`, `r--`.
3. Stop when the pointers meet or cross.

```python
def reverse(arr):
    l, r = 0, len(arr) - 1
    while l < r:
        arr[l], arr[r] = arr[r], arr[l]
        l += 1
        r -= 1
    return arr
```

## Walkthrough
On `[1, 2, 3, 4, 5]`:

- Step 1 — `l=0, r=4`: swap `1` and `5` → `[5, 2, 3, 4, 1]`.
- Step 2 — `l=1, r=3`: swap `2` and `4` → `[5, 4, 3, 2, 1]`.
- Step 3 — `l=2, r=2`: pointers meet, loop exits; middle element stays in place.

For even-length arrays `[1, 2, 3, 4]`, the loop ends with `l=2, r=1` after two swaps.

<div class="dsa-viz" data-algo="reverse-array"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Using `l <= r` swaps the middle element with itself — harmless but wasteful, and a bug if the swap has side effects.
- Off-by-one when seeding `r = n` instead of `r = n - 1`.
- For strings in immutable-string languages (Java, Python `str`), you can't swap in place — convert to a char array first.
- Reversing only a subrange `[i, j]` is the same loop with different seeds — don't rewrite the logic, parameterize it.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/reverse-string/">344. Reverse String (Easy)</a> — the canonical in-place reverse on a char array.</li>
    <li><a href="https://leetcode.com/problems/reverse-string-ii/">541. Reverse String II (Easy)</a> — reverse every K-th chunk; reuse the subrange variant.</li>
    <li><a href="https://leetcode.com/problems/reverse-vowels-of-a-string/">345. Reverse Vowels of a String (Easy)</a> — two pointers, skip non-vowels on each side.</li>
    <li><a href="https://leetcode.com/problems/reverse-only-letters/">917. Reverse Only Letters (Easy)</a> — same trick, letter-only filter.</li>
    <li><a href="https://leetcode.com/problems/valid-palindrome/">125. Valid Palindrome (Easy)</a> — compare-then-advance instead of swap.</li>
    <li><a href="https://leetcode.com/problems/reverse-words-in-a-string-iii/">557. Reverse Words in a String III (Easy)</a> — reverse each word's range independently.</li>
    <li><a href="https://leetcode.com/problems/rotate-array/">189. Rotate Array (Medium)</a> — three reverses: whole, prefix, suffix.</li>
    <li><a href="https://leetcode.com/problems/reverse-words-in-a-string/">151. Reverse Words in a String (Medium)</a> — reverse the whole string, then each word.</li>
    <li><a href="https://leetcode.com/problems/palindrome-linked-list/">234. Palindrome Linked List (Easy)</a> — reverse the second half, then compare halves.</li>
    <li><a href="https://leetcode.com/problems/reverse-nodes-in-k-group/">25. Reverse Nodes in K-Group (Hard)</a> — pointer surgery on linked-list chunks.</li>
  </ul>
</div>
