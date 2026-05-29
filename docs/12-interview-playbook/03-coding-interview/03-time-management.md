# 03 — Time management

> Coding interview • Position 3/4

## What

How to pace a 45-minute coding round so you ship a working solution every time — including when to ask for a hint, when to abandon a stuck approach, and when to keep pushing. Time is the only resource you cannot recover. Spending it well is half the interview.

## Why it matters

Most candidates who fail a coding round had the knowledge to solve the problem. They just ran out of time — either because they over-clarified for 10 minutes, or wrote the wrong approach and couldn't pivot, or kept fixing bugs in a doomed solution past the point of recovery. The interviewer doesn't write "smart but ran out of time" on the rubric. They write "didn't finish" and that's a no-hire signal.

You don't need to be the fastest; you need to be the most disciplined. A candidate who turns in a working O(n²) solution at minute 40 beats one who almost has O(n) but never compiles. The framework is built around budgeted phases precisely so that you always have something to show.

The other reason this matters: interviewers watch *how you respond to being stuck*. Recovering gracefully — pausing, restating, asking for a small hint — is a strong senior signal. Thrashing silently is the opposite.

## How to do it

Treat 45 minutes as a budget with hard checkpoints.

**Minute 0-5 — Understand.** If you're past 5 minutes without a clarified problem and a worked example, you're over-clarifying. Move on.

**Minute 5-15 — Plan.** Brute force, optimized approach, complexity, buy-in. If you're past 15 without a plan the interviewer agreed to, you don't have the right mental model. Ask: "I'm considering two approaches — A or B. Do you have a preference, or is there a hint about which direction?" This is a *legitimate* place to ask for direction.

**Minute 15-35 — Code.** Type. Narrate. Don't re-architect mid-code. If you hit a wall, stop typing for 30 seconds and think — flailing keystrokes are visible to the interviewer.

**Minute 35-40 — Test.** Trace the original example. Then a tricky case. If you find a bug, fix it. If the fix would require restructuring, decide quickly: is it a 2-minute patch or a 10-minute rewrite? If the latter, you may have to ship what you have and explain the gap.

**Minute 40-45 — Optimize / discuss.** Even a quick "time is O(n), space is O(n) — if memory were tight I'd consider streaming with a single pass and bounded state" earns rubric points.

### Pacing techniques

**Set internal milestones out loud.** "I'm going to spend two more minutes clarifying, then propose an approach." This gives the interviewer a contract — they know when you'll move on and they can intervene if you're drifting.

**Glance at the clock at predictable moments.** End of clarification, end of plan, halfway through coding. Don't check every 30 seconds — it reads as anxious.

**When you're stuck, name it.** "I'm not seeing the recurrence right away. Let me try writing out a small example to find the pattern." This buys 60 seconds of thinking time that *looks productive*.

### When to ask for a hint

You can ask for a hint without losing points. The signal you're sending depends on *how* you ask:

- **Bad:** "I'm stuck." (vague, helpless)
- **Good:** "I've been considering a hash-map approach but I'm worried about the space. Would you suggest a different direction, or is hash map the right family?"
- **Better:** "I have one approach in mind — O(n log n) using sorting plus binary search. Is that in the right neighborhood, or were you looking for something else?"

Ask for a hint *no later than minute 18*. After that you don't have the runway to actually use it. The right time is when you've spent 3-4 minutes genuinely thinking and aren't making progress — not 30 seconds in (lazy) and not 25 minutes in (panicked).

### When to pivot

If you realize at minute 25 that your approach is fundamentally wrong — say, you picked DFS but it should have been BFS — you face the hardest call of the interview. Two factors decide:

1. **Is the new approach a small mutation or a full rewrite?** If you can convert DFS to BFS by swapping a stack for a queue, do it (3 minutes). If you'd have to redesign the data model, you probably can't finish.

2. **How confident are you the new approach actually works?** Switching only to be wrong twice is fatal.

When in doubt: **finish the wrong approach, then narrate the right one.** A working brute force + a clearly articulated correct approach often scores better than a half-finished optimal solution. The rubric measures "produces working code" and "knows the optimal approach" as separate items.

### When to keep going

If you've found a bug 90 seconds before time, you have a decision: silently keep debugging or stop and *narrate* what's wrong. Narrate. "I see — my window bound is off by one because I'm including the just-removed character. The fix is to decrement before checking. I'd write that here." You'll score better for diagnosing the bug verbally than for a panicked, incomplete fix.

## Concrete dialogue / example

*Minute 22. You've been coding a DP solution and the recurrence is wrong.*

**You** *(pausing typing):* "Hmm. Let me trace this on the example… for `n=3` I'm getting `5` but the expected answer is `3`. My recurrence is treating overlapping subproblems incorrectly — I'm double-counting paths that share a prefix. Give me thirty seconds to rethink."

*[Silence for 30 seconds. You scribble on the whiteboard.]*

**You:** "OK, I see. The issue is that I should be subtracting paths counted at the previous level, not adding them. That's a one-line change — let me fix it and re-run mentally on n=3."

*[You change the line. Trace shows the right answer.]*

**You:** "That fixes the case. Let me also try n=4 to be sure… yes, gives 8 which matches. Now let me move on to test edge cases."

Notice: you named the problem, gave a precise time estimate (30 seconds), did the thinking visibly, and recovered without panic. That's a high-signal recovery.

## Anti-patterns

- **Silent thrashing.** Editing the same three lines for 5 minutes without explaining. The interviewer can't help, and you're burning the clock.
- **Asking for a hint at minute 35.** Too late. You don't have runway.
- **Refusing to abandon a doomed approach because of sunk cost.** Five minutes invested doesn't mean the next five will be productive.
- **Skipping the test phase to keep coding.** A solution you didn't test is worth less than one you did — bugs you'd have caught in trace are now landmines the interviewer will find.
- **Spending 8 minutes optimizing when you haven't shipped anything.** A working unoptimized solution > an incomplete optimal one.

## Cheat-line

> **Always ship working code by minute 40, even if it's brute force.** A finished suboptimal solution scores higher than an unfinished optimal one — and you can always optimize in the last 5 minutes.
