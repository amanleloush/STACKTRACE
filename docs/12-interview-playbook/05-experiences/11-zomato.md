# Zomato

> Experiences • Position 11/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> 4-5 rounds (DSA, LLD, HLD, behavioral)</span>
  <span><strong>Total time</strong> ~5-7 hours across 1-2 weeks</span>
  <span><strong>Style</strong> Discovery / search / catalog flavor, restaurant-domain depth</span>
  <span><strong>Difficulty</strong> Medium-Hard — varies sharply across Food, Blinkit, Hyperpure</span>
</div>

## The loop

A typical Zomato SDE / Senior loop. Variants across Food Delivery, Blinkit (quick commerce), Hyperpure (B2B supply), and Platform.

- **Recruiter screen (~30 min)** — Logistics, role / team mapping. Zomato is org-structured; the loop differs noticeably between the four major orgs above.
- **DSA round (60 min)** — One or two medium problems. Bar is solid; in the same band as Swiggy, generally lighter than Meesho or Flipkart on coding.
- **LLD round (60-75 min)** — Object design with discovery / catalog / ordering flavor. Restaurant listing, search ranking, cart, offer engine.
- **HLD round (60 min)** — System design at scale. Restaurant search and ranking, order pipeline, real-time inventory (for Blinkit), recommendation feed, photos / content pipeline.
- **Behavioral / Hiring Manager round (45-60 min)** — Ownership, product mindset, working with ops and supply teams.
- **Bar raiser / Skip-level (occasional)** — More common at senior+ levels.

## What's different here

- **Discovery and search are the centerpiece.** Restaurant browsing, search, ranking, and recommendation feed come up more here than at Swiggy. The "what should I eat" problem is genuinely hard, and Zomato interviewers know it.
- **Restaurant-domain depth matters.** Knowing the rough shape of restaurant onboarding, menu management, photos pipeline, ratings, and offer engines pays off. Domain interviewers reward this.
- **Blinkit has a quick-commerce shape.** If interviewing for Blinkit, expect Instamart-like problems — dark stores, hyperlocal inventory, sub-15-minute delivery. The HLD round will go heavy on this.
- **Content / UGC themes appear.** Photos, reviews, ratings — Zomato has a real content-platform side that Swiggy doesn't lean on as much. Don't be surprised by content-moderation or ranking questions.
- **Product-engineering vibe.** Reported feedback often describes the behavioral and HM rounds as more product-oriented — they want engineers who think about user experience, not just systems.

## Common question themes

- **DSA** — Arrays, hashmaps, trees, graphs, sliding window, intervals. Medium-leaning.
- **LLD** — Restaurant listing / browse, search ranking, cart with offers, ratings system.
- **HLD** — Search and discovery at scale, order pipeline, real-time inventory (Blinkit), photos pipeline, recommendation feed, offer / promo engine.
- **Search / ranking** — Inverted index basics, ranking signals, A/B framework, freshness vs popularity tradeoffs.
- **Behavioral** — Ownership, product thinking, working with non-engineering teams.

## Sample questions

(Generic forms — not actual interview questions.)

- LLD: design a restaurant browse + filter system with cuisine, distance, rating, price filters.
- LLD: design a cart with multi-offer composition and stacking rules.
- LLD: design a ratings system with averages, breakdowns, and abuse-flagging.
- HLD: design restaurant search and discovery at scale (city-level, near-real-time updates).
- HLD: design the order pipeline for food delivery (browse → cart → checkout → fulfillment → tracking).
- HLD: design real-time inventory for Blinkit — dark stores, SKU-level availability, sub-second updates.
- HLD: design a photos / content pipeline (upload → moderation → indexing → serving).
- HLD: design a recommendation feed for restaurant discovery.
- "Tell me about a feature you built where you pushed back on the PM." / "How do you think about ranking tradeoffs?"

## How to prep

- **Drill search / discovery / ranking problems.** Read 1-2 search-engine engineering blogs, refresh inverted index basics, understand ranking signals (freshness, popularity, personalization, geo).
- **For LLD, focus on browse / filter / cart shapes.** Practice 3-4 multi-class designs in this domain.
- **For HLD, separate Food vs Blinkit shapes in your head.** Food delivery and quick commerce have meaningfully different architectures.
- **Have product-thinking stories.** Times you made user-facing decisions, pushed back on requirements, or shipped something based on user research.
- **Get rough numbers anchored.** Zomato food delivery sees city-level scale with meal-time spikes; Blinkit has different traffic shapes. HLD answers benefit from realistic capacity.

## Recent vibe (2024-2026)

Zomato (and now Eternal as the parent rebrand of late 2024 / 2025) has continued to hire steadily, with the Blinkit org being the most aggressive recruiter. The IPO and post-IPO performance have made compensation discussions more legible. The bar has stayed stable; reported loops describe consistent depth on search / discovery and on real-time problems for Blinkit. Engineering culture has matured noticeably post-2022 — more design-doc / RFC orientation than in earlier years.
