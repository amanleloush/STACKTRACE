# Swiggy

> Experiences • Position 10/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> 4-5 rounds (DSA, LLD, HLD, behavioral)</span>
  <span><strong>Total time</strong> ~5-7 hours across 1-2 weeks</span>
  <span><strong>Style</strong> Real-time / maps / scheduling flavor, scale-anchored</span>
  <span><strong>Difficulty</strong> Medium-Hard — domain depth differentiates senior loops</span>
</div>

## The loop

A typical Swiggy SDE / Senior loop. Variants across Food, Instamart (quick commerce), Dineout, and Platform.

- **Recruiter screen (~30 min)** — Logistics, role / team mapping. Swiggy is org-structured; the recruiter often places you against a specific vertical's open req.
- **DSA round (60 min)** — One or two medium problems. Bar is solid; not the harshest in the Indian ecosystem but real.
- **LLD round (60-75 min)** — Object design, often with real-time / scheduling flavor. Order matcher, delivery dispatcher, restaurant menu system, cart with offers.
- **HLD round (60 min)** — System design at scale. Order pipeline, dispatch algorithm, ETA prediction, surge pricing, real-time restaurant inventory. Map / geo and real-time themes recur.
- **Behavioral / Hiring Manager round (45-60 min)** — Ownership, on-call mindset, working with operations and supply teams.
- **Bar raiser / Skip-level (occasional)** — More common at senior+ levels.

## What's different here

- **Real-time / geo problems dominate HLD.** Dispatching delivery partners, ETA prediction, restaurant availability, surge zones — these come up far more than at non-logistics peers.
- **Scheduling and matching problems are common.** Order-to-partner matching is a richer problem space than candidates often expect. Bipartite matching, greedy heuristics, and ML-assisted ranking all surface.
- **Operations awareness helps.** Knowing how dark stores, cloud kitchens, and last-mile logistics work pays off in HLD. Even rough knowledge of "what happens when a delivery partner cancels mid-pickup" lands.
- **Quick commerce (Instamart) has a different shape.** Sub-15-minute delivery changes everything — dark store inventory, hyperlocal SKU availability, micro-fulfillment. Worth knowing if interviewing for that org.
- **Less LLD intensity than Flipkart/Razorpay.** Reported feedback describes LLD as solid but not the centerpiece of the loop.

## Common question themes

- **DSA** — Arrays, hashmaps, trees, graphs, sliding window, intervals. Some emphasis on graph / map problems.
- **LLD** — Order matcher, delivery dispatch, restaurant menu, cart with discounts.
- **HLD** — Order pipeline, dispatch algorithm, ETA prediction, surge pricing, real-time geo queries, hyperlocal inventory.
- **Real-time / streaming** — Event-driven order state machine, real-time partner location, push notifications.
- **Behavioral** — Ownership, working in fast-paced ops-heavy environments, on-call debugging.

## Sample questions

(Generic forms — not actual interview questions.)

- LLD: design an order-to-delivery-partner matcher with priority and constraints.
- LLD: design a restaurant menu system with availability windows and out-of-stock states.
- HLD: design the food order pipeline (browse → cart → checkout → dispatch → tracking).
- HLD: design ETA prediction at scale — what features, what data, what serving stack.
- HLD: design surge pricing with regional zones and real-time signals.
- HLD: design real-time hyperlocal inventory for quick commerce — dark stores, SKU availability, near-instant updates.
- DSA: graph problems — shortest path on a city grid, k-nearest delivery partners.
- "Tell me about a time you handled a production incident under time pressure." / "How do you balance ops needs vs engineering priorities?"

## How to prep

- **Drill graph / geo problems specifically.** Shortest path, k-nearest, bipartite matching basics. These show up disproportionately.
- **For LLD, focus on real-time / state-machine flavor.** Order states, delivery partner states, scheduling constraints.
- **For HLD, internalize dispatch / matching / ETA shapes.** Read Swiggy's tech blog and 1-2 Uber engineering posts for priors.
- **Get rough numbers in your head.** Daily orders, dispatcher TPS, peak meal-time spike (~3-5x baseline). HLD answers benefit from anchored scale.
- **Operations-flavored behavioral stories.** Times you worked with non-engineering teams, handled on-call, or untangled a production mess that touched real users.

## Recent vibe (2024-2026)

Swiggy went public in late 2024, which has visibly shifted hiring tone — more measured, more focused on profitability, but continued investment in Instamart (quick commerce) and core platform. The bar has held steady; reported loops describe consistent depth on real-time and dispatch topics. Engineering org has been hiring in Platform, ML/Personalization, and Instamart specifically. Comp is competitive in the Indian unicorn band; the post-IPO stock story is now more legible than the pre-IPO ESOP picture.
