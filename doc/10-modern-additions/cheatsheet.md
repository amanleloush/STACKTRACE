---
title: Modern additions — cheatsheet
---

# Modern additions · Cheatsheet

> One-page recall for the modern HLD additions. Print, paste in Notion, glance before the system design interview.

## What this section covers
Three areas that come up constantly in modern interviews but rarely got their own slot in old prep guides: real-time push (WebSockets / SSE / long-poll), probabilistic data structures (Bloom filter, HyperLogLog, Count-Min Sketch), and modern stream processing (Flink event time + watermarks + checkpoints, Kafka Streams KStream/KTable).

## Key topics (the 5-minute recall)

### Real-time push — WS / SSE / long-poll
- **One-line definition.** Three techniques to push server-originated data to a client without the client polling on a tight loop.

| | Long-poll | SSE | WebSocket |
|---|---|---|---|
| Transport | HTTP req held open | HTTP streaming (`text/event-stream`) | TCP via HTTP upgrade |
| Direction | Server → client (1 per cycle) | Server → client (continuous) | Bidirectional |
| Auto-reconnect | Manual | Built-in (`Last-Event-ID`) | Manual |
| Proxies / firewalls | Works everywhere | Works (plain HTTP) | Sometimes blocked |
| Binary | JSON only | Text only | Text or binary frames |
| Typical use | Legacy fallback | Notifications, tickers, logs | Chat, gaming, collab edit |

- **Connection scale**: 1 server can hold ~10k–100k WebSocket connections (FD limit + memory ~10 KB/conn baseline). Need connection sharding by user_id for higher.
- **Heartbeat / ping**: every 30 s to detect dead clients and keep NAT mappings alive.
- **Backpressure**: client slow → server buffer grows → kill connection rather than OOM.
- **SSE strengths**: simpler than WS, native reconnect with `Last-Event-ID`, works over HTTP/2 multiplexing.
- **WS strengths**: bidirectional, lower per-message overhead (2–14 byte frame header vs HTTP).
- **Long-poll strengths**: works through every proxy, every browser, every firewall. The fallback you keep.
- **In 10 seconds:** SSE for server→client streams, WS for bidirectional, long-poll only as a fallback.

### Probabilistic data structures

#### Bloom filter
- **One-line definition.** Space-efficient set membership with no false negatives, tunable false positives.
- Structure: bit array of size `m`, `k` independent hash functions. To add: set `k` bits. To query: check all `k` bits set.
- **Optimal k**: `k* = (m/n) · ln 2 ≈ 0.693 · m/n`.
- **False positive rate**: `FPR ≈ (1 − e^(−kn/m))^k`. With optimal k: `FPR ≈ (0.6185)^(m/n)`.
- **Bits per item for target FPR**: `m/n ≈ −1.44 · log₂(FPR)`. So FPR=1% needs ~9.6 bits/item; FPR=0.1% needs ~14.4 bits/item.
- No deletes (would create false negatives). **Counting Bloom** supports delete (uses small counters instead of bits) at ~4× space.
- **Use cases**: "is this URL in seen-set?" (web crawler), "is this row in this SSTable?" (LevelDB/RocksDB), CDN cache routing.
- **In 10 seconds:** 9.6 bits/item for 1% FPR, optimal k = 0.693·m/n, no deletes.

#### HyperLogLog
- **One-line definition.** Approximate cardinality (count-distinct) in fixed memory.
- Idea: hash each element; track the position of the leftmost 1-bit; cardinality ≈ 2^maxLeadingZeros (very noisy, refined by averaging across `m` registers).
- **Standard error**: `≈ 1.04 / √m`. With m=16384 (2^14) registers: error ≈ 0.81%. Memory ≈ 12 KB.
- Mergeable: union of two HLLs = max of registers element-wise. Perfect for distributed count-distinct.
- **Redis** `PFADD` / `PFCOUNT` uses HLL with ~12 KB per key for billions of items with < 1% error.
- **Use cases**: UU count per day, unique IPs, unique queries.
- **In 10 seconds:** 12 KB for < 1% error counting billions of distinct items; mergeable.

#### Count-Min Sketch
- **One-line definition.** Approximate frequency (count per item) in sub-linear space; **overestimates** (no underestimate).
- Structure: 2D array `d` rows × `w` cols; `d` hash functions, each maps item to a column; increment one cell per row. Query = min of `d` cells.
- **Error bound**: `est − true ≤ ε · N` with probability ≥ `1 − δ`, where `w = ⌈e/ε⌉` and `d = ⌈ln(1/δ)⌉`.
- Example: ε=0.001, δ=0.001 → w ≈ 2718, d ≈ 7 → ~19k counters = 76 KB for 4-byte cells.
- **Use cases**: heavy hitters / top-k (with min-heap on the side), DDoS detection, ad click frequency.
- **In 10 seconds:** approximate frequency, always overestimate; w=e/ε wide, d=ln(1/δ) deep.

#### When to reach for which

| Question | Structure |
|---|---|
| Is X in the set? | Bloom filter |
| How many distinct items? | HyperLogLog |
| How often did X appear? | Count-Min Sketch |
| Top-k frequent items? | Count-Min + heap |
| Distinct items per window? | HLL per window, merge for rollup |

### Stream processing — Flink + Kafka Streams

