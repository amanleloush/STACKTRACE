# 01 — Big-O & Complexity Analysis

> Foundations • 1/3

## What it is

**Big-O** describes how an algorithm's runtime or space scales with input size **n**, ignoring constants and lower-order terms. It's an *upper bound* on growth. Interviewers expect you to state Big-O for time **and** space before you write code.

## The growth ladder

From fastest to slowest:

| Big-O | Name | Example |
| --- | --- | --- |
| O(1) | constant | hash lookup, array index |
| O(log n) | logarithmic | binary search, balanced BST |
| O(n) | linear | scan an array |
| O(n log n) | linearithmic | merge sort, heapsort |
| O(n²) | quadratic | bubble sort, naïve 2-loop |
| O(2ⁿ) | exponential | brute-force subsets |
| O(n!) | factorial | brute-force permutations |

A 100× jump in n at O(n log n) costs ~700× more work; at O(2ⁿ) it's astronomical.

## How to derive Big-O

1. **Count loops** — nested loops multiply: two nested loops over n is O(n²).
2. **Count work inside the loop** — if each iteration does O(log n), the total is O(n log n).
3. **Recurrences** — solve with the Master Theorem (T(n) = 2T(n/2) + O(n) → O(n log n) — that's merge sort).
4. **Drop constants** — O(3n) → O(n). 2n + 100 is still O(n).
5. **Keep the dominant term** — O(n² + n) → O(n²).

## Common pitfalls

- **`s.contains(x)` in a Python list is O(n)**, but in a set it's O(1). Pick your data structures.
- **String concatenation in a loop is O(n²)** in many languages — use a builder / join.
- **Recursive Fibonacci is O(2ⁿ)** without memoization, O(n) with.
- **Sorting plus a linear pass is O(n log n)**, not O(n) — the sort dominates.

## Amortized analysis

When an operation is *usually* fast but *occasionally* expensive, average the cost across many operations.

- **`ArrayList.add()`** is O(1) amortized — capacity doubling makes the rare resize cost a single O(n) for each O(n) ops elsewhere.
- **Union-Find with path compression** is O(α(n)) amortized — practically constant.

## Space complexity

Same idea, but for memory:

- Recursion uses O(depth) stack space.
- A DP table of size n × m uses O(n·m) space.
- "In-place" usually means O(1) extra space (excluding the input itself).

## The interview move

When you sketch a solution, *announce* your Big-O before coding:

> "I'll use a hash map to dedupe, then a single pass — that's O(n) time, O(n) space."

If the interviewer flinches, ask if they want better (e.g. O(1) space using two pointers). You've just demoed seniority.

## What's next

Read [Recursion fundamentals](../02-recursion/) — it's the prerequisite for DFS, backtracking, and DP. Then [Common patterns map](../03-patterns-map/) to learn how to *recognize* which pattern a problem wants.
