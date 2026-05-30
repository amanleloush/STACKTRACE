---
title: HLD patterns — cheatsheet
---

# HLD patterns · Cheatsheet

> One-page recall for HLD patterns. Print, paste in Notion, glance before the system design interview.

## What this section covers
The architectural shapes you compose every system out of: microservices vs monolith, sync vs async vs event-driven communication, sharding strategies, multi-region with RPO/RTO budgets, schema evolution discipline, and the API gateway / BFF pattern at the edge.

## Key topics (the 5-minute recall)

### Microservices vs monolith
- **One-line definition.** Monolith = one deployable; microservices = many independently deployed services aligned to team boundaries.
- 

| | Monolith | Modular monolith | Microservices |
|---|---|---|---|
| Deploy | One unit | One unit, internal modules | Many units |
| Team coupling | High | Medium | Low |
| Latency | In-process (ns) | In-process (ns) | Network hops (1–10 ms each) |
| Data | One DB | One DB, schema by module | DB per service |
| Ops cost | Low | Low | High (mesh, tracing, CI/CD per service) |
| When right | <10 devs, MVP | 10–50 devs | 50+ devs, indep. release cadence |

- Start monolith, extract along team / scaling boundaries. "Microservices first" usually creates a distributed monolith.
- Each service owns its DB; no shared DB across services. Communicate via APIs or events.
- Service-per-team (Conway's law); avoid nano-services (1 endpoint, 1 service = ops tax).
- Distributed tracing becomes mandatory: trace ID propagation, span per service.
- **In 10 seconds:** microservices buy team autonomy at the cost of ops; only worth it past a team-size threshold.

### Sync / async / event-driven
- **One-line definition.** Three integration styles: request/response, fire-and-forget job, and pub/sub of immutable events.

| | Sync (req/resp) | Async (job queue) | Event-driven (pub/sub) |
|---|---|---|---|
| Coupling | Temporal + interface | Temporal decoupled | Both decoupled |
| Latency | ms | seconds–minutes | eventual |
| Consistency | Strong (if txn) | Eventual | Eventual |
| Backpressure | Hard (timeouts) | Queue depth | Consumer lag |
| Use when | User waits, low fanout | Long work, retries | Many consumers, audit, replay |

- **Orchestration vs choreography**: orchestration = one driver service; choreography = each service reacts to events. Choreography scales but obscures flow.
- **Outbox pattern**: write business row + outbox row in one DB transaction → CDC → Kafka. Solves dual-write atomicity.
- Sync chains of N services → P99 multiplies; aim for ≤ 2–3 hops per request.
- **In 10 seconds:** prefer async for anything that doesn't need a sync answer; user path stays sync but short.

### Sharding strategies

| Strategy | How | Pros | Cons |
|---|---|---|---|
| **Range** | by key range (e.g., `A–F`) | Cheap range scans | Hot spots on skewed keys |
| **Hash** | `hash(key) % N` | Even distribution | No range scans, resharding hard |
| **Consistent hash** | hash ring + virtual nodes (100–200 vnodes/node) | Minimal data movement on resize (≈ 1/N keys move) | Slight unevenness |
| **Directory** | lookup table → shard | Flexible rebalance | Extra hop, SPOF |
| **Geo** | by region | Locality, compliance | Cross-region queries hard |

- Choose shard key for: high cardinality, even access, locality of related data.
- Resharding playbook: double-write → backfill → cut-over reads → drop old. Or use directory layer to abstract it.
- Hot shards are the silent killer; monitor per-shard QPS / CPU. Threshold: any shard > 2× average → reshard.
- **In 10 seconds:** consistent hash on a high-cardinality key; pre-shard for 2–5× headroom.

### Multi-region — RPO / RTO
- **One-line definition.** RPO = max data loss tolerated; RTO = max time-to-recover tolerated. Both are budgets you spend on architecture.
- **RPO** ≈ replication lag at failover; **RTO** ≈ detect + drain + flip + warm-up time.
- Patterns:
  - **Active-passive (warm standby)**: async replicate; RPO seconds–minutes, RTO minutes.
  - **Active-active**: writes in both regions; needs conflict resolution (CRDTs, LWW, partition-by-region).
  - **Pilot light**: cold replica; RPO minutes, RTO hours.
- Cross-region RTT ~80 ms (US ↔ EU); sync replication kills user-facing latency.
- DNS TTL bounds DNS-failover RTO; anycast / global LB beats DNS for sub-minute RTO.
- **In 10 seconds:** sync = strong + slow; async = fast + lossy; partition-by-region = active-active without conflict resolution headache.

### Schema evolution
- **One-line definition.** Change schemas so old and new code coexist during deploy windows.
- **Backward compatible** (new reader, old writer): add optional fields, never remove/rename.
- **Forward compatible** (old reader, new writer): readers ignore unknown fields.
- Avro/Protobuf + Schema Registry enforce compatibility on publish.
- Migration playbook (expand → migrate → contract):
  1. Add new field (optional/nullable).
  2. Dual-write old + new.
  3. Backfill historical data.
  4. Switch reads to new.
  5. Stop writing old.
  6. Drop old after deprecation window (1+ release).
- DB schema: add column nullable → backfill → add NOT NULL → add constraint. Never `ALTER` a hot column without `gh-ost` / `pt-online-schema-change`.
- API versioning: URI (`/v2/...`), header (`Accept-Version`), or evolve in place with optional fields.
- **In 10 seconds:** add before remove, optional first, dual-write through the transition.

### API gateway & BFF
- **One-line definition.** Gateway = single edge entry (north-south); BFF = per-client gateway shaping responses for mobile/web/IoT.
- Gateway concerns: TLS termination, mTLS to backends, JWT/OIDC validation, rate limit, IP allow/deny, request logging, request transformation. Examples: Kong, Apigee, AWS API Gateway, Envoy.
- BFF concerns: response aggregation, field shaping per client, client-specific auth flows.
- Beware: gateway becoming god-class. Keep business logic out.
- Gateway = north-south (external→internal); service mesh = east-west (service-to-service).
- Typical gateway latency overhead: 5–20 ms per hop.
- **In 10 seconds:** gateway at the edge for auth/rate-limit; BFF per client when shapes diverge.

## Cheat numbers / formulas

- Sync chain latency: P99_total ≈ Σ P99_each (budget per hop; 5 hops × 50 ms = 250 ms).
- Two-pizza team owns 1–3 services (5–8 engineers).
- Active-passive: RPO ≈ replication lag (seconds), RTO ≈ minutes with automation.
- Async cross-region replication lag: 100 ms – several seconds typical.
- Hot shard threshold: any shard > 2× average load → reshard.
- API gateway latency overhead: 5–20 ms per hop.
- DNS-based regional failover bounded by lowest client TTL: 60 s – 5 min.
- Consistent hashing key movement on add/remove of 1 node: ≈ 1/N of keys.

## Decision tree

- **Team < 10 engineers, single product?** Monolith. Modularize internally.
- **Team > 50, independent release cadence?** Microservices, one DB per service.
- **User waiting for a response?** Sync (REST/gRPC). Keep chain ≤ 3 hops.
- **Background work, retries, fanout?** Async via queue.
- **Many consumers, replay needed?** Event-driven (Kafka topic).
- **Data outgrew one box?** Shard by high-cardinality key; consistent hash default.
- **Need < 5 min RPO, < 5 min RTO globally?** Active-active partitioned by region.
- **Need < 1 s RTO?** Active-active or anycast LB; DNS won't get you there.
- **Changing API shape?** Add optional field → dual-write → migrate → drop. Never rename in place.
- **Many clients with different shapes?** BFF per client; share core services beneath.

## Common pitfalls / "gotchas"

- Going microservices before there's an organizational reason. Distributed monolith is worse than a monolith.
- Sharing a database across "services" — they're not services any more.
- Sync call chains of 5+ services — P99 becomes a horror show.
- "Active-active" without thinking about conflict resolution — you've built two divergent systems.
- Renaming a column in place — old reader breaks at deploy.
- Putting business logic in the API gateway — when you replace it, everything breaks.
- Forgetting that **DNS failover RTO is bounded by client TTL caches** (browsers, JVMs, ISPs).
- Sharding too late: by the time you need it, the hot table is too big to copy easily.

## Related: see also
- [02 · Databases cheatsheet](../02-databases/cheatsheet.md) — sharding mechanics at the storage layer.
- [04 · Messaging cheatsheet](../04-messaging-kafka/cheatsheet.md) — event-driven backbone, outbox.
- [05 · Distributed cheatsheet](../05-distributed-systems/cheatsheet.md) — consistency / consensus.
- [07 · HLD problems cheatsheet](../07-hld-problems/cheatsheet.md) — patterns applied to specific designs.
