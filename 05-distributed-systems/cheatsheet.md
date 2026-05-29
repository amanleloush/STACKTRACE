---
title: Distributed systems — cheatsheet
---

# Distributed systems · Cheatsheet

> One-page recall for Distributed systems. Print, paste in Notion, glance before the system design interview.

## What this section covers
The theory floor of every distributed system interview: CAP/PACELC and consistency models, consensus protocols (Raft and Paxos), distributed transactions (2PC, Saga), rate limiting algorithms, circuit breakers and retry hygiene, service discovery, and clocks (Lamport, vector, hybrid logical).

## Key topics (the 5-minute recall)

### CAP / PACELC / consistency
- **CAP**: during a **network partition**, you must pick **C** (consistency = reject some requests) or **A** (availability = serve potentially stale). Partition isn't optional; it happens.
- **PACELC**: even when **not partitioned**, you trade **L** (latency) for **C** (consistency). Spanner = CP/EC, Dynamo = AP/EL, Cassandra = AP/EL (tunable).
- Consistency models (strong → weak):
  - **Linearizable**: looks like a single up-to-date copy; reads see most recent write.
  - **Sequential**: all clients see the same order, not necessarily real-time.
  - **Causal**: cause-effect preserved across clients; concurrent writes unordered.
  - **Eventual**: replicas converge given no new writes.
- **Read-your-writes**, **monotonic reads**, **monotonic writes** are session guarantees, not global ones.
- **In 10 seconds:** CAP is about partitions, PACELC is about everyday latency. Most systems pick AP/EL or CP/EC.

### Consensus — Raft & Paxos
- **Problem**: get N nodes to agree on a sequence of values despite crashes (not Byzantine).
- **Quorum**: need majority (`⌊N/2⌋ + 1`). N=3 → 2; N=5 → 3.
- **Raft** = leader-based, 3 roles (leader/candidate/follower), 3 RPCs (RequestVote, AppendEntries, InstallSnapshot). Designed to be understandable.
  - Term number monotonically increases; one leader per term.
  - Log replication: leader appends → replicates → commits when majority acks.
- **Paxos**: prepare / promise / accept / accepted. Multi-Paxos pins a leader to skip phase 1.
- **EPaxos** = leaderless, lower latency, more complex.
- Used in: etcd (Raft), Consul (Raft), ZooKeeper (ZAB, Paxos-like), CockroachDB (Raft), Spanner (Paxos).
- Throughput ceiling: one leader → ~10k-100k ops/sec; shard for scale.
- **In 10 seconds:** majority quorum, leader-based replication, term/epoch numbers — everything else is detail.

### Distributed transactions — 2PC vs Saga
| | 2PC | Saga |
|---|---|---|
| Coordinator | Yes, blocking | Optional, choreography or orchestration |
| Atomicity | Strict | Compensating actions |
| Blocking | Locks during prepare; coordinator failure stalls | Non-blocking |
| Latency | High (2 round-trips) | One per step |
| Common in | Databases, XA | Microservices |

- **2PC**: phase 1 prepare (vote), phase 2 commit/abort. Vulnerable to coordinator failure → uncertain state.
- **3PC** adds pre-commit but assumes synchronous network (rarely deployed).
- **Saga**: a sequence of local transactions; on failure, run **compensating actions** in reverse. Orchestration (one driver) vs choreography (events). Outbox pattern for reliability.
- Idempotency keys are mandatory for retries.
- **In 10 seconds:** prefer Saga + idempotency for microservices; 2PC only when you control all participants and tolerate locking.

### Rate limiting
| Algorithm | How it works | Burst | Memory | Notes |
|---|---|---|---|---|
| **Fixed window** | Counter resets every window | Up to 2× near boundary | O(1) | Simple, naive |
| **Sliding log** | Store each request timestamp | None | O(N) | Most accurate, costly |
| **Sliding window counter** | Weighted current + previous window | Smooth | O(1) | Practical default |
| **Token bucket** | Tokens refill at rate R, max B | Allows burst up to B | O(1) | Most popular |
| **Leaky bucket** | Output at fixed rate, drop overflow | None | O(B) | Smooths bursts |

- Distributed enforcement: per-node counter (loose), centralized (Redis INCR + TTL), gossip/sketches.
- Throttle at the edge (API gateway) is cheaper than at services.
- Return **429 Too Many Requests** + `Retry-After` header.
- **In 10 seconds:** token bucket in Redis covers 95% of needs. Use sliding window counter when accuracy matters.

