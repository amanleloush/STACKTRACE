# Razorpay

> Experiences • Position 9/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> 5 rounds (DSA, LLD, HLD, fintech depth, behavioral)</span>
  <span><strong>Total time</strong> ~6-7 hours across 1-2 weeks</span>
  <span><strong>Style</strong> Fintech-anchored, correctness-obsessed, LLD + HLD heavy</span>
  <span><strong>Difficulty</strong> Hard — bar shifts more on correctness than puzzle difficulty</span>
</div>

## The loop

A typical Razorpay SDE / SDE-II / Senior loop. Variants exist across Payments, Banking, Capital, and Platform.

- **Recruiter screen (~30 min)** — Logistics, role mapping. The recruiter often probes financial-domain interest specifically.
- **DSA round (60 min)** — One or two medium DSA problems. Bar is solid but not the harshest in the Indian ecosystem; more emphasis on clean correctness than puzzle complexity.
- **LLD round (60-90 min)** — Object design with fintech flavor. Wallet system, transaction ledger, payment splitter, refund engine. Code quality and SOLID matter.
- **HLD round (60 min)** — System design with payments anchors. Idempotency, retries, exactly-once semantics, reconciliation, double-spending prevention.
- **Fintech depth / domain round (60 min)** — Senior+ specifically. Real fintech scenarios: how do you handle a partial payment failure mid-flow? what if the bank API times out after deducting? how do you reconcile a missing webhook?
- **Behavioral / Hiring Manager round (45-60 min)** — Ownership, on-call mindset, dealing with money-on-the-line incidents.
- **Bar raiser / culture round (occasional, 45 min)** — More common at senior+ levels.

## What's different here

- **Money correctness is the religion.** Razorpay rounds heavily probe idempotency, retries, eventual consistency vs strong consistency, and exactly-once semantics. Casual "we'll just retry" answers don't pass.
- **Reconciliation is a real topic.** Many HLD rounds explicitly test how you'd reconcile state between Razorpay and a bank / PSP when webhooks arrive out of order or get lost.
- **On-call mindset matters.** Fintech teams run hot — every reported senior loop includes some probe of how you'd debug a money-stuck scenario.
- **Regulatory awareness helps.** Knowing the rough shape of PCI-DSS, RBI guidelines for payment aggregators, and the difference between PA and PG flows pays off.
- **LLD is heavier than Swiggy/Zomato peers.** Reported feedback emphasizes object-modeling rigor more than at most Indian unicorns.

## Common question themes

- **DSA** — Arrays, hashmaps, trees, graphs, sliding window. Less puzzle-flavored.
- **LLD** — Wallet, ledger, transaction engine, refund flow, payment splitter, subscription engine.
- **HLD with payments anchors** — Payment gateway, double-entry ledger, reconciliation pipeline, retry / idempotency framework, dispute / chargeback handling.
- **Distributed correctness** — Idempotency keys, deduplication, retries with backoff, eventual consistency, saga patterns, two-phase coordination tradeoffs.
- **Behavioral** — Money-on-the-line incidents, debugging stuck payments, on-call ownership.

## Sample questions

(Generic forms — not actual interview questions.)

- LLD: design a wallet system with balance, transactions, holds, and refunds.
- LLD: design a double-entry ledger.
- LLD: design a subscription billing engine with prorations and dunning.
- HLD: design a payment gateway that handles 10K TPS with strict correctness.
- HLD: design a reconciliation pipeline between your platform and 5+ banks where webhooks may be out-of-order or duplicated.
- HLD: design a refund engine with partial refunds and SLA-based retries.
- "How do you handle a payment where the bank deducted money but the response never reached you?"
- "Walk me through how you'd debug a sudden 10x spike in failed payments."
- "Tell me about a time you fixed a correctness bug in production."

## How to prep

- **Internalize idempotency, retries, and reconciliation deeply.** Be able to explain idempotency keys, dedup windows, retry-with-backoff, and why exactly-once is a fiction (but how to approximate it) in your sleep.
- **Read 2-3 payment-system engineering blog posts.** Stripe's engineering blog, Razorpay's own tech blog, and any "how we built our ledger" post are great priors.
- **For LLD, drill ledger and wallet problems specifically.** These appear repeatedly.
- **For HLD, anchor every design in correctness.** Capacity matters, but Razorpay rounds reward "what happens when something fails partway" thinking even more.
- **Prepare on-call stories.** Times you debugged production money-stuck or data-loss-adjacent incidents.

## Recent vibe (2024-2026)

Razorpay's hiring has remained measured but consistent. The 2023-2024 fintech regulatory tightening (RBI's PA license freeze period) was visible in cautious hiring, but the company has resumed steady growth through 2025. The Capital and Banking arms have been hiring more aggressively than the core PG business. Bar emphasizes correctness and on-call thinking — multiple reports describe the fintech-depth round as the differentiator. Comp is competitive in the Indian fintech band; stock has a clearer near-term liquidity story than some peers.