#### Flink core concepts
- **Event time** (in payload, correct for late data) vs **processing time** (when operator sees it, fast but lag-incorrect) vs **ingestion time** (compromise).
- **Watermark** = "no event with timestamp < T will arrive after this point." Flows through DAG; triggers window close.
- **Allowed lateness**: grace window after watermark; late events update emitted result.
- **Windows**: tumbling (non-overlap), sliding (overlap, 6× state of tumbling for length/slide=6), session (gap-based), global (custom).
- **Checkpointing**: Chandy-Lamport snapshot via barriers; state to S3/HDFS. Default interval 10 s – 1 min.
- **Exactly-once**: checkpoints + transactional sinks (Kafka 2PC, JDBC).
- **State backends**: heap (small, fast) or RocksDB (large, on-disk, default for prod).
- **Savepoint** = manual + durable + for upgrades; **checkpoint** = automatic + for recovery.
- **In 10 seconds:** event time + watermarks; checkpoints every 30 s; RocksDB backend; transactional sink for exactly-once.

#### Kafka Streams — KStream vs KTable
- **KStream** = append-only event stream (facts). **KTable** = changelog interpreted as keyed state ("current value per key"). **GlobalKTable** = replicated everywhere, for broadcast joins.
- Conversions: `stream.toTable()` snapshots per key; `table.toStream()` emits on change.
- Joins: stream-stream = windowed; stream-table = lookup; table-table = changelog merge.
- State = local RocksDB, backed by a Kafka changelog topic for fault tolerance.
- Scale by adding partitions + instances (max parallelism = partition count).
- **EOS**: `processing.guarantee=exactly_once_v2` uses Kafka transactions.
- **In 10 seconds:** KStream = facts, KTable = current state per key.

#### Flink vs Kafka Streams

| | Flink | Kafka Streams |
|---|---|---|
| Deploy | Standalone cluster (or k8s) | Library inside your app |
| Sources | Kafka, Kinesis, files, JDBC, more | Kafka only |
| State | RocksDB / heap, snapshots to DFS | RocksDB, changelog topic |
| Watermarks | First-class, sophisticated | Limited (event time supported) |
| Best for | Complex event-time, multi-source | Kafka-native, simple ops |

## Cheat numbers / formulas

- Bloom filter optimal k: `k = (m/n) · ln 2 ≈ 0.693 · m/n`.
- Bloom filter FPR with optimal k: `(0.6185)^(m/n)`.
- Bloom bits per item: `m/n ≈ −1.44 · log₂(FPR)`. (1% → 9.6, 0.1% → 14.4, 0.01% → 19.2.)
- HLL standard error: `1.04 / √m`. m=16384 → 0.81% error, 12 KB.
- Count-Min: `w = e/ε`, `d = ln(1/δ)`.
- Single WS server connection ceiling: ~10k–100k (FD + ~10 KB/conn baseline).
- WebSocket heartbeat: every 30 s typical.
- Flink default checkpoint interval: 10 s – 1 min (set per-job).
- SSE reconnect delay: 3 s default (configurable via `retry:` field).
- Kafka transactional sink latency overhead: ~100 ms (2PC commit).

## Decision tree

- **Server → client only, simple events?** SSE.
- **Bidirectional, chat / game?** WebSocket.
- **Behind enterprise proxy, no negotiation?** Long-poll fallback.
- **"Is it in the set?" + can tolerate 1% FPR?** Bloom filter.
- **"How many distinct?" billions of items?** HyperLogLog (Redis `PFADD`).
- **"How often did X happen?" + top-k?** Count-Min + min-heap.
- **Exactly-once streaming, complex windowing, multi-source?** Flink.
- **Pure Kafka transform, library not cluster?** Kafka Streams.
- **Need late event correctness?** Event time + watermark + allowed lateness.
- **State > GB?** RocksDB backend (Flink) or partitioned state stores (KStreams).

## Common pitfalls / "gotchas"

- WebSocket sticky-session not configured behind LB → reconnect lands on different node, loses state.
- No heartbeat → half-open connections accumulate, FDs exhaust.
- SSE through a proxy that buffers responses → events arrive in batches of minutes.
- Bloom filter with too-small `m` → FPR hits 10%+ silently (no error, just wrong answers).
- HLL on tiny cardinality (< 100) — error fraction is huge; use `HashSet` instead.
- Count-Min returning suspiciously high counts — that's the design; it overestimates.
- Flink job with processing-time windows on lagged stream — windows close while events still arriving.
- Watermark generator with too-aggressive lateness → drops legit late data.
- Kafka Streams scaling beyond partition count — extra instances stay idle.
- Forgetting transactional sink — checkpoints + non-idempotent sink = at-least-once, not exactly-once.

## Related: see also
- [04 · Messaging cheatsheet](../04-messaging-kafka/cheatsheet.md) — Kafka transactions, EOS.
- [08 · Data engineering cheatsheet](../08-data-engineering/cheatsheet.md) — Lambda vs Kappa, Spark.
- [07 · HLD problems cheatsheet](../07-hld-problems/cheatsheet.md) — chat, notifications, ad-click tracking.
- [05 · Distributed cheatsheet](../05-distributed-systems/cheatsheet.md) — clocks, consistency, retries.