### Circuit breakers & retries
- **Circuit breaker states**: Closed (normal) → Open (fail fast after N failures in window) → Half-open (probe). Hystrix popularized.
- Thresholds: failure rate > X% over Y seconds → open; cooldown 30–60s → half-open.
- Retry budget: limit retries to a fraction of normal traffic (e.g., 10%) to avoid retry storms.
- **Always exponential backoff + jitter**: `delay = min(cap, base × 2^attempt) × random(0, 1)`. Without jitter you get thundering herd.
- Idempotency required before any retry on writes.
- **Bulkhead**: isolate thread pools / connection pools per downstream so one slow dep doesn't sink the whole service.
- Timeouts: aggressive (< downstream P99 + buffer). Cascading timeouts: client > server > DB.
- **In 10 seconds:** breaker + bulkhead + exponential backoff with jitter + timeout < upstream timeout = service resilience.

### Service discovery
- **Client-side**: client gets list of backends and load-balances. Eureka, Consul DNS, K8s headless service.
- **Server-side**: client hits a fixed endpoint (LB/proxy), proxy resolves. AWS ALB, K8s Service, Envoy/Istio.
- Registry options: DNS (TTL-bound), Consul, etcd, ZooKeeper, K8s API.
- Health checks: TCP, HTTP, exec. Active polling vs passive (LB sees errors).
- Service mesh = sidecar (Envoy) per pod, control plane (Istio/Linkerd) pushes config. Adds mTLS, retries, observability uniformly.
- **In 10 seconds:** K8s service + DNS covers most needs; add a mesh when you need uniform mTLS/retries across many services.

### Clocks — vector / Lamport / HLC
- **Physical clocks drift** (~10s of ms per node, NTP keeps within a few ms; PTP within μs).
- **Lamport timestamp**: scalar counter, `max(local, recv) + 1` on receive. Gives **happens-before** ordering, no concurrent detection.
- **Vector clock**: one counter per node. `A < B` if every component of A ≤ B (with at least one <); else concurrent.
- **Version vector**: vector clock for storage (Dynamo-style). Concurrent writes = siblings → app resolves or LWW.
- **Hybrid Logical Clock (HLC)**: physical + logical; close to wall-clock but monotonic. Used in CockroachDB, MongoDB.
- **TrueTime** (Spanner): bounded-uncertainty clock from GPS + atomic; "commit wait" until interval passes.
- **In 10 seconds:** Lamport for ordering, vector for concurrency detection, HLC for "looks like wall-clock but reliable".

## Cheat numbers / formulas

- Quorum: N = 3 → 2, N = 5 → 3, N = 7 → 4. R + W > N → strong reads.
- Raft leader timeout: 150–300 ms (election timeout randomized 2×).
- NTP accuracy: ~1–10 ms typical, drift ~100 ppm if free-running (≈ 8 s/day).
- Retry: max 3 attempts, base 100 ms, cap 5 s, jitter ±50%.
- Circuit breaker open: 30–60 s cooldown before half-open probe.
- Token bucket: rate = sustained QPS, burst = rate × 1–5 s.
- Timeout cascade: leaf < intermediate < edge (e.g., DB 50 ms < service 200 ms < gateway 500 ms < client 1 s).
- SLA from quorum: surviving F failures needs **2F+1** nodes.

## Decision tree

- **Need strong global consistency?** Consensus (Raft/Paxos) → expect higher latency.
- **Need availability under partition?** AP system (Cassandra, Dynamo) with tunable quorum.
- **Multi-service transaction?** Saga + outbox; never 2PC across microservices.
- **Need to limit per-user QPS?** Token bucket in Redis at the API gateway.
- **Downstream flaky?** Circuit breaker + bulkhead + timeout shorter than caller's timeout.
- **Need exactly-once causal order?** Vector clocks or HLC; LWW only if you can lose data.
- **Service discovery in K8s?** Just use the Service / DNS; mesh if you need cross-cutting policy.
- **Time-based ordering across nodes?** HLC. Avoid wall-clock comparisons.

## Common pitfalls / "gotchas"

- "CAP says we picked AP" — but 99% of the time you're not partitioned; **PACELC's latency vs consistency tradeoff dominates daily life.**
- Retries without idempotency keys → duplicate writes.
- Retries without backoff/jitter → thundering herd; outage amplification.
- Timeouts longer than upstream → upstream gives up before you do → wasted work.
- Treating Saga compensations as transactional — they aren't; design for eventual consistency.
- Assuming NTP-synced clocks are reliable for ordering — use HLC or causal tokens.
- Quorum of 2-of-3 sounds redundant but a single AZ outage of 2 nodes loses quorum — spread across AZs/zones.
- Circuit breaker that never opens because threshold too lax → failures cascade.

## Related: see also
- [02 · Databases cheatsheet](../02-databases/cheatsheet.md) — replication, quorum reads/writes.
- [04 · Messaging cheatsheet](../04-messaging-kafka/cheatsheet.md) — outbox + Saga.
- [06 · HLD patterns cheatsheet](../06-hld-patterns/cheatsheet.md) — applying these to architecture.
- [09 · Production craft cheatsheet](../09-production-craft/cheatsheet.md) — mTLS / observability of these patterns.
