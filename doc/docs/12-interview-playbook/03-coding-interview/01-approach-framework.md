# 01 — The 5-step approach framework

> Coding interview • Position 1/4

## What

A five-phase script for any 45-minute coding round: **Understand → Plan → Code → Test → Optimize**, with a time budget for each phase so you never thrash. The shape is the same whether the problem is a graph BFS or a tricky DP — only the contents change.

## Why it matters

The single biggest failure mode in coding interviews is jumping straight to code. You read the problem, see something that looks like a sliding window, and start typing. Twenty minutes in you realize you misread the constraint, your data structure is wrong, and you don't have time to start over. Now you're flailing in front of the interviewer.

The framework eliminates this. It forces a 5-minute pause before code, which is when most of the value is created — clarifying the problem, picking the right approach, and getting the interviewer to nod before you commit. Once they nod, you're not coding in suspense; you're executing a plan you both agreed on.

It also gives the interviewer something to score. They're filling out a rubric with categories like "problem solving", "communication", and "code quality". A candidate who narrates the framework as they go hits every one of those rubric items naturally.

## How to do it

The 45-minute budget breaks down roughly:

| Phase | Time | What you're doing |
|---|---|---|
| **1. Understand** | 5 min | Restate the problem. Ask clarifying questions. Walk through 1-2 examples by hand. |
| **2. Plan** | 10 min | Propose a brute force first. Then optimize. State complexity. Get buy-in. |
| **3. Code** | 20 min | Write the agreed-upon solution. Narrate as you go. Use meaningful names. |
| **4. Test** | 5 min | Dry-run on the original example. Then a tricky edge case. Find bugs out loud. |
| **5. Optimize** | 5 min | Discuss time/space improvements, alternative approaches, what you'd do for 10× scale. |

These are guidelines, not contracts. Easy problems compress phases 1-2; hard problems may eat phase 5. But if you've blown 15 minutes and haven't written a line of code, something is wrong — either you're over-clarifying or the problem is genuinely hard and you need a hint.

**Phase 1 — Understand (5 min).** Read the problem aloud. Restate it in your own words: "So I have a list of integers and I need to return all unique triplets that sum to zero — is that right?" Ask about input format (sorted? length range? duplicates?), output format (any order? indices or values?), and edge cases (empty input? single element? negatives?). Run the given example by hand on the whiteboard. If they didn't give an example, make one up and ask if your interpretation matches.

**Phase 2 — Plan (10 min).** State the brute-force solution and its complexity. "I could do this in O(n³) by checking every triplet." Don't be embarrassed by brute force — it shows you understand the problem space. Now propose your optimized approach: "But if I sort the array first, I can fix one element and use two pointers for the other two, which is O(n²)." State the data structures. State the complexity. Then pause and ask: "Does that sound reasonable to start with?" Wait for the nod. This is the most important moment of the interview — once they say yes, you can code without anxiety.

**Phase 3 — Code (20 min).** Type carefully. Use real variable names (`left`, `right`, `target` — not `i`, `j`, `t`). Narrate as you go, but only the *what*, not every keystroke: "Now I'll skip duplicates here by advancing `left` while it equals the previous value." If you realize mid-code that your plan was wrong, stop and say so — don't silently mutate the approach.

**Phase 4 — Test (5 min).** Don't run it (most interview editors don't run). Trace through the original example on paper, line by line, tracking variable values. Then pick a tricky edge case — empty input, all duplicates, all negatives — and trace that too. If you find a bug, fix it calmly: "Ah, I missed the case where the array has fewer than 3 elements. Let me add a guard."

**Phase 5 — Optimize (5 min).** Even if your solution is optimal, this is your chance to flex. "Time is O(n²), space is O(1) ignoring the sort. If the input is streaming I'd need a different approach. If duplicates were rare I might use a hash set instead." This signals seniority.

## Concrete dialogue / example

**Interviewer:** "Given an array of integers, return all unique triplets that sum to zero."

**You:** "Let me make sure I understand. I have an array of integers — can they be negative? And by 'unique triplets' you mean unique by value, not by index?"

**Interviewer:** "Yes, can be negative. Unique by value — `[-1, 0, 1]` and `[0, -1, 1]` count as the same triplet."

**You:** "Got it. How large can the array get?"

**Interviewer:** "Up to about ten thousand elements."

**You:** "OK so n² is fine, n³ is borderline. Let me try a quick example: for `[-1, 0, 1, 2, -1, -4]`, the triplets summing to zero are `[-1, -1, 2]` and `[-1, 0, 1]`. Does that match what you expect?"

**Interviewer:** "Exactly."

**You:** "Brute force would be three nested loops, O(n³), checking every combination — that works but it's wasteful. A better approach: sort the array, then for each index `i`, do a two-pointer sweep on the rest of the array looking for a pair summing to `-nums[i]`. That's O(n²) time, O(1) extra space ignoring sort. Sound good?"

**Interviewer:** "Yes, go for it."

*[Now you code, with a plan you both agreed on.]*

## Anti-patterns

- **Starting to code in the first 60 seconds.** You haven't understood the problem yet. Pause.
- **Asking no clarifying questions.** Reads as either arrogant or inexperienced.
- **Proposing the optimal solution first without mentioning brute force.** You look like you memorized it.
- **Silent coding for 10 minutes.** The interviewer has no idea what you're doing. They can't help. They can't score you.
- **Skipping testing because you're confident.** Even if the code is right, walking through it shows discipline.

## Cheat-line

> **Five minutes of clarifying beats twenty minutes of debugging.** Don't write a line of code until your interviewer has nodded at your plan and you've stated its complexity out loud.
