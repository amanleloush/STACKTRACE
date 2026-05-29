# 03 — Deep-dive pivots

> System design interview • Position 3/3

## What

A decision tree for the three most common deep-dive prompts a system design interviewer throws at you: **"what if scale 10×?", "what about consistency?", "what if a region fails?"** — plus eight more pivot prompts and the structured answer template for each. The goal is to never freeze when the interviewer changes the question.

## Why it matters

The deep-dive phase is where 25 of your 60 minutes live, and it's where the interviewer steers the conversation. They will *deliberately* pivot to see how you respond. A candidate who has a high-level diagram but no answers when asked "what happens when the primary database fails?" looks like someone who has read blog posts but never operated a system.

These pivots are also where seniority shows up most clearly. A junior candidate gives a single-sentence answer ("we'd add more replicas") and stops. A senior candidate walks through *what specifically breaks*, *what the recovery action is*, *what the trade-off cost is*, and *what they'd monitor to detect it*. Same prompt, completely different signal.

The good news is that pivots are predictable. There are maybe ten distinct ones; the interviewer will only fire 2-3 in your hour. If you've rehearsed structured answers for all ten, you'll always have something to say.

## How to do it

### The answer template

Any deep-dive prompt gets the same four-step structure:

1. **State what specifically would happen** — be concrete, not abstract.
2. **Propose the mitigation** — name the technique and component changes.
3. **Name the trade-off** — every fix has a cost (latency, money, complexity).
4. **Describe the signal** — what metric / alert tells you the mitigation worked or you need more.

### The decision tree

When the interviewer pivots, identify which family the pivot belongs to:

- **Scale pivots** ("10× users", "10× QPS", "10× storage") → think *bottleneck identification* + *horizontal scaling*.
- **Consistency pivots** ("read your writes", "strong consistency", "transactions across services") → think *consistency model trade-offs* + *isolation levels*.
- **Failure pivots** ("region down", "primary fails", "Kafka down", "cache down") → think *blast radius* + *recovery path* + *RPO/RTO*.
- **Cost pivots** ("too expensive", "cheaper storage", "fewer servers") → think *cold/warm/hot tiers* + *async batch* + *eviction*.
- **Operations pivots** ("how do you deploy?", "how do you debug?", "how do you migrate schema?") → think *blue-green* + *canary* + *observability* + *zero-downtime*.

## The three core pivots — answer scripts

### Pivot 1 — "What if scale goes 10×?"

The interviewer is testing whether you understand which component breaks first. Walk through the pipeline.

**Step 1 — find the bottleneck.** State which component saturates first. "If we go from 50K to 500K writes/sec, our single-leader Postgres saturates first because writes can't be sharded across replicas."

**Step 2 — name the technique.** "I'd shard by user_id across N partitions, using consistent hashing. Each shard has its own primary plus 2 replicas."

**Step 3 — name the trade-off.** "This kills cross-user transactions and makes schema migrations harder — they now run as N independent operations with coordination."

**Step 4 — describe the signal.** "I'd watch per-shard write latency p99 and partition hotness. If one shard absorbs > 30% of traffic I have a hot-key problem and need to subshard or split."

Then repeat the loop for the *next* bottleneck: cache, then network, then read path. The interviewer will stop you when satisfied.

### Pivot 2 — "What about consistency?"

The interviewer is testing whether you understand CAP/PACELC and pick the right consistency model per use case. Don't say "eventual consistency" reflexively.

**Step 1 — name the consistency model required, per data type.**

- "For tweet content: read-your-writes — a user must see their own post immediately. I'd use session stickiness or a write-then-read-from-primary pattern."
- "For follower counts: eventual consistency is fine — being off by a few for a few seconds is acceptable. We can show approximate counts."
- "For account balance: strong consistency, serializable transactions. Money loss is non-negotiable."

**Step 2 — name the technique per model.** Session stickiness, read-from-primary-after-write, conditional reads, Spanner-like distributed transactions, sagas with compensating actions, idempotency keys.

**Step 3 — trade-off.** Strong consistency costs latency (cross-region coordination, ~100ms RTT). Eventual costs correctness and complexity (anti-entropy, conflict resolution).

**Step 4 — signal.** "I'd track replication lag p99 and alert when it exceeds 1 second — that's when eventual-consistency UX starts feeling broken."

For deeper consistency-model background, see [05 · Distributed / CAP / PACELC](../../05-distributed-systems/22-cap-pacelc-consistency.md).

### Pivot 3 — "What if a region fails?"

The interviewer is testing whether you've thought about disaster recovery and what RPO/RTO you've committed to.

**Step 1 — name your topology.** "We're active-active across us-east and us-west. 50% of users home to each region by geographic affinity. Writes go to home region's primary; cross-region async replication."

**Step 2 — describe the failure.** "If us-east goes down, we lose ~50% of users immediately. Failover steps: DNS shifts traffic to us-west, which becomes write primary for affected users. Their session tokens re-validate against the new primary."

