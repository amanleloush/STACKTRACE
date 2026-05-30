# 03 — Failure stories

> Behavioral • Position 3/5

## The question family

- "Tell me about a time you failed."
- "Walk me through your biggest professional mistake."
- "Describe a project that didn't go as planned."
- "What's a decision you'd make differently now?"

Every loop asks something in this shape. They're testing whether you have the self-awareness to **own** a mistake, the maturity to **learn** from it, and the judgment to have **changed your behavior** since.

## The framework

Use **STAR + Reflection** with a deliberately tighter focus on the last two letters:

- **Situation** (10%) — set the scene in a sentence.
- **Task** (10%) — what you owned.
- **Action** (30%) — what you actually did, including the mistake.
- **Result** (20%) — the bad outcome, stated plainly.
- **Reflection** (30%) — what you learned, what behavior changed, evidence of the change.

The 30% on reflection is the whole point. A failure story with a thin reflection sounds like blame-shifting.

## Story template

> **Situation.** Last year I was tech-leading the migration of our payment ledger from MySQL to a sharded setup.
>
> **Task.** I owned the cutover plan and the rollback design.
>
> **Action.** To hit a deadline I'd already committed to, I cut the dual-write soak from two weeks to four days. The data looked clean in dashboards, so I gave the green light to flip reads. Within ~40 minutes we saw a spike in reconciliation mismatches — a rare ledger-correction path was writing only to MySQL because we'd never tested it under the dual-write code path.
>
> **Result.** We rolled back inside the hour with no customer impact, but the team spent the next week chasing tail-anomalies and the launch slipped by three weeks. My manager and I had a frank conversation about the shortened soak.
>
> **Reflection.** I'd treated "no errors on the happy path" as a green signal when the real risk lived in the long-tail paths. Since then, before every cutover I write down the top five low-frequency write paths and prove each one is exercised in the soak — and I push back hard on deadlines that compress soak time. I ran a second migration four months later and held a 10-day soak even though leadership pushed for five; we caught two latent bugs that would have repeated the same incident.

The reflection paragraph is *almost as long* as the action paragraph. That's the signal.

## 3 worked stories

### Story A — Senior engineer / project leader

A trade you made to ship faster broke production. Own it, then explain how your post-mortem habits, runbook discipline, or rollout playbook changed permanently.

### Story B — Mid-level engineer / IC

A piece of code you shipped had a bug you should have caught — missed an edge case, misread a spec, skipped a test. Own it. Talk about the testing or code-review habit you adopted since.

### Story C — Early career / first job

A non-technical failure works too — you over-committed, didn't ask for help, missed a deadline by suffering in silence. Own it. Talk about how you learned to escalate earlier, structure your work, or admit uncertainty.

## Anti-patterns

- **"My biggest failure is that I work too hard."** Don't humble-brag. Interviewers can spot it from 20 feet away.
- **Blaming the team / vendor / spec.** Even if it was a contributing factor, your story is about *your* part. Externalizing the failure tells the interviewer you'd do it again.
- **A failure with no consequences.** If nothing actually went wrong, it's not a failure story; it's a near-miss. Either pick a real one or reframe to "a decision I would now make differently."
- **A failure with no behavior change.** "I learned to be more careful" isn't a behavior change. "I now write a one-page rollout doc before every migration" is.
- **Too small.** A typo, a missing import, a flaky test — those don't show judgment. Pick something with stakes.
- **Too big.** "I cost the company $5M in churn" — be careful. If true, fine; if exaggerated, you'll get probed and crack.

## Prep checklist

- [ ] Can you name the failure in one sentence without flinching?
- [ ] Can you specify the cost — time, money, customer impact?
- [ ] Can you point to a **behavior** that changed (not a vague attitude)?
- [ ] Can you give a follow-up example showing the changed behavior actually held?
- [ ] Are you ready for "what would you do differently today?" — your answer should be specific, not just "be more careful."

A strong failure story is the single biggest signal of seniority in a behavioral round. Have one rehearsed.
