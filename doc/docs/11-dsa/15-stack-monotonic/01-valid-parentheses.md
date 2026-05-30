# 01 — Valid Parentheses

> Monotonic Stack • Position 1/4

## Problem
Given a string of `()[]{}`, decide if every opener is matched by a same-type closer in correct nesting order.

## Intuition
A stack matches the LIFO grammar of nested brackets perfectly. Push every opener as you see it; when you see a closer, the most recently opened bracket must match it — peek the stack and pop. **Invariant**: at every point in the scan, the stack holds the prefix of openers that have not yet been closed, with the most recent on top. If the stack is ever empty when a closer arrives, or the top doesn't match, the string is invalid. If the stack is non-empty at the end, you have unmatched openers.

## Algorithm
Stack of openers with a closer→opener match table.

```python
def is_valid(s):
    match = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in '([{':
            stack.append(ch)
        else:
            if not stack or stack[-1] != match[ch]:
                return False
            stack.pop()
    return not stack
```

## Walkthrough
Validate `"({[]})"`.

1. `(` — push. Stack: `[(]`.
2. `{` — push. Stack: `[(, {]`.
3. `[` — push. Stack: `[(, {, []`.
4. `]` — top `[` matches, pop. Stack: `[(, {]`.
5. `}` — top `{` matches, pop. Stack: `[(]`. Then `)` — top `(` matches, pop. Stack empty. Return `true`.

<div class="dsa-viz" data-algo="valid-parens"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(n)</strong></span>
</div>

## Pitfalls
- Forgetting the empty-stack check before peeking — pops on `]` with no opener crash or silently misbehave.
- Counting brackets without a stack (`count_paren`, `count_bracket`) works only for single-type strings; mixed types need a stack to enforce order.
- Returning `True` at end without checking the stack is empty — `"((("` returns true otherwise.
- A `dict.get(ch)` for non-brackets returns `None`, which can mask typos in the alphabet. Validate input shape if it matters.
- Variants like LC 32 (Longest Valid Parentheses) need the **index** on the stack, not the character — track positions to compute lengths.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/valid-parentheses/">Valid Parentheses (Easy)</a> — canonical.</li>
    <li><a href="https://leetcode.com/problems/generate-parentheses/">Generate Parentheses (Med)</a> — backtracking with a counter.</li>
    <li><a href="https://leetcode.com/problems/longest-valid-parentheses/">Longest Valid Parentheses (Hard)</a> — stack of indices.</li>
    <li><a href="https://leetcode.com/problems/valid-parenthesis-string/">Valid Parenthesis String (Med)</a> — two stacks for `*` flexibility.</li>
    <li><a href="https://leetcode.com/problems/score-of-parentheses/">Score of Parentheses (Med)</a> — stack-based accumulator.</li>
    <li><a href="https://leetcode.com/problems/minimum-add-to-make-parentheses-valid/">Minimum Add to Make Parentheses Valid (Med)</a> — counter or stack.</li>
    <li><a href="https://leetcode.com/problems/minimum-remove-to-make-valid-parentheses/">Minimum Remove to Make Valid Parentheses (Med)</a> — track unmatched indices.</li>
    <li><a href="https://leetcode.com/problems/maximum-nesting-depth-of-the-parentheses/">Maximum Nesting Depth of the Parentheses (Easy)</a> — running max of counter.</li>
    <li><a href="https://leetcode.com/problems/minimum-number-of-swaps-to-make-the-string-balanced/">Minimum Number of Swaps to Make the String Balanced (Med)</a> — counter trick.</li>
    <li><a href="https://leetcode.com/problems/minimum-insertions-to-balance-a-parentheses-string/">Minimum Insertions to Balance a Parentheses String (Med)</a> — variant with `((` rule.</li>
  </ul>
</div>
