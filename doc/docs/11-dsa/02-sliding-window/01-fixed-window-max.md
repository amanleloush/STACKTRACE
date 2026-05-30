# 01 — Fixed-size sliding window — max sum of K

> Sliding Window • 1/5

## Problem
Given an array and an integer `k`, return the **maximum sum** of any contiguous subarray of length exactly `k`.

## Intuition
Two consecutive windows differ by one element on each end. Compute the sum of the first window in O(k), then for each subsequent step *roll* the sum: add the new right element, subtract the leftmost. Each transition is O(1), so the whole pass is O(n). The invariant is `windowSum == sum(arr[l..r])` at every step — never recompute, just adjust.

## Algorithm
1. Compute `s = sum(arr[0..k-1])`. Set `best = s`.
2. For `r = k .. n-1`:
   - `s += arr[r] - arr[r - k]` (add new, drop old).
   - `best = max(best, s)`.
3. Return `best`.

```python
def max_sum_k(arr, k):
    s = sum(arr[:k])
    best = s
    for r in range(k, len(arr)):
        s += arr[r] - arr[r - k]
        best = max(best, s)
    return best
```

## Walkthrough
On `arr = [2, 1, 5, 1, 3, 2]`, `k = 3`:

- Step 1 — initial window `[2, 1, 5]`: `s = 8`, `best = 8`.
- Step 2 — `r=3`: add `arr[3]=1`, drop `arr[0]=2`. `s = 7`. `best` stays at 8.
- Step 3 — `r=4`: add `arr[4]=3`, drop `arr[1]=1`. `s = 9`. `best = 9`.
- Step 4 — `r=5`: add `arr[5]=2`, drop `arr[2]=5`. `s = 6`. `best` stays at 9.

Return `9` (window `[5, 1, 3]`).

<div class="dsa-viz" data-algo="fixed-window-max"></div>

## Complexity

<div class="dsa-bigO">
  <span>time <strong>O(n)</strong></span>
  <span>space <strong>O(1)</strong></span>
</div>

## Pitfalls
- Off-by-one on the initial window — make sure the first sum covers exactly `arr[0..k-1]`.
- Subtracting `arr[r - k + 1]` instead of `arr[r - k]` — the element leaving is the one at the *old* left index.
- Recomputing the sum each step — that's O(n·k); the whole point of rolling is to drop that factor.
- For "max of window" (not sum), use a **monotonic deque** — running max needs more than addition/subtraction.

<div class="dsa-practice">
  <h4>Practice — LeetCode</h4>
  <ul>
    <li><a href="https://leetcode.com/problems/maximum-average-subarray-i/">643. Maximum Average Subarray I (Easy)</a> — divide the rolled sum by k at the end.</li>
    <li><a href="https://leetcode.com/problems/defuse-the-bomb/">1652. Defuse the Bomb (Easy)</a> — circular rolling window.</li>
    <li><a href="https://leetcode.com/problems/k-radius-subarray-averages/">2090. K Radius Subarray Averages (Medium)</a> — window of size `2k+1` centered on each index.</li>
    <li><a href="https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/">1456. Maximum Number of Vowels in a Substring of Given Length (Medium)</a> — same template; the rolling state is a vowel counter.</li>
    <li><a href="https://leetcode.com/problems/find-k-length-substrings-with-no-repeated-characters/">1100. Find K-Length Substrings With No Repeated Characters (Medium)</a> — rolling frequency map of size k.</li>
    <li><a href="https://leetcode.com/problems/permutation-in-string/">567. Permutation in String (Medium)</a> — fixed window matching a frequency map.</li>
    <li><a href="https://leetcode.com/problems/find-all-anagrams-in-a-string/">438. Find All Anagrams in a String (Medium)</a> — same as 567 but emit all start indices.</li>
    <li><a href="https://leetcode.com/problems/max-consecutive-ones-iii/">1004. Max Consecutive Ones III (Medium)</a> — variable window with a "zeros used" cap of k.</li>
    <li><a href="https://leetcode.com/problems/maximum-sum-of-distinct-subarrays-with-length-k/">2461. Maximum Sum of Distinct Subarrays With Length K (Medium)</a> — fixed window plus a distinctness check.</li>
    <li><a href="https://leetcode.com/problems/sliding-window-maximum/">239. Sliding Window Maximum (Hard)</a> — max instead of sum; monotonic deque.</li>
  </ul>
</div>
