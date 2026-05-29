# Cred

> Experiences • Position 12/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> 5-6 rounds</span>
  <span><strong>Total time</strong> ~6-8 hours over 1-2 days</span>
  <span><strong>Style</strong> Product-engineering, high taste bar</span>
  <span><strong>Difficulty</strong> Hard</span>
</div>

## The loop

1. **Recruiter screen (20-30 min)** — Quick fit + comp range + role context. Mostly logistics.
2. **HackerEarth/Codility OA (60-90 min)** — 2-3 problems, usually one easy + one medium. Don't let cleverness obscure correctness; they read your code.
3. **DSA round 1 (60 min)** — Live coding on a Cred-internal pad or shared Google Doc. Expect a hard medium or an easy hard. Patterns frequently tested: graphs, DP, trees, two-pointer/sliding-window. They go deep on complexity analysis and edge cases.
4. **DSA round 2 (60 min)** — Second algorithm round, often with an LLD twist (e.g., "build a rate limiter class with these constraints"). Code quality and naming get scrutinized.
5. **LLD / Machine coding (60-90 min)** — Build a small system end to end in your IDE — common prompts: parking lot, splitwise, file system, snake & ladders. They evaluate the design, OOP, and how you handle extension requests partway through.
6. **HLD round (60 min)** — Open-ended system design, often anchored in payments / fintech (e.g., "design Cred Pay", "design a credit-card-bill reminder system at our scale"). Strong bias toward correctness over breadth.
7. **Bar raiser / hiring manager (45-60 min)** — Cultural fit, ownership, product taste. Cred talks a lot about its members and member experience — bring stories that show empathy for users + bias toward quality.

For senior / staff loops, the LLD round may be replaced with an architecture deep-dive on something you previously built.

## What's different here

- **Product taste matters more than at most companies.** They build for a relatively affluent, credit-card-paying user base, and they want engineers who actually *care* about the product, not just the puzzle.
- **High code-quality bar.** Variable names, function decomposition, and idiomatic use of the language all get noticed. Sloppy code gets penalized even if it's correct.
- **Bias for fewer, deeper hires.** Cred's hiring throughput has historically been modest; passing is hard but the comp + autonomy are above market for India.
- **They probe your reasoning under pressure.** Expect "why did you pick this data structure?" and "is there a case where this fails?" — pre-empt by stating the reasoning before they ask.
- **Mobile-leaning culture.** Many engineers come from / sit close to mobile teams. Even backend roles benefit from mobile-API-friendliness awareness.

## Common question themes

- **Graphs + BFS/DFS** — connected components, shortest path variants.
- **DP** — 1D + 2D state, knapsack variants, LIS family.
- **Trees** — recursive structure problems, BST invariants, LCA.
- **Concurrency-flavored LLD** — thread-safe queue, rate limiter, basic in-memory cache.
- **HLD with fintech flavor** — idempotency, retries, reconciliation, audit trails.

## Sample questions

- "Find the maximum sum path in a binary tree."
- "Implement an LRU cache with TTL eviction."
- "Design a parking lot system with floors, slot types, and an entry/exit log."
- "Design Cred Pay end-to-end — focus on idempotency and double-charge prevention."
- "Tell me about a product decision you pushed back on and why."
- "What's a feature in any app you use that you'd change tomorrow, and how?"

## How to prep

- **Drill mediums hard.** Cred's DSA loops lean medium-with-rigor more than hard-with-tricks. Pattern recognition + clean code is the bar.
- **Practice 2-3 machine-coding problems** end to end in your IDE. Get used to typing fast and structuring classes without an interviewer pacing you.
- **Pick a payments-flavored HLD problem** to anchor on — UPI flow, payment retry & reconciliation, BNPL — and be ready to discuss idempotency, eventual consistency, and audit/compliance requirements.
- **Build a product opinion.** Use Cred as a member for a week. They want to know you've thought about it.

## Recent vibe (2024-2026)

Hiring has been selective post the broad fintech compression. Loops are unchanged in shape but the bar feels higher — fewer roles, more candidates per role. Comp remains among the better packages in the Indian product-co market, with meaningful equity for senior+ hires.
