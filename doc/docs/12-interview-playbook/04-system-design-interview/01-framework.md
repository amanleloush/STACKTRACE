# 01 — The 5-phase framework

> System design interview • Position 1/3

## What

A five-phase script for any 60-minute system design round: **Requirements → Capacity / Back-of-Envelope → High-Level Design → Deep-Dive → Trade-offs & Failures**, each with a minute budget. The phases run in order and don't overlap; you drive transitions explicitly so the interviewer knows where you are.

## Why it matters

System design rounds are open-ended on purpose. The interviewer is measuring whether you can take a vague problem ("design Instagram") and produce a structured, defensible architecture without flailing. Most candidates fail because they jump to drawing boxes before they understand the problem — five minutes in they're talking about Cassandra vs DynamoDB without having defined what's being stored, how much, or who reads it.

The framework eliminates the freeze. Each phase has a clear deliverable, so you always know what you should be doing right now: "I'm in phase 1, the deliverable is a list of functional and non-functional requirements on the whiteboard." If you finish a phase early, you move on. If you're stuck mid-phase, you have a small problem to solve, not an existential one.

It also paces the interviewer. They have a rubric with rows for "requirements gathering", "capacity estimation", "high-level design", "deep dive", and "trade-offs". A candidate who explicitly hits each phase fills the rubric naturally. A candidate who only draws diagrams misses three rows.

## How to do it

The 60-minute budget (allow some slack for chitchat at start/end — call it 55 minutes of real work):

| Phase | Time | Deliverable |
|---|---|---|
| **1. Requirements** | 5 min | Functional + non-functional list on whiteboard. Confirmed with interviewer. |
| **2. Capacity / BoE** | 5 min | QPS, storage, bandwidth numbers — read vs write, peak vs avg. |
| **3. High-Level Design** | 15 min | 5-8 box diagram. Client → API → service → store. Data flow arrows. |
| **4. Deep-Dive** | 25 min | One or two components in detail — schema, partition key, replication, cache, failure modes. |
| **5. Trade-offs & Failures** | 10 min | What you'd change if requirements changed. What fails and how you recover. |

These budgets are soft. A senior interviewer will push you deeper on phase 4; an interviewer who wants breadth will keep returning you to the high-level. Read their signals.

**Phase 1 — Requirements (5 min).** Start with: "Let me first clarify what we're building." Then split into two sub-lists:

- **Functional:** What can users do? "Users can post photos. Followers see them in a feed. Users can like and comment."
- **Non-functional:** Scale, latency, consistency, availability. "100M DAU, 500M MAU. Feed reads must be < 200ms p99. Eventual consistency on likes is fine; post visibility should be read-your-writes."

Write both lists on the corner of the board. The non-functional list determines almost every architectural choice — read-heavy vs write-heavy decides caching strategy, consistency requirement decides whether you can use SQL+replication or need Spanner-like systems.

**Phase 2 — Capacity (5 min).** Do back-of-envelope math out loud:

- DAU × actions per user → QPS
- Items × size per item → storage
- QPS × payload size → bandwidth
- Apply peak factor (3-5×)

"100M DAU posting once a day average means ~1100 posts/sec average, ~5K/sec peak. Each post with metadata is ~1KB, plus a photo averaging 500KB. So 500MB/sec of media upload at peak — about 40TB/day."

Don't agonize over the exact numbers. The interviewer wants to see that you can produce *order-of-magnitude* estimates and that they drive your design decisions. (See [02 — back-of-envelope](02-back-of-envelope.md) for the cheat-sheet numbers.)

**Phase 3 — High-Level Design (15 min).** Draw 5-8 boxes left-to-right or top-to-bottom. Start with the simplest possible architecture and *add components only when capacity numbers require them*:

- Client → CDN (if static heavy)
- → Load balancer
- → API gateway (auth, rate limit)
- → Application service(s)
- → Cache (Redis) — if read-heavy
- → Primary database (with replicas if reads scale)
- → Object store (for media)
- → Async pipeline (Kafka → workers) — for fanout, processing

Draw arrows. Label them with the request type ("write post", "read feed"). Resist the temptation to fill in every detail; the goal is a shared mental model with the interviewer.

