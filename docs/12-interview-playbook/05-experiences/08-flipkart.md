# Flipkart

> Experiences • Position 8/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> 5-6 rounds, machine-coding heavy</span>
  <span><strong>Total time</strong> ~7-9 hours including the 90-min machine coding</span>
  <span><strong>Style</strong> Strong LLD bar, commerce-flavored HLD, sharp culture filter</span>
  <span><strong>Difficulty</strong> Hard — machine coding bar is famously high</span>
</div>

## The loop

A typical Flipkart SDE-II / Senior loop. Junior loops compress some of these rounds.

- **Recruiter screen (~30 min)** — Logistics, level fit, role mapping. Often determines which team you'll be evaluated for.
- **DSA round (60-75 min)** — One or two medium-hard problems. Bar is solid but not the harshest — usually less tight than Meesho's DSA round.
- **Machine Coding round (90 min)** — The signature Flipkart round. You're given a problem statement, expected to design and implement a working solution in 90 minutes. Code must compile, run, and pass test cases. Code quality (naming, modularity, extensibility) is heavily weighted.
- **LLD round (60 min)** — Object design discussion. Often a continuation or deeper probe of the machine coding problem, or a separate OO design (parking, splitwise, library system).
- **HLD round (60 min)** — System design at scale. Commerce / marketplace / logistics anchored — order pipeline, catalog, cart, payments, notifications. Capacity reasoning expected at senior+.
- **Hiring manager round (45-60 min)** — Team fit, scope, ownership. Senior+ loops often add a skip-level / bar-raiser-style round.
- **Bar raiser / culture round (45 min, senior+)** — Behavioral depth, ownership signals, fast-paced execution probes.

## What's different here

- **Machine Coding is the round.** Reported feedback consistently calls this out as the most distinctive Flipkart round. A working, well-structured, extensible solution in 90 minutes is the bar. Half-done or messy code rarely passes.
- **Code quality matters as much as correctness.** Naming, separation of concerns, interface design, testability — all are evaluated, not just "does it run."
- **LLD is mature.** They want SOLID-aware thinking, clear interfaces, and an explicit story for how the design extends to new requirements.
- **HLD anchors on marketplace problems.** Order, catalog, fulfillment, returns, payments, recommendations. Generic "design Twitter" is less common; marketplace flavor dominates.
- **Engineering culture is more process-oriented than Meesho.** Reviews, design docs, and tech-lead/staff ladder all show up in interview discussion.

## Common question themes

- **DSA** — Arrays, hashmaps, trees, graphs, sliding window, intervals. Medium-leaning.
- **Machine Coding** — Multi-class, multi-feature problems. Splitwise, parking lot, e-commerce cart, ride matcher, vending machine, file system.
- **LLD** — SOLID, design patterns (strategy, factory, observer), interface vs implementation thinking.
- **HLD** — Catalog search, order pipeline, fulfillment, recommendation system, festive-spike traffic, returns workflow.
- **Behavioral** — Ownership, cross-team collaboration, executing under time pressure.

## Sample questions

(Generic forms — not actual interview questions.)

- Machine coding: implement a Splitwise-like expense manager with users, groups, balances, and settlement.
- Machine coding: implement a simplified e-commerce cart with promotions, discounts, and tax calculation.
- Machine coding: implement a parking lot with multiple slot types and ticketing.
- LLD: extend the machine coding problem with new requirements (new payment method, new promo type).
- HLD: design a marketplace catalog search at 200M+ users with festive spike.
- HLD: design an order pipeline with idempotency, retries, and split-shipment support.
- HLD: design a recommendation system for a marketplace home feed.
- "Tell me about a time you owned a critical incident." / "How do you think about tech debt vs new features?"

## How to prep

- **Drill machine coding under a timer.** This is the single most important prep. Practice 3-4 multi-class problems end-to-end in 90 minutes with clean code, tests, and extensibility hooks.
- **Internalize SOLID and a few patterns.** You don't need design-pattern Olympics, but Strategy, Factory, Observer, and Decorator come up often.
- **Practice naming and modularity out loud.** Reviewers often verbalize their assessment of your code as you write — narrate your decisions.
- **For HLD, practice 4-5 marketplace problems.** Order pipeline, catalog, returns, payments, recommendations. Include capacity numbers anchored to ~200M MAU scale.
- **Have ownership stories.** Flipkart's culture rewards engineers who drive things end-to-end. Stories where you led an incident or refactor land well.

## Recent vibe (2024-2026)

Flipkart's hiring has been steady through 2024-2025, with continued investment in Platform, ML, and Logistics tech. The machine coding bar has not softened — multiple reports describe it as the harshest filter in the loop. Senior+ hiring leans toward staff-level ICs with proven scope. Compensation is competitive within the Indian FAANG/unicorn band; stock vesting structure is worth understanding. Engineering culture has matured noticeably post-2022 — more design-doc / RFC orientation than in earlier years.