**Step 3 — RPO and RTO.** "RPO is ~5 seconds — that's the async replication lag at failover time, so up to 5 seconds of writes may be lost. RTO is ~2 minutes including DNS propagation. For higher SLAs we'd need synchronous replication, which costs us ~50ms write latency."

**Step 4 — signal.** "Cross-region replication lag alerts, region health probes from external monitoring, automated failover after 30 seconds of total region unreachability with manual override."

For deeper multi-region patterns, see [06 · HLD Patterns / Multi-region RPO/RTO](../../06-hld-patterns/32-multi-region-rpo-rto.md).

## Eight more pivots — short scripts

| Pivot | Structured response |
|---|---|
| **"What if the cache cluster fails?"** | Database absorbs ~30% extra load before saturating. Beyond that we serve stale (last-known-good) from a fallback tier, return 503 for non-critical reads, and rate-limit aggressively. Recovery: refill cache via gradual warmup, not all-at-once stampede. |
| **"What if a single hot key (e.g., celebrity) overwhelms a partition?"** | Detect via per-key QPS metric. Mitigate: subshard the hot key into N replicas with a randomized suffix; clients read from any. Or pull the hot key entirely into a separate dedicated cache. |
| **"Two writes happen at the same time — what wins?"** | Per use case: last-write-wins by HLC timestamp (simple, may lose updates), conditional updates / optimistic locking (returns conflict, client retries), or CRDT for true merge semantics (counters, sets). |
| **"How would you do a schema migration with zero downtime?"** | Expand-migrate-contract: add new column nullable, dual-write to old + new, backfill, switch reads, then drop old. Time horizon: weeks for large tables. |
| **"How do you prevent retries from creating duplicates?"** | Idempotency keys on the client side, deduplicated server-side by key+user. TTL on the dedup store, typically 24h. Combine with exactly-once *processing* semantics via offset commits when consuming events. |
| **"What if a downstream service is slow?"** | Circuit breaker opens after N consecutive failures or latency spike. Fallback to cached/default response. Bulkhead so the slow service doesn't drain the calling service's thread pool. Async with retries + dead-letter queue. |
| **"How do you handle GDPR / right to be forgotten?"** | Delete user record from primary store. Tombstone propagates via CDC to derived stores (search, analytics, cache). Background workers verify within SLA (e.g., 30 days). Audit log of deletion events for compliance. |
| **"How would you make this 10× cheaper?"** | Tier storage hot/warm/cold (S3 Glacier for cold). Move batch workloads to spot instances. Compress aggressively (LZ4 hot, Zstd cold). Reduce replica count where availability budget allows. Aggressive autoscaling at off-peak. |

## Concrete dialogue / example

**Interviewer** *(after you've sketched a Twitter HLD):* "OK, what if a celebrity has 100 million followers and posts during the Super Bowl?"

**You:** "Two problems: write fanout cost and read concentration.

Fanout: my current design fanouts-on-write to each follower's timeline. For a 100M-follower celebrity that's 100M writes for one post — way beyond what we can absorb in real time. Mitigation: I'd use a hybrid. Users below ~10K followers fanout-on-write as before; celebrities above that threshold are fanout-on-read — their posts live in their own outbox, and at read time the feed query merges follower-timeline + followed-celebrity-outboxes.

Read concentration: even with the hybrid, every viewer hits the celebrity's outbox during a Super Bowl spike. That's a hot partition. Mitigation: replicate the celebrity outbox to N read-replicas in cache (Redis with consistent hashing), and serve reads from any replica. We'd auto-detect the hot key via per-key QPS exceeding ~10K/sec and trigger the replication.

Trade-off: read latency goes up slightly on the merge step — we now hit one extra outbox lookup per celebrity followed. For users following thousands of celebs this could exceed our 200ms budget; we'd cap it at the top-100 followed celebs by recent interaction and treat the rest as standard fanout-on-write subscribers.

Signal: per-key QPS, p99 feed-read latency, replication lag of celebrity outboxes."

That's the answer structure: name the problem precisely, name the mitigation, name the trade-off, name the signal. Four sentences each. Repeat for as many pivots as the interviewer fires.

## Anti-patterns

- **One-liner answers.** "We'd add more replicas" is a junior answer. Walk through what saturates, what you'd change, the cost, and the signal.
- **Refusing to commit.** "It depends" without committing to a choice reads as evasive. Pick a model and justify it.
- **Cargo-culting fixes.** "I'd add Kafka" without naming what problem Kafka solves. Every component has a reason or it doesn't go in.
- **Ignoring the trade-off.** Every mitigation costs something. Naming the cost shows seniority; hiding it suggests you don't know it exists.
- **Going on for 4 minutes per pivot.** The interviewer has more pivots to fire. Keep each answer tight — 60-90 seconds — and let them ask follow-ups.

## Cheat-line

> **For any pivot, answer in four beats: what specifically breaks, what you'd change, what the trade-off costs, and what signal tells you it worked.** Sixty seconds per pivot — let the interviewer ask for more.
