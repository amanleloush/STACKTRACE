---
title: Messaging & Kafka — cheatsheet
---

# Messaging & Kafka · Cheatsheet

> One-page recall for Messaging. Print, paste in Notion, glance before the system design interview.

## What this section covers
Asynchronous messaging primitives: Kafka topics / partitions / consumer groups and the durability story; delivery semantics (at-most / at-least / exactly-once and why EOS is more nuanced than it sounds); change data capture (CDC) from databases into Kafka; and where Pulsar / RabbitMQ / SQS sit relative to Kafka.

## Key topics (the 5-minute recall)

### Kafka deep dive
- **Topic = ordered append-only log, split into N partitions. Partition = ordering + parallelism unit.**
- A producer's record goes to partition P = `hash(key) % N` (or round-robin if no key).
- A **consumer group** has at most one consumer per partition; partitions are distributed across consumers in the group.
- Brokers store partitions on disk (page cache + sequential I/O = very fast). Replication factor (RF) typically **3**, `min.insync.replicas = 2`.
- Leader / follower per partition; producer writes to leader, ISR (in-sync replicas) ack.
- **Offsets** are per-partition. Consumers commit offsets to `__consumer_offsets` topic (auto or manual).
- Retention: time-based (default 7d) or size-based; **compacted topics** keep only latest value per key (for upserts).
- Throughput: ~1M msgs/sec per broker on commodity hardware; tens of MB/s easily.
- KRaft replaces ZooKeeper for metadata (3.0+).
- **In 10 seconds:** ordering within a partition only; parallelism = number of partitions; durability = RF + ISR.

### Delivery semantics
| Semantic | Producer | Consumer | Cost |
|---|---|---|---|
| **At-most-once** | fire and forget | commit before processing | losses possible |
| **At-least-once** | retry on failure | commit after processing | duplicates → idempotent consumer |
| **Exactly-once (EOS)** | idempotent + txn producer | read-process-write in txn | ~10–20% throughput hit |

- "Exactly-once" in Kafka means: when producer + consumer + processor are all Kafka, you can do transactional read-process-write atomically. **Side effects to external systems break this** — you still need idempotency at the sink.
- Idempotent producer: producer ID + sequence number → broker dedupes retries.
- Transactional producer: atomic write across partitions; commit/abort markers.
- Consumer "exactly-once" via `read_committed` isolation level.
- **In 10 seconds:** default to at-least-once + idempotent consumer (dedupe key on the message); enable EOS only when both ends are Kafka.

### Change Data Capture (CDC)
- **CDC = stream the database's write-ahead log as events.** Captures inserts/updates/deletes without app-level wiring.
- Tools: **Debezium** (most common, plugs into Kafka Connect), Maxwell (MySQL), AWS DMS, Materialize.
- Source binlogs: MySQL binlog (ROW format), Postgres WAL via logical replication slot, Mongo oplog, SQL Server CDC tables.
- Schema evolution → Schema Registry (Avro/Protobuf/JSON Schema). Compatibility modes: backward (consumer-first), forward (producer-first), full.
- Use cases: cache invalidation, search indexing (DB→ES), data lake hydration, microservice integration.
- **Outbox pattern**: dual write problem solved by writing to a single DB outbox table; CDC ships it to Kafka. Atomic with the business write because it's the same transaction.
- Snapshot + streaming: initial snapshot of table → switch to log tail.
- **In 10 seconds:** CDC + outbox = the only correct way to dual-write to DB and Kafka.

### Pulsar / RabbitMQ / SQS comparison
| | Kafka | Pulsar | RabbitMQ | SQS |
|---|---|---|---|---|
| Model | Log / partitions | Log + tiered storage | Queue + exchange | Queue (FIFO opt.) |
| Ordering | Per-partition | Per-partition | FIFO queue / RK | Best-effort (FIFO: per group) |
| Throughput | ~1M msg/s/broker | similar | ~50k msg/s/node | ~3k msg/s/queue (FIFO 300/s) |
| Latency | ~5–10 ms | ~5 ms | ~1 ms | 10–100 ms |
| Retention | days/weeks | infinite (tiered) | until consumed | 14 days max |
| Delivery | at-least / EOS | at-least / EOS | at-least, acks | at-least; FIFO exactly-once dedupe |
| Strength | Throughput + replay | Multi-tenant + tiered storage | Routing flexibility | Zero-ops on AWS |
| Weakness | Op heavy, partitions immutable | Smaller community | Not a log, no replay | Cost, limits, no streaming |

