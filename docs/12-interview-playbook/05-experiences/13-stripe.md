# Stripe

> Experiences • Position 13/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> 4-5 onsite rounds (after 1-2 screens)</span>
  <span><strong>Total time</strong> ~5-7 hours</span>
  <span><strong>Style</strong> Realistic engineering, IDE-heavy, correctness-first</span>
  <span><strong>Difficulty</strong> Hard</span>
</div>

## The loop

1. **Recruiter screen (30 min)** — Role, location, comp range. Fairly standard.
2. **Technical phone screen (60 min)** — One realistic coding problem in your IDE, often building a small in-memory system that grows in scope (e.g., "parse this log format and answer queries on it; now stream it; now handle concurrent updates"). Less LeetCode, more "can you code a small system."
3. **Onsite round 1 — Coding / Integration (60-75 min)** — IDE again, a slightly larger problem with multiple files and stages. Frequently builds on a real Stripe-shaped concern: rate limiting, idempotency keys, retry semantics, payment reconciliation. Tests added incrementally; passing tests at each stage matters.
4. **Onsite round 2 — Systems Design (60 min)** — Open-ended HLD on a payments-flavored problem (subscriptions, ledger, refunds, currency conversion). Stripe interviewers care less about scale numbers and more about correctness under failure: what if the network drops mid-write? what's the audit trail? how do we replay safely?
5. **Onsite round 3 — Debugging (60 min)** — A real-ish codebase with bugs. You navigate, hypothesize, instrument, and fix. Tests your `git`/`grep`/`stack-trace` instincts and how you reason about unfamiliar code. Many candidates underprepare for this round.
6. **Onsite round 4 — Behavioral / Engineering Bar (45-60 min)** — Past projects, ownership, how you collaborate, why Stripe. Stripe writes a lot; they like candidates who think through writing.

Some loops include a 5th round on infra / API design depending on the team.

## What's different here

- **Realistic engineering, not LeetCode.** You'll spend the majority of the loop in an IDE solving small but real problems. Get comfortable with your editor, your shortcuts, and standard library docs (they often allow internet access).
- **Correctness > cleverness.** Stripe processes money. They want code that handles edge cases — empty input, duplicate input, partial failure, retries — by default. A working-with-edges solution beats a cleaner-but-fragile one.
- **They test what they actually do.** Idempotency, retries, exactly-once semantics, ledger correctness — these show up in actual interviews because that's what Stripe engineers actually work on.
- **Writing matters.** Many later rounds (including final review) involve written artifacts. Strong written communication helps.
- **The debugging round is distinctive.** Practice exploring an unfamiliar codebase. Open a moderate-sized OSS project, pick an issue, hypothesize, narrow down, fix.

## Common question themes

- **Idempotency keys** — designing them, deduping retries.
- **Rate limiting + backoff** — including jittered exponential backoff and respecting `Retry-After`.
- **Ledger systems** — double-entry, balances, refunds, partial captures.
- **Webhooks** — retry policy, signature verification, ordering guarantees.
- **Multi-currency / multi-region** — FX handling, regional data residency.

## Sample questions

- "Parse this CSV of transactions and compute the running balance per account. Now make it streaming. Now make it support refunds with idempotency keys."
- "Design a retry strategy for a payment gateway with a 5% baseline error rate and a 99.95% target success rate."
- "Design a webhook delivery system that guarantees at-least-once with bounded retry."
- "Given this code [hands you 400 lines of Python], find why some refunds are getting double-applied."
- "Tell me about a time you owned a system in production and made an unpopular call about its boundaries."

## How to prep

- **Practice in your real IDE.** Don't rehearse on LeetCode. Pick a small problem, build it in your IDE with tests, and watch yourself: how fast you type, how fast you debug a typo, how often you switch context.
- **Read Stripe's engineering blog.** Their public engineering writing on idempotency, ledger, and webhook delivery is *literally* the material they expect you to be conversant with.
- **Do one debugging exercise per week.** Pick an OSS project bug from GitHub; spend 60 minutes reading-then-fixing without help.
- **Write your behavioral stories down.** Stripe values clear written thought. Doing 5 STAR stories in Notion before the loop pays off.

## Recent vibe (2024-2026)

Hiring has been steadier than at many peers — Stripe didn't have the same scale of layoffs as adjacent companies. The bar is unchanged: hard but predictable. Remote roles exist for some teams; many roles still concentrate in SF / NYC / Seattle / Dublin / Singapore. Bangalore office continues to grow.
