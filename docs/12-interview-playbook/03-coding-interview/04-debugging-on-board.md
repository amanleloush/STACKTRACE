# 04 — Debugging on the board

> Coding interview • Position 4/4

## What

How to debug a coding solution under interview pressure with no debugger, no IDE, and no IntelliSense — using whiteboard traces, print-statement narration, and your interviewer's body language as your only tools. Also: how to recognize and use the hints the interviewer is dropping.

## Why it matters

In a real engineering job you debug with logs, stepping, breakpoints, and Stack Overflow. In an interview you have none of those. The skills that make you productive at work — "I'll just print and run it" — are unavailable. So the debugging skills you need in an interview are different, and most candidates don't practice them.

Debugging is also where most candidates lose composure. The code didn't work, the interviewer's smile faded, and now you're scrolling up and down the editor making random changes hoping something compiles. That panic is the actual signal a hiring committee acts on — "could not handle being stuck" — even more than the bug itself. Practiced calm under failure is the senior-level signal you're being measured against.

The third reason: interviewers *help you*. They drop hints when you're close to a bug. Most candidates don't notice. Learning to read those hints — "are you sure about that index?", "what happens when the list is empty?" — turns a 4-minute stall into a 30-second recovery.

## How to do it

### Trace one test case by hand, slowly

This is the single most reliable debugging technique. Pick the simplest non-trivial input. Write each variable's value at each line, in a column to the right of the code. Speak the values out loud as you write them. Most bugs reveal themselves between lines 3 and 5 of a careful trace — you say "now `left` is 2 and `right` is 5" and your own mouth tells you the off-by-one.

For a sliding-window problem with input `"abcabc"`:

```
i=0: char='a', map={}, add → map={a:0}, len=1
i=1: char='b', map={a:0}, add → map={a:0,b:1}, len=2
i=2: char='c', map={a:0,b:1}, add → map={a:0,b:1,c:2}, len=3
i=3: char='a', map has 'a' at 0, shrink left to 1, update → map={a:3,b:1,c:2}, len=3
i=4: char='b', map has 'b' at 1, shrink left to 2, update → ...
```

Five lines in, you'll catch the bug. Faster than re-reading the code five times.

### Use print statements as narration

If the platform runs code, sprinkle `print(...)` statements with labels and a marker so you can find them:

```python
print(f"[DEBUG] i={i} left={left} window={s[left:i+1]} len={i-left+1}")
```

The label matters — when output scrolls, you want to grep mentally for `[DEBUG]`. Remove them before declaring done.

If the platform *doesn't* run code (whiteboard, Google Doc), narrate the same trace verbally — say what you'd print and what value it would show. The interviewer is following along.

### Talk through what you expect vs what you see

When the trace diverges from the expected output, name both: "I expected `left` to be 2 at this point because we just hit a duplicate. I'm seeing `left=0`. So the shrink step isn't firing. Let me check the condition…" That sentence is doing three things at once — narrating the bug, signaling to the interviewer that you've found the right area, and inviting them to nod or correct.

### Read the interviewer's hints

When you're close, interviewers help. The hints come in tiers:

- **Tier 1 (subtle):** A long pause where they'd normally say "ok". A glance at one specific line of your code. A hand gesture.
- **Tier 2 (medium):** "Could you walk me through what happens at index 3?" — they've spotted a bug at index 3 and want you to find it.
- **Tier 3 (direct):** "Are you sure that handles negative numbers?" — they want you to add a guard for negatives.

If you get a Tier 2 or 3 hint, **stop coding, accept the hint, and investigate**. Do not argue, do not dismiss it. They're giving you the answer in disguise. The right response is "Oh, good point — let me trace that case" and actually do it.

### Recover from "it doesn't compile"

If your code has a syntax or naming bug, fix it briskly without commentary. Don't apologize. "Typo" or "renaming this variable for clarity" is the most you should say. Long apologies eat clock and signal anxiety.

### Recover from "it's the wrong answer"

When your test produces the wrong output, the move is:

1. **Don't change code yet.** Re-read the problem statement first — sometimes you misread.
2. **Pick a smaller failing case.** If `[1,2,3,4,5]` fails, try `[1,2,3]`.
3. **Trace it by hand.** Find the exact line where reality and expectation diverge.
4. **Hypothesize the cause** out loud: "I think this is because my initial `left` should be 0, not 1."
5. **Fix it. Re-trace. Confirm.**

This sequence takes 3-4 minutes and looks like a senior engineer debugging. Random code changes look like a junior panicking.

## Concrete dialogue / example

**You** *(your "longest substring without repeat" function returned 5 for input `"abcabcbb"`, but expected is 3):*

"Hmm, I'm getting 5 instead of 3. Let me trace by hand starting from `i=3`, which is the first 'a' that repeats.

At `i=3`, character is 'a'. My map has `a:0`. I check — yes, 'a' is in the map. I should be shrinking `left` to `map['a'] + 1 = 1`. Then I update `map['a'] = 3`. And length is `i - left + 1 = 3 - 1 + 1 = 3`. Maximum so far is 3, correct."

*[continues to i=4, i=5…]*

"At `i=6`, character is 'b'. Map has `b:4`. I check — `b in map` is true. I shrink `left` to `map['b'] + 1 = 5`. Length is `6 - 5 + 1 = 2`. Max stays at 3.

So tracing gives me 3, which is correct. But my code is returning 5. The bug must be that I'm only updating the `max` and never resetting `left` properly. Let me look…"

*[finds the bug: `left` was being read but never written after the shrink]*

"Yes — line 8. I compute the new `left` value but I never assign it back. One-line fix. Let me re-run the trace mentally with the fix… returns 3. Correct."

Notice: you stayed calm, picked a specific case, traced by hand, named the bug, and fixed it surgically. Total debugging time: 90 seconds.

## Anti-patterns

- **Random code mutation.** Changing a `<` to `<=` "to see if that fixes it" without understanding why.
- **Re-reading your own code five times.** Your eyes will skip the bug. Trace through a specific input instead.
- **Ignoring an interviewer's question or hint.** When they ask "what happens at index 3?", they're telling you something. Listen.
- **Apologizing repeatedly.** "Sorry, sorry, this is embarrassing." It wastes time and shifts the dynamic. One brisk "let me trace this" is enough.
- **Trying to debug while still typing.** Stop typing. Pick up a marker (real or mental). Trace by hand.
- **Re-running the same test repeatedly hoping for different output.** That's not debugging, that's superstition.

## Cheat-line

> **When code misbehaves, stop typing, pick the smallest failing input, and trace it line by line out loud.** Most bugs surface within five lines of a careful trace — and your interviewer is watching you debug, not blaming you for the bug.
