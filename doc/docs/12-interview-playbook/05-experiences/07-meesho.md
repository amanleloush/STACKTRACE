# Meesho

> Experiences • Position 7/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> 5-6 rounds (DSA, LLD, HLD, behavioral, hiring manager)</span>
  <span><strong>Total time</strong> ~6-8 hours across 1-2 weeks</span>
  <span><strong>Style</strong> Sharp DSA bar, scale-grounded HLD, commerce flavor</span>
  <span><strong>Difficulty</strong> Hard — DSA bar is closer to FAANG than to most Indian peers</span>
</div>

## The loop

A typical Meesho SDE loop. Variants exist across SDE / SDE-II / Senior / Staff and across orgs (Catalog, Supply, Logistics, Payments, Platform).

- **Recruiter screen (~30 min)** — Logistics, role-fit, team mapping. Meesho is org-led — the recruiter often places you against a specific team's open req.
- **DSA round 1 (60 min)** — One or two medium-hard DSA problems. Bar is sharp; Meesho is one of the few Indian companies routinely benchmarked against FAANG on coding.
- **DSA round 2 (60 min)** — Second DSA, often slightly harder or with a twist. Sometimes a senior interviewer probes complexity reasoning explicitly.
- **LLD / Machine Coding round (60-90 min)** — Object design problem (parking, splitwise, catalog system). Some teams do a longer machine-coding session with running tests.
- **HLD / System Design round (60 min)** — Senior+. Commerce / India-scale flavor. Catalog search, order pipeline, supplier dashboard, payment reconciliation — anchored to actual Meesho-shaped problems.
- **Behavioral / Hiring Manager round (45-60 min)** — Ownership, scope, India-scale problem solving, working in fast-paced startups.
- **Bar Raiser / Skip-level (occasional, 45 min)** — More common at senior+ levels. Mix of cultural and technical depth.

## What's different here

- **DSA bar is FAANG-adjacent.** Reports consistently describe Meesho's coding bar as harder than most Indian peers and comparable to mid-tier FAANG. Don't show up under-prepped on DSA.
- **India-scale numbers are real.** Meesho's traffic profile (300M+ MAU, festive-spike traffic, suppliers across tier-2/3 India, low-cost users on poor connectivity) shows up in HLD problems. Design assumptions need to reflect this.
- **Commerce vocabulary helps.** Knowing the rough shape of catalog, cart, order, payment, shipping, returns, and supplier flows pays off in HLD rounds. You don't need to be an e-commerce veteran, but blank stares at the word "PIM" or "OMS" hurt.
- **Fast-paced engineering culture.** Interviewers probe how you operate without heavy process. Stories about shipping fast, owning ambiguity, and recovering from mistakes land well.
- **Org-led structure.** Different teams (Catalog, Supply, Logistics, Ads, Platform) have visible cultural and technical differences in interviews. The recruiter map matters.

## Common question themes

- **DSA** — Arrays, hashmaps, trees, graphs, sliding window, DP. Less puzzle-flavored than Meta, more "solve this clean and explain why."
- **LLD** — Catalog browser, supplier-onboarding flow, cart/checkout, ride/delivery matcher, splitwise variants.
- **HLD** — Catalog search, order pipeline, payment reconciliation, notifications, ranking, analytics ingestion. Always anchored to scale.
- **India-scale specifics** — Festive traffic spike, low-bandwidth users, COD reconciliation, multi-language, regional sharding.
- **Behavioral** — Ownership, fast decisions, failure recovery, working across teams in a flat org.

## Sample questions

(Generic forms — not actual interview questions.)

- LRU / LFU cache. Top-k variants. Sliding window max.
- Graph problems: shortest path on a grid, topological sort variants.
- DP: longest common subsequence variants, partition problems.
- Design a catalog browse + search system at 300M MAU scale.
- Design an order pipeline (cart → checkout → fulfillment) with idempotency.
- Design a payment reconciliation system for COD and prepaid orders.
- Design a notification system handling festive-day spike traffic.
- LLD: design a supplier onboarding flow with multiple status transitions.
- "Tell me about a time you shipped under heavy ambiguity." / "How would you debug a sudden 3x latency spike at festive peak?"

## How to prep

- **Drill DSA as if you're prepping for Google.** Strong medium fluency + a few hards in graphs / DP. Don't treat Meesho as a soft target on coding.
- **For LLD, practice 3-4 designs aloud.** Be able to name classes, responsibilities, and interfaces fluently in 45-60 minutes.
- **For HLD, internalize India-scale defaults.** When asked for capacity numbers, default to "300M+ users, festive spike of 5-10x average load, 70%+ traffic from tier-2/3 with poor connectivity."
- **Know the commerce domain shape.** Catalog → cart → order → payment → fulfillment → returns. Read 1-2 engineering blog posts about each.
- **Prepare ownership-flavored STAR stories.** Meesho rewards engineers who decide and ship.

## Recent vibe (2024-2026)

Meesho's hiring has remained active through the post-2023 funding environment, with sharp selectivity at senior+ levels. The DSA bar has not softened — multiple reports describe the coding rounds as the hardest in the Indian startup ecosystem. Engineering org has been expanding in Platform, ML/Ranking, and Ads. Compensation has stayed competitive with Indian FAANG offices for senior IC roles. Stock component matters in negotiation.
