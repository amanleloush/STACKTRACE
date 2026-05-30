---
title: Conflict Handling
---

# 05 — Conflict Handling

> HR round • Position 5/6

## The question (and its variants)

Conflict questions surface in roughly half of HR rounds and in nearly every behavioral round that follows. The HR-round version is usually softer than the behavioral one — they're checking for red flags, not depth.

- "Tell me about a time you had a disagreement with a coworker."
- "How do you handle conflict on a team?"
- "Have you ever had a disagreement with your manager? How did you resolve it?"
- "Tell me about a difficult stakeholder you had to work with."
- "What do you do when a teammate isn't pulling their weight?"

This question is the highest-variance one in the HR loop. A weak answer here can quietly disqualify you even if everything else was strong — recruiters are trained to flag "interpersonal risk" and conflict stories are the primary signal.

## What they're actually evaluating

- **Do you start from empathy?** Senior engineers assume the other person has a reason. Junior ones assume the other person is wrong.
- **Do you take ownership of your part?** Even when you were technically right, you almost always have a 20% share of the conflict — naming it signals maturity.
- **Did the conflict get resolved?** A story that ends with "and then I escalated to my manager" is fine; a story that ends with "and we still don't talk" is a red flag.
- **What did you learn?** The reflection is what separates a war story from a behavioral signal.

## The framework

Use **STAR** with explicit empathy framing.

1. **Situation** — set the scene in 1-2 sentences. *Who, what project, what was at stake.*
2. **Task** — the specific point of conflict and why it mattered. *What were you each pushing for, and why did you both care.*
3. **Action** — and here's the critical bit — describe **your first move as empathy**, then describe the resolution mechanism. The framing matters: did you walk into the room assuming the other person was wrong, or did you walk in trying to understand their position? Recruiters listen for which one.
4. **Result** — what got decided, what shipped, and importantly **what happened to the relationship**.
5. **Reflection (the STAR-plus tail)** — what you'd do differently next time, or what the experience taught you about working with people.

Pick a conflict that was *real* but not *catastrophic*. Hiring decisions, performance management of a peer, or anything legally sensitive — leave out. A technical disagreement with a senior engineer, a roadmap disagreement with product, or a deadline disagreement with leadership — those all work.

## Strong answer template

> "**Situation**: Last year I was the tech lead on a checkout-redesign project, and my team's senior backend engineer and I disagreed sharply on whether to **migrate the order service to event-sourcing** as part of the rewrite. **Task**: He wanted to do it because the existing flow had years of edge-case bugs and a rewrite was a clean opportunity. I was pushing to defer it because we had a 6-week deadline tied to a marketing launch and event-sourcing would double the surface area of what we'd ship.
>
> **Action**: My instinct in the first 24 hours was that he was over-engineering. But before going back to him I **spent a session walking through his three biggest production bugs from the previous year** to understand *why* he wanted the rewrite — and two of them really were caused by the existing state model, not by the team being sloppy. So I went back to him acknowledging that, and we ended up co-writing a proposal that **deferred event-sourcing but introduced an append-only audit log in the rewrite** — about 30% of the value at 5% of the cost. We brought it to the architecture review together rather than separately, which I think mattered.
>
> **Result**: We shipped on time, the audit log caught two production incidents in its first quarter, and we have a clean migration path to full event-sourcing on the next major version. He's now one of my closest collaborators on the team. **Reflection**: The thing I took away is that **most technical disagreements are really disagreements about which problem is most important** — when I forced myself to understand his ranked problem list instead of arguing the solution, the path to a compromise became obvious."

Roughly 290 words. The **bolded** parts are what a strong candidate hits: a real and specific conflict (not abstract), an explicit empathy move ("spent a session walking through his bugs"), a concrete compromise (not "we agreed to disagree"), and a reflection that generalizes (most technical disagreements are really problem-ranking disagreements).

## Anti-patterns

- **"They were just wrong."** Even if true. Senior engineers can usually see why the other person held their position.
- **A conflict you "won."** Reads as adversarial. Strong stories end with a *both-of-us-learned* tone, not a *and-I-was-right* tone.
- **A conflict with someone vulnerable** — a junior, a contractor, someone you outranked. Pick a peer or someone senior to you. Punching down reads badly.
- **A legally sensitive conflict** — anything around performance management, harassment, discrimination. Even if you handled it perfectly, it makes the recruiter uncomfortable and they'll route you cautiously.
- **No resolution.** "We agreed to disagree and now we don't really work together" is a worse answer than not telling the story at all.
- **A 6-minute monologue.** Conflict stories should be 90-120 seconds. Practice cutting yours down.

## 30-second elevator version

> "I disagreed with a senior peer on whether to add event-sourcing to a tight-deadline rewrite. Before pushing back, I walked through his three biggest production bugs from the past year to understand the actual driver. Two of them really were caused by the existing model. We co-authored a compromise — defer full event-sourcing but ship an append-only audit log in the rewrite — which got 30% of the value at 5% of the cost. Shipped on time, he's now one of my closest collaborators."

## Prep checklist

Before any HR round, have answers ready to these on the *same* conflict story:

- *Why did the other person hold their position?* (Must have a sympathetic answer.)
- *What was your 20% of the problem?* (Every conflict has one.)
- *Would you have done anything differently?* (Yes is always the right answer; specifics matter.)
- *How is the relationship now?* (Must be neutral or positive.)
- *What did you learn that you've since applied?* (Must be generalizable, not story-specific.)

If you can't answer all five, pick a different story.
