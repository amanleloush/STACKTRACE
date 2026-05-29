---
title: Modern Additions
---

# Phase 10 · Modern Additions

> Three topics that didn't fit cleanly into the original nine phases but show up in almost every modern interview and production design. Real-time push, probabilistic data structures, and stream processing — the patterns behind most "how would you do this at scale?" questions today.

<div class="topic-grid">

  <a class="topic-card" href="75-realtime-push-websockets-sse/">
    <span class="topic-card__num">75</span>
    <span class="topic-card__tag topic-card__tag--featured">Push patterns</span>
    <h3>Real-time push — WS / SSE / long-poll</h3>
    <p>When the server needs to push to the browser without polling. Trade-offs, scaling via fan-out bus, sticky sessions, reconnect protocols.</p>
  </a>

  <a class="topic-card" href="76-probabilistic-data-structures/">
    <span class="topic-card__num">76</span>
    <span class="topic-card__tag topic-card__tag--featured">Memory wins</span>
    <h3>Probabilistic DS — Bloom / HLL / Count-Min</h3>
    <p>Approximate answers at a fraction of the memory. Bloom for membership, HyperLogLog for distinct counts, Count-Min for frequency, top-K for trending.</p>
  </a>

  <a class="topic-card" href="77-stream-processing-flink-kstreams/">
    <span class="topic-card__num">77</span>
    <span class="topic-card__tag topic-card__tag--featured">Real-time data</span>
    <h3>Stream processing — Flink / Kafka Streams</h3>
    <p>Windowing, watermarks, event time vs processing time, exactly-once, state checkpointing, hot-key skew. The engines behind real-time fraud, pricing, and ML features.</p>
  </a>

</div>

## When to reach for these

| Symptom | Pattern from this phase |
|---|---|
| "Users need updates within 100 ms without polling" | [Real-time push](75-realtime-push-websockets-sse.md) |
| "Counting distinct users at 100M/day in 12 KB" | [HyperLogLog](76-probabilistic-data-structures.md) |
| "Trending topics in real time" | [Count-Min Sketch + top-K](76-probabilistic-data-structures.md) |
| "5-minute moving features for fraud" | [Flink event-time windowing](77-stream-processing-flink-kstreams.md) |
| "Avoid a 100ms cold-store hit on 99% of queries" | [Bloom filter](76-probabilistic-data-structures.md) |
| "Exactly-once from Kafka to my warehouse" | [Flink + transactional sink](77-stream-processing-flink-kstreams.md) |
