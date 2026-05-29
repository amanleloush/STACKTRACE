# 02 — Clarifying questions

> Coding interview • Position 2/4

## What

The five categories of clarifying questions every coding interview begins with — **input format, output format, constraints, edge cases, and expected complexity** — plus ten ready-to-use questions you can lift verbatim. Asking the right two or three is often the difference between coding the wrong solution and coding the right one.

## Why it matters

Interview problem statements are deliberately under-specified. The interviewer wants to see whether you'll surface ambiguity or charge ahead and code something that doesn't match what they need. The difference between a senior signal and a junior signal often shows up in the first ninety seconds: a junior reads "find duplicates in an array" and starts coding; a senior asks "are these duplicates by value or by position? Sorted? Can the array be modified?"

You also get a second prize: the interviewer often *gives away the optimal approach* when answering. "Yes, the array is sorted" is a hint — they want you to use two pointers. "You can modify the input" is permission to sort or partition in place. Free information lives in the answers.

Finally, clarifying buys thinking time. Those 90 seconds while you ask and they answer is when your brain is matching the problem to known patterns. You're not wasting their time — you're using it productively.

## How to do it

Go through these five categories in order. Don't ask every question; ask the two or three that matter most for *this* problem. Twenty seconds of judgment about which to ask is fine.

**1. Input format.** What's the data structure? What's its size range? Sorted? Unique? Are values bounded (positive only, fit in int32)?

**2. Output format.** A count, a list, indices, values? Any specific order? Print or return? Multiple valid answers — return any or all?

**3. Constraints (size and value).** What's the upper bound on n? On individual values? This tells you whether O(n log n) is fine or you need O(n). It also tells you whether you can use an array-based hash (only if values fit) or need a real hash map.

**4. Edge cases.** Empty input? Single element? All identical? Negative numbers? Floating point precision? Unicode characters? Very long strings?

**5. Expected complexity (optional, late).** If you're stuck choosing between two approaches, you can ask: "Do you have a target complexity in mind?" Use sparingly — sometimes the interviewer wants you to figure it out.

A good rule of thumb: ask 3 clarifying questions on the average problem, 5 on a hard one, 1-2 on a clearly-defined easy one. More than 6 starts to feel like stalling.

## Concrete dialogue / example

**Interviewer:** "Given a string, find the longest substring without repeating characters."

**You:** *(checking input)* "When you say string — is it ASCII, Unicode, just lowercase letters?"

**Interviewer:** "Assume printable ASCII, so 128 possible characters."

**You:** *(now I know I can use a 128-element array instead of a hash map)* "Got it. And by 'longest substring' do you want me to return the length, the substring itself, or its start index?"

**Interviewer:** "Just the length is fine."

**You:** *(checking edge cases)* "What about the empty string?"

**Interviewer:** "Return 0."

**You:** *(checking constraint)* "How long can the string get?"

**Interviewer:** "Up to ten million characters."

**You:** *(now I know O(n²) is way too slow — need O(n) sliding window)* "Right, that rules out a quadratic approach. Sliding window with a last-seen index map looks like the path — O(n) time, O(128) space."

In four short questions you've narrowed the problem from ambiguous to fully specified, signaled that you understand asymptotic constraints, and earned the right to write a tight 15-line solution instead of an over-engineered one.

## Ten clarifying questions to keep in your pocket

These cover ~80% of real coding interviews. Memorize them; pick 2-3 per problem.

1. **"What's the size range of the input?"** — tells you the acceptable complexity.
2. **"Can the input be empty?"** — surfaces a near-universal edge case.
3. **"Can values be negative? Zero? Floats?"** — affects overflow, sums, and sentinel choices.
4. **"Are duplicates allowed in the input? In the output?"** — changes set vs list, and whether you skip duplicates.
5. **"Is the input sorted? Can I sort it in place?"** — sorting changes everything.
6. **"What should I return if no valid answer exists?"** — `-1`, `null`, `[]`, throw? Always confirm.
7. **"If multiple valid answers exist, return any one or all?"** — DFS/backtracking lives here.
8. **"Can I modify the input array / string?"** — permission to sort or mark in place saves space.
9. **"What's the character set / alphabet size?"** — ASCII (128), lowercase (26), Unicode (a lot) — determines whether arrays beat hash maps.
10. **"Is this called once, or in a loop with the same data?"** — preprocessing (prefix sums, sorts) is free if you call it once at setup vs per query.

## Anti-patterns

- **Asking every question you've memorized regardless of relevance.** Reads as ritual, not thought. Pick what matters.
- **Asking questions whose answer is already in the problem statement.** Re-read first.
- **Asking, getting an answer, and then ignoring it.** If they say "the array can be huge," don't propose O(n²).
- **Asking for the optimal complexity right away.** Strong candidates derive it; only ask after you've proposed an approach.
- **Long monologue questions.** "So I was wondering, given that we have this input, and you mentioned earlier..." Keep it tight: one sentence, one question.

## Cheat-line

> **Ask three clarifying questions before you write a single character of code** — one about input shape, one about constraints, one about an edge case. The right three will often hand you the optimal approach.
