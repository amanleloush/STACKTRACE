# 50 — Batch vs Streaming vs Lambda vs Kappa

> Phase 8 • Data Engineering • Topic 50/74

## Definition (interview-ready)

**Batch processing** treats data as bounded, processing chunks (hours/days). **Stream processing** treats data as unbounded, processing per-event with low latency. **Lambda architecture** runs both side-by-side: batch for accuracy + streaming for low-latency. **Kappa architecture** uses only streaming, treating batch as "reprocessing the same stream from the beginning."

## Why it matters

Almost every data team faces "do we need real-time?" The wrong answer (real-time everywhere) burns money; the wrong answer (batch everything) ships stale data. Knowing the latency/cost/complexity tradeoffs of each architecture is core to data engineering.

## Core concepts

### Batch processing

- Data arrives, accumulates, processed in scheduled jobs.
- Latency: minutes to hours.
- Throughput: enormous (Spark, Hadoop).
- Idempotent, repeatable, easy to test.
- Tools: Spark, Hive, Presto, dbt (over warehouse).

Use when: latency in hours is acceptable, large aggregations, business intelligence, historical reports, ML training.

### Stream processing

- Data continuously processed event-by-event.
- Latency: milliseconds to seconds.
- Throughput: high but at per-event cost.
- Stateful: maintains running aggregates, joins, sessions.
- Tools: Apache Flink, Kafka Streams, Spark Structured Streaming, Beam.

Use when: real-time dashboards, fraud detection, ML inference features, live counters, alerting.

### Lambda architecture (Nathan Marz, 2011)

Three layers:
- **Batch layer**: source of truth; reprocess all data, accurate.
- **Speed layer**: real-time stream; approximate, low-latency.
- **Serving layer**: query both, present unified view.

```
events ──► batch layer (Hadoop / Spark) ──► batch views
       └─► speed layer (Storm / Flink)  ──► realtime views
                                              ↓
                                          serving (combined)
```

Pros: best of both worlds — accuracy and freshness.
Cons: **two codebases** doing the same logic — bugs, drift, ops cost.

### Kappa architecture (Jay Kreps, 2014)

Drop the batch layer. Use only streaming. For reprocessing (after bug fix, schema change): re-consume from the start of the stream.

- One codebase.
- Kafka as the durable log.
- "Reprocess by replay."
- Modern stream processors can do "exactly-once" within the system.

Pros: simpler, no code duplication.
Cons: streaming jobs are harder to write; reprocessing huge volumes is slow.

### Modern reality: Lakehouse + structured streaming

Most modern teams blend:
- **Source of truth**: Parquet/Iceberg in S3 (essentially batch storage).
- **Streaming layer**: Flink/Spark Streaming consuming Kafka, writing to lakehouse.
- **Querying**: same SQL layer (Trino, Spark SQL) on the lakehouse.
- For real-time dashboards: OLAP layer (ClickHouse, Druid) fed by streaming.

This avoids "two systems" while keeping batch-grade analytics and low-latency real-time.

### Event time vs processing time

Critical distinction:
- **Processing time**: when the system observes the event.
- **Event time**: when the event actually happened.

A streaming system aggregating "clicks per minute":
- Processing-time windows: simple, but biased by ingestion lag.
- Event-time windows: accurate, but need watermarks to handle late data.

**Watermark**: "I've seen all events with timestamp ≤ X." Used to close windows. Late events (after watermark) handled via late-arrival policy.

### Stateful streaming

- **Sliding/tumbling/session windows**: aggregate over event-time windows.
- **Joins**: stream-stream (window-bounded), stream-table (key-lookup).
- **State store**: RocksDB-backed local + checkpointed to remote storage.
- **Checkpoints**: snapshot state for fault tolerance (Flink: every N seconds).
- **Exactly-once**: with checkpoints + idempotent sinks.

### Delivery semantics in streams

- Effectively-once: at-least-once delivery + idempotent processing/sinks.
- See Topic 19. Same principles apply at the stream-processor level.

## How it works (Kappa-style pipeline)

```
events → Kafka (raw events, infinite retention) →
    Flink job:
      - Read Kafka offset 0 to latest.
      - Window by event time, 5-min tumbling.
      - Aggregate clicks per ad per minute.
      - Write to ClickHouse (idempotent upsert).
    Real-time dashboards query ClickHouse.

Reprocess after bug:
    Stop Flink, fix code, restart from offset 0.
    Idempotent sink ensures result is correct on replay.
```

## Real-world examples