**Phase 4 — Deep-Dive (25 min).** The interviewer picks a component, or you propose: "Want me to go deeper on the feed read path?" This phase is where you earn or lose the role. Be concrete:

- **Data model** with primary keys and partition keys.
- **Sharding strategy** — by what attribute, why.
- **Replication topology** — primary/replica, multi-region, leader election.
- **Consistency model** — strong, eventual, read-your-writes, with justification.
- **Caching** — what's cached, what key, TTL, eviction, stampede protection.
- **Failure modes** — what happens if the cache misses, the primary fails, a region partitions.

State concrete technologies but be ready to justify: "I'd use Cassandra for the feed timeline because writes are heavy and partition-by-user-id gives me predictable performance. If I needed stronger consistency I'd consider Spanner instead."

**Phase 5 — Trade-offs & Failures (10 min).** Volunteer two or three trade-offs you considered and rejected, and one or two failure scenarios:

- "I picked eventual consistency for likes. If we needed exact counts for billing, I'd switch to a SQL store with serializable transactions, accepting lower throughput."
- "If the cache cluster fails, the database can absorb ~30% of read load before saturating — beyond that we degrade gracefully by serving stale feeds from a second cache tier."

This phase signals seniority more than any other. Anyone can draw boxes; senior engineers articulate what would break, what they'd change, and why.

## Concrete dialogue / example

**Interviewer:** "Design Twitter."

**You:** *(phase 1)* "Let me clarify what we're building. Functional: users post short text messages, follow other users, see a home timeline of posts from people they follow, and like posts. Should I also include search, DMs, or trending?"

**Interviewer:** "Just feed, post, follow, like for now."

**You:** "Got it. Non-functional — what scale are we targeting?"

**Interviewer:** "500 million daily active users."

**You:** "And feed-read latency budget?"

**Interviewer:** "Sub-200ms p99 for the home timeline."

**You:** *(writes on board)*

```
Functional:           Non-functional:
- post tweet          - 500M DAU
- follow user         - read-heavy: ~100:1 read:write
- view home timeline  - feed p99 < 200ms
- like tweet          - eventual consistency on likes OK
                      - posts read-your-writes
```

*(phase 2)* "Let me do the math. 500M DAU posting say twice a day → 1B writes/day → ~12K writes/sec average, ~50K peak. Reads are 100× so ~5M reads/sec peak. Each tweet is ~300 bytes; 1B/day × 365 × 300 bytes ≈ 100TB/year of tweet data. That's the rough envelope."

*(phase 3, draws diagram with client, CDN, LB, API gateway, tweet-service, timeline-service, Cassandra, Redis cache, Kafka for fanout)*

*(phase 4)* "Let me go deep on the timeline. Two main strategies: fanout-on-write — when you post, we push to every follower's timeline; or fanout-on-read — when you view, we query and merge. Fanout-on-write is great for read latency but expensive for celebrities with 100M followers. So I'd hybrid: fanout-on-write for users with < 10K followers, fanout-on-read for celebrities. Timeline stored in Cassandra partitioned by user_id…"

Notice the cadence: clarify → math → architecture → one deep dive → planned trade-offs. The interviewer always knows where in the framework you are.

## Anti-patterns

- **Drawing boxes before clarifying requirements.** You'll spend 20 minutes on a system that solves the wrong problem.
- **Skipping back-of-envelope math.** Every architectural choice should be justified by a number. "We need sharding" without a TB number is hand-waving.
- **Going broad instead of deep.** When the interviewer says "tell me more about X", they mean *go deep*. Don't keep zooming back out.
- **Using buzzwords without justification.** "I'd use Kubernetes and Kafka and gRPC and Redis" — without a reason — reads as cargo-culting. Pick technologies *because of* the requirements.
- **Refusing to acknowledge trade-offs.** Every design has them. Pretending yours doesn't reads as junior.

## Cheat-line

> **Always run the phases in order — requirements, capacity, HLD, deep-dive, trade-offs.** Never draw a box until you've written numbers next to a non-functional requirement that the box exists to satisfy.
