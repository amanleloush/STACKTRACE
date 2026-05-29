---
title: HLD problems — cheatsheet
---

# HLD problems · Cheatsheet

> One-page recall for the canonical HLD interview problems. Print, paste in Notion, glance before the system design interview.

## What this section covers
The fifteen classic HLD problems and the single design lever you must mention for each. Less about full architecture, more about "what's the one thing they're testing?" — the core data model decision, the read/write skew, the critical scaling lever, and the must-mention edge case.

## The 15-problem matrix

| Problem | Core data model decision | Read / write skew | Critical scaling lever | Must-mention edge case |
|---|---|---|---|---|
| **URL shortener** | KV: `short_id → long_url` (Redis + persisted KV). ID = base62 of 7 chars → 62⁷ ≈ 3.5 trillion. | Read-heavy ≈ 100:1. | Cache hot links (Redis LRU); CDN-front the redirect. | Custom aliases collision + bot/expiry/abuse. |
| **Rate limiter** | Per-key counter + window. Algorithms: fixed/sliding window, leaky bucket, token bucket. | Write-dominated (every request). | Distributed counter in Redis (`INCR` + `EXPIRE`); lua script for atomicity. | Clock skew across nodes; allow burst with token bucket. |
| **News feed** | Push-on-write (fanout-on-write) vs pull-on-read vs hybrid. Per-user timeline list in Redis. | Read-heavy; celebrity write fanout is huge. | Hybrid fanout: push for normal users, pull for celebs (> 10k followers). | Celebrity fanout amplification; ranking freshness. |
| **Chat system** | Conversation → messages list; per-user inbox; presence in Redis. WebSockets for delivery. | Read+write balanced; bursty. | Connection sharding by user_id; Kafka for delivery fanout; message store in Cassandra. | Offline delivery + read receipts + ordering across devices. |
| **Notifications** | Multi-channel: push (APNs/FCM), email, SMS, in-app. Fanout via Kafka topic per channel. | Write-spiky (campaigns). | Per-channel queue, per-user dedupe, priority lane. | Dedup window + user prefs + quiet hours + retry storms. |
| **Autocomplete** | Trie indexed offline; serve top-k per prefix from in-memory map. | Read-heavy, latency-critical (< 50 ms). | Precomputed top-k per prefix; sharded by prefix; client-side debounce. | Personalization + fresh trends + typo tolerance. |
| **Distributed cache** | Consistent hash ring of nodes; key → node. TTL + LRU eviction. | Read-heavy ≈ 80:20+. | Replication factor 2–3; client-side hashing; gossip for membership. | Thundering herd on key expiry → request coalescing / lock. |
| **Distributed file storage** | Object store: chunks of 4–64 MB; metadata DB (filename → chunk locations). | Write-once, read-many. | Erasure coding (e.g., 10+4 Reed-Solomon) vs 3× replication; rebalancer. | Small-file problem; metadata DB scaling; consistency on rename. |
| **Payment system** | Double-entry ledger (debit + credit rows, atomic). Idempotency key per request. | Write-critical; correctness > latency. | Sharding by account_id; saga for cross-account txn; outbox for events. | Idempotency on retry; exactly-once posting; reconciliation. |
| **Flash sale / inventory** | Reservation table with TTL; counter in Redis with atomic decrement (`DECR`); persist async. | Massive write spike on launch. | Pre-warm caches; per-SKU sharding; queue-based admission control. | Overselling on race; bot abuse; oversold rollback. |
| **Video streaming** | Encode → multi-bitrate (ABR) segments (HLS/DASH); CDN-distributed; metadata DB. | Read-dominated; bandwidth-bound. | CDN + edge caching; tiered storage (hot/warm/cold); P2P assist for live. | Live vs VOD pipelines; DRM; geo-restriction. |
| **Ride-sharing** | Geo-index of drivers (geohash / S2 cell / quadtree); trip state machine in DB. | Bursty write on dispatch; read-heavy on location. | Geo-shard by city; in-memory grid for nearby search; Kafka for driver pings. | Driver-rider race on accept; surge pricing; cross-cell matching. |
| **Web crawler** | Frontier = priority queue of URLs; seen-set (Bloom filter); content store. | Write-heavy network-bound. | Politeness (per-host queue, robots.txt); distributed frontier sharded by hostname. | Crawler traps + duplicate detection (URL canonicalization + content hash). |
| **Ad click tracking** | Append-only event log (Kafka); aggregations in OLAP (Druid/Pinot/ClickHouse). | Write-heavy, eventual reads. | Stream aggregation by ad_id/window; cold path for billing reconciliation. | Click fraud detection; exactly-once for billing; late events. |
| **Job scheduler** | Job queue + scheduler that picks ready jobs; cron + DAG (Airflow-style). | Bursty; dispatcher = bottleneck. | Sharded scheduler; leader-elected per shard; worker pool with leases. | At-least-once execution → idempotency; missed runs (catchup vs skip). |