- RabbitMQ exchanges: direct, fanout, topic, headers. Push model (consumer pulls less control).
- Pulsar separates compute (brokers) from storage (BookKeeper) — easier rebalancing.
- SQS standard = at-least-once + best-effort ordering; FIFO = exactly-once dedup window 5 min, 300 msg/s default.
- Kinesis ≈ Kafka-light on AWS: shards instead of partitions, 1MB/s in, 2MB/s out per shard, 24h retention default (up to 365d).
- **In 10 seconds:** Kafka when you want a replayable log; RabbitMQ when you want smart routing; SQS when you want zero ops.

## Cheat numbers / formulas

- Kafka broker: **~few thousand partitions per broker** practical limit (metadata overhead).
- Replication factor: **3**, `min.insync.replicas=2`, `acks=all` for durable producer.
- Consumer parallelism = `min(consumers, partitions)`. **Adding consumers beyond partition count = idle.**
- Default segment = 1 GB, log retention check = 5 min, retention = 7 days.
- Producer batching: `linger.ms=5–50`, `batch.size=64–256 KB` for throughput.
- Lag = log-end-offset − committed offset. Alert > some-business-defined threshold.
- Pulsar BookKeeper ensemble: write quorum Qw of Qa nodes; read quorum Qr.
- SQS visibility timeout default = 30 s; max = 12 h.
- Avro/Protobuf payload ~30–70% smaller than JSON.

## Decision tree

- **Need a durable event log, replayable, high throughput?** Kafka (or Pulsar).
- **Need flexible routing (fanout to many consumers by header/topic)?** RabbitMQ.
- **On AWS, low ops, modest throughput?** SQS (FIFO if you need ordering).
- **Streaming changes from DB → search/cache/lake?** Debezium + Kafka.
- **Atomic DB + event publish?** Outbox table + CDC; never dual-write.
- **Need exactly-once delivery to an external system?** Make the consumer **idempotent** (dedupe key) — EOS doesn't extend past Kafka.
- **Backpressure?** Kafka has none (consumer pulls); use lag monitoring + auto-scaling consumers.
- **Strict global ordering?** Use **one partition** (and accept the throughput ceiling) or order by key into the same partition.

## Common pitfalls / "gotchas"

- "Kafka has exactly-once" — only Kafka-to-Kafka, only with txn producer + read_committed. Side effects to APIs/DBs need idempotency at the sink.
- More partitions = always better — wrong. More partitions = more file handles, more rebalance time, more controller load.
- Adding consumers beyond partition count expecting parallelism — they sit idle.
- Forgetting that **rebalances pause the entire group** during partition reassignment; long-poll-style consumers and stop-the-world.
- Dual-write to DB and Kafka without outbox — one will fail and your state diverges.
- Treating retention as infinite — default is 7 days; compacted topics keep latest per key only.
- Letting consumer lag grow silently — set up lag alerts per group + topic.
- Using SQS for high throughput per queue — it's ~3k msg/s standard, 300/s FIFO. Shard or use Kinesis/Kafka.

## Related: see also
- [02 · Databases cheatsheet](../02-databases/cheatsheet.md) — CDC sources.
- [05 · Distributed cheatsheet](../05-distributed-systems/cheatsheet.md) — consensus underlies Kafka controller / Pulsar.
- [06 · HLD patterns cheatsheet](../06-hld-patterns/cheatsheet.md) — sync vs async vs event-driven.
- [10 · Modern additions cheatsheet](../10-modern-additions/cheatsheet.md) — stream processing (Flink, KStreams) on top of Kafka.