- **LinkedIn**: heavy Kappa adopter (Kreps, the architect, coined Kappa).
- **Netflix**: Lambda for years; moving toward Kappa-like with their Keystone platform.
- **Uber**: massive Flink + Kafka pipelines; Lambda + lakehouse blend.
- **Airbnb**: dbt + Spark + Airflow for batch; real-time tiers for specific use cases.
- **Stripe**: batch for billing reconciliation, streaming for fraud detection.

## Common pitfalls

- **Real-time for everything**: most use cases don't need it; cost balloons.
- **Mixing event time and processing time** carelessly: results don't match expectations.
- **No watermark policy**: late events handled inconsistently, data silently dropped.
- **Stateful streaming without checkpointing**: any crash = lost state.
- **Lambda with two codebases**: drift inevitable.
- **Reprocessing in Kappa**: huge replays for huge histories — plan accordingly (parallel re-process to a new topic, then cut over).

## Interview questions

### Q1: When would you use batch vs streaming?
Batch: latency-tolerant work (BI dashboards, ML training, historical analysis), huge aggregations, simpler dev. Streaming: low-latency requirements (real-time dashboards, alerting, fraud, feed generation), session windows, continuous joins.

### Q2: Explain Lambda vs Kappa.
Lambda: two parallel layers (batch source of truth + speed layer for low latency) serving combined results. Kappa: single streaming layer; reprocessing via stream replay. Kappa is simpler (one codebase) but reprocessing huge histories is slow. Modern teams often use lakehouse + streaming that approximates Kappa benefits.

### Q3: What's the difference between event time and processing time?
Event time = when the event actually happened (timestamp on the event). Processing time = when the system observed it. For accurate aggregation (especially over windows), use event time + watermarks to handle out-of-order and late data.

### Q4: What is a watermark?
A logical clock in the stream signaling "I've seen all events with timestamp ≤ X." Used to close event-time windows. Events arriving with timestamp < watermark are "late" and handled per policy (dropped, side-output, special merge).

### Q5: How does Flink achieve exactly-once processing?
Distributed checkpoints (Chandy-Lamport algorithm) snapshot operator state periodically. Sinks must be transactional or idempotent. On failure, restart from last checkpoint and re-emit since then. Net effect: each event is processed exactly once with respect to state.

### Q6: How would you migrate from Lambda to Kappa?
- Identify all batch logic; replicate in streaming.
- Run side-by-side, compare outputs.
- For reprocessing: design topic retention long enough to replay (or fall back to lakehouse if event sourcing isn't feasible).
- Decommission batch layer once streaming proves accurate over weeks/months.

### Q7: Reprocessing 6 months of data in Kappa — how?
- Replay Kafka topic from offset corresponding to 6 months ago.
- Run a parallel pipeline (don't disturb prod) writing to a new sink.
- Compare with the existing data once caught up.
- Cut over (or keep both during validation).
- If retention isn't long enough → fall back to lakehouse + reload.

### Q8: A streaming aggregation is showing wrong numbers compared to batch. Diagnose.
- Late events being dropped silently (no late-arrival policy).
- Watermark progressing too aggressively → windows closing early.
- Different time zones / time semantics between batch and stream.
- Non-idempotent sink double-counting (or dedup window too short).
- Skewed partition keys causing some events to be reprocessed.
- Streaming exactly-once isn't enabled or misconfigured.

## TL;DR cheat sheet

- Batch: bounded data, high throughput, hours of latency.
- Streaming: unbounded, low latency, stateful.
- Lambda: batch + speed layers; two codebases (drift risk).
- Kappa: stream only; reprocess via replay.
- Modern hybrid: lakehouse + streaming + OLAP.
- Event time + watermarks for correctness over time windows.
- Exactly-once = checkpoints + idempotent sinks.
- Reprocessing in Kappa: design retention or fall back to lakehouse.

## Go deeper

- **Tyler Akidau**: ["Streaming 101"](https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/) and ["Streaming 102"](https://www.oreilly.com/radar/the-world-beyond-batch-streaming-102/) — canonical posts.
- **Book**: *Streaming Systems* (Akidau, Chernyak, Lax) — the bible.
- **Nathan Marz**: ["Lambda architecture"](http://lambda-architecture.net/) origin.
- **Jay Kreps**: ["Questioning the Lambda Architecture"](https://www.oreilly.com/radar/questioning-the-lambda-architecture/) — origin of Kappa.
- **Apache Flink docs**.
- **DDIA Chapters 10 (Batch), 11 (Streaming)**.