## Common patterns across problems

### ID generation
- **Snowflake**: 64-bit = timestamp(41) + machine(10) + seq(12). 4096 IDs/ms/machine, sortable.
- **UUID v4**: random, no DB hot row, but no order → bad for B-tree index inserts.
- **ULID / KSUID**: time-ordered + random — best of both for index locality.
- **Base62 short IDs**: 62⁷ = 3.5 T (URL shortener), 62⁶ = 56 B (smaller scale).

### TTL + expiry
- Redis: `EXPIRE` / `EXPIREAT`; lazy + active expiry (20 keys × 100 ms scan).
- Session-style: ≤ 30 min; OTP: 5–10 min; rate-limit window: 1 s – 1 min.
- Cache TTL = freshness budget; jitter ±10% to avoid thundering herd.

### Idempotency
- Client sends `Idempotency-Key`; server stores `(key → response)` for 24 h.
- Critical for payments, notifications, job execution.
- Sagas: each step idempotent + compensating action.

### Fanout
- **Write fanout (push)**: insert into N inboxes on write. Cheap reads, expensive writes for celebs.
- **Read fanout (pull)**: scatter-gather at read time. Cheap writes, expensive reads.
- **Hybrid**: push for typical users, pull for celebs (≥ ~10 k followers).

### Sharding
- Default: consistent hash on a high-cardinality key (user_id, account_id).
- Geo-shard when data is regional (ride-sharing, payments).
- Time-shard for append-only event logs (clicks, audit).
- Watch hot-key: skew > 2× average → resharding or salt the key.

### Pre-aggregation
- Real-time counters (clicks, views) → Kafka → stream aggregator (Flink/KStreams) → OLAP store.
- Lambda architecture: speed layer (approximate, real-time) + batch layer (exact, slow).
- Kappa: stream-only, replay from Kafka for backfill.

## Cheat numbers / formulas

- DAU × write_QPS × payload = bandwidth. (e.g., 100M DAU × 1 write/day / 86400 = ~1.2K avg QPS; spike 10×.)
- Storage = DAU × records/day × bytes × retention_days.
- Read:write ratio for social / content: 100:1 to 1000:1. Payments: 5:1.
- URL shortener: 62⁷ ≈ 3.5 trillion 7-char codes.
- Snowflake: 4096 IDs/ms/machine = 4 M IDs/s/machine.
- Bloom filter for "seen set": m bits, k hashes, FPR ≈ (1 − e^(−kn/m))^k.
- News feed celebrity threshold: ~10 k followers is a common cut.
- Geohash precision: 6 chars ≈ 1.2 km, 7 chars ≈ 150 m, 8 chars ≈ 38 m.
- Video bitrate ladder: 240p ~400 kbps, 720p ~2.5 Mbps, 1080p ~5 Mbps, 4K ~15 Mbps.

## Decision tree

- **Read-heavy, latency-critical?** Cache aggressively + CDN. (autocomplete, URL shortener, video.)
- **Write-spiky?** Queue + admission control + pre-warmed cache. (flash sale, notifications.)
- **Correctness > latency?** Ledger + idempotency + saga. (payments.)
- **Real-time fanout?** WebSockets + Kafka for delivery. (chat, notifications.)
- **Geo dimension?** Geohash / S2 cell + geo-shard. (ride-sharing, food delivery.)
- **Unbounded event stream + analytics?** Kafka → Flink → OLAP. (ad clicks, telemetry.)
- **Big files, write-once?** Chunked object store + erasure coding. (file storage, video.)
- **Time-based execution?** Sharded scheduler + leases + idempotent workers. (job scheduler.)

## Common pitfalls / "gotchas"

- Not asking about traffic shape (avg vs peak, read:write) before designing.
- Forgetting **idempotency** on retryable writes — duplicate charges, duplicate notifications.
- Ignoring **celebrity fanout** in news feed / chat — kills the cluster on one user.
- Sync-replicating across regions for "consistency" — kills P99.
- Designing flash sale on the main DB — first 10 ms it's already toast.
- Storing every click in OLTP — clicks belong in Kafka → OLAP.
- Web crawler without politeness → IP banned in hours.
- Job scheduler with at-most-once semantics — missed runs are a silent bug.

## Related: see also
- [06 · HLD patterns cheatsheet](../06-hld-patterns/cheatsheet.md) — the patterns each problem composes.
- [03 · Caching cheatsheet](../03-caching-redis/cheatsheet.md) — Redis tricks for counters, TTL, locks.
- [04 · Messaging cheatsheet](../04-messaging-kafka/cheatsheet.md) — Kafka fanout, exactly-once.
- [10 · Modern additions cheatsheet](../10-modern-additions/cheatsheet.md) — Bloom filters, stream processing.
