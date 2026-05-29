# 02 — Back-of-envelope math

> System design interview • Position 2/3

## What

How to produce credible capacity numbers in 3-4 minutes on a whiteboard — **DAU → QPS, storage, bandwidth** — using a small set of cached constants and a peak-factor multiplier. Four worked examples (URL shortener, news feed, video upload, chat) you can lift into any system design round.

For the full theory and additional drills, see [01 · Foundations / Back-of-envelope math](../../01-foundations/05-back-of-envelope-math.md).

## Why it matters

Capacity numbers are how senior engineers translate a vague problem into design pressure. "We have a lot of users" doesn't tell you anything; "we have 50K writes/sec sustained, 200K peak, with 30TB/year storage growth" tells you whether one database is enough, whether you need to shard, how big the cache must be, whether async fanout is necessary, and how much it'll cost monthly.

In an interview, BoE math is a *signal* even more than a tool. Doing it confidently shows you've thought about real-world scale. Skipping it leaves the interviewer wondering whether you'd over- or under-provision a real system. Most senior interviewers explicitly score "did the candidate produce reasonable capacity estimates and use them to drive design".

The third reason: the math *forces good design decisions*. If you compute 5M reads/sec, you can't propose "MySQL with read replicas" with a straight face. The number is doing the design work for you.

## How to do it

### Memorize a small set of constants

You don't have time to derive these mid-interview. Cache them.

| Constant | Value | When you use it |
|---|---|---|
| Seconds per day | ~86,400 ≈ **100,000** | DAU → QPS |
| Days per year | ~365 ≈ **400** | annual storage |
| 1 KB | ~10³ bytes | small message / tweet |
| 1 MB | ~10⁶ bytes | image / large message |
| 1 GB | ~10⁹ bytes | video clip / large file |
| **Peak factor** | **3-5× average** | spiky traffic |
| Memory latency | ~100 ns | per-op math |
| SSD read | ~100 μs | per-op math |
| Disk seek | ~10 ms | per-op math |
| Cross-region RTT | ~100 ms | global p99 latency |
| Network within DC | ~0.5 ms | service-to-service |

The "100K seconds in a day" shortcut is the single most useful one. It turns "100M DAU" into "1000 actions/sec per user-action".

### The four-step recipe

For any "design X" problem:

1. **Active users → daily actions.** "100M DAU, each user posts 0.5 times/day → 50M writes/day." Use estimated user behavior — be willing to defend it.

2. **Daily actions → QPS.** Divide by 100K (seconds/day, rounded). "50M / 100K = 500 writes/sec average." Multiply by 3-5× for peak: ~2000 writes/sec peak.

3. **QPS × payload → bandwidth.** "2000 writes/sec × 1 KB per write = 2 MB/sec write bandwidth." For reads, do the same: "200K reads/sec × 1 KB = 200 MB/sec read bandwidth."

4. **Daily volume × time horizon → storage.** "50M writes/day × 1 KB × 400 days/year = 20 TB/year." Apply a replication factor (3×) and overhead (20%): ~75 TB usable. Add 5 years for capacity planning: ~375 TB.

The numbers will be off by 2-3× either way. That's fine — order of magnitude is what matters.

### Translate numbers into design pressure

| Number | What it forces |
|---|---|
| > 10K writes/sec sustained | Single-primary SQL gets tight; consider sharding or NoSQL. |
| > 100K reads/sec sustained | Need cache layer + replicas. |
| > 100 TB total storage | Need sharding regardless of DB type. |
| > 1 Gbps bandwidth in or out | CDN for static, careful network topology. |
| Reads:writes > 100:1 | Aggressive caching pays. Materialized views, denormalization. |
| Reads:writes < 5:1 | Cache value drops. Write-optimized stores (LSM-based). |
| Latency p99 < 50ms | In-memory store on hot path. No cross-region calls. |

State the pressure as you compute: "200K reads/sec — that rules out hitting the database directly. We need a Redis-or-similar cache fronting reads."

## Concrete examples

### Example 1: URL shortener (read-heavy, small payloads)

> Design a service like bit.ly that turns long URLs into short ones.

- Assume 100M DAU.
- Each user creates ~1 short URL per day → 100M writes/day. Each one is ~500 bytes (URL + metadata).
- QPS: 100M / 100K = 1K writes/sec avg, ~5K peak.
- Reads: each short URL gets clicked ~100× over its life → 10B clicks/day → 100K reads/sec avg, ~500K peak.
- Bandwidth: writes ~2.5 MB/sec, reads ~250 MB/sec (mostly 302 responses, ~500 bytes each).
- Storage: 100M/day × 500 bytes × 400 days × 5 years = 100 TB. With 3× replication ~300 TB.

**Design pressure:** 500K reads/sec → cache is mandatory. Short URLs are ideal cache candidates (immutable lookup). 300 TB → key-value store, sharded by short URL hash. Writes are modest — no fanout needed.

### Example 2: News feed (read-heavy, fanout problem)

> Design a Facebook/Twitter-style news feed.

- Assume 500M DAU.
- Posts: each user posts ~0.5/day → 250M posts/day → 2.5K writes/sec avg, ~12K peak.
- Feed views: each user opens the feed ~10/day → 5B feed reads/day → 50K reads/sec avg, ~250K peak.
- Each feed view = ~100 posts × 1 KB metadata = 100 KB. So read bandwidth ~25 GB/sec peak. That's the scary number.
- Storage: 250M posts/day × 1 KB × 400 days = 100 TB/year of post text alone. Media in object store separately.

**Design pressure:** 25 GB/sec read bandwidth → can't materialize feeds on every read. Must precompute timelines (fanout-on-write) for most users, fanout-on-read for celebrities. CDN for media. Sharded timeline store partitioned by user_id.

### Example 3: Video upload + streaming (bandwidth-dominated)

> Design YouTube's upload + playback path.

- Assume 100M DAU.
- Uploads: 1% of users upload one video per day → 1M videos/day. Average video ~100 MB raw.
- Upload bandwidth: 1M × 100 MB / 100K sec = 1 GB/sec avg, ~5 GB/sec peak.
- Views: 100M DAU × 30 video views/day = 3B views/day. Average watched ~5 minutes at ~500 KB/sec → ~150 MB per view. So view bandwidth: 3B × 150 MB / 100K = 4.5 TB/sec avg.

**Design pressure:** 4.5 TB/sec read bandwidth → CDN is the *entire system*. Origin storage is just the master copy; CDN tier serves ~99% of bytes. Storage in object store with transcoding pipeline (multiple bitrates × multiple codecs ≈ 5× raw size on disk). Aggressive prewarm of CDN for trending videos.

### Example 4: Chat (write-heavy, low latency)

> Design WhatsApp-style 1:1 and group messaging.

- Assume 2B DAU. Each user sends ~50 messages/day → 100B messages/day. Each ~200 bytes.
- Writes: 100B / 100K = 1M writes/sec avg, ~4M peak. **This is the dominating number.**
- Reads: most reads are "deliver to recipient" — roughly 1:1 with writes for 1:1 chat, higher for groups. Call it 2-3M reads/sec.
- Storage: 100B × 200 bytes × 400 days = 8 PB/year. Brutal.
- Latency: needs p99 < 100ms end-to-end including push delivery.

**Design pressure:** Persistent connections (WebSocket or MQTT) — not polling. Write path must be sharded by user_id or conversation_id; can't have a single hot partition. Storage favors LSM (Cassandra, Scylla) over B-tree because writes dominate. Aggressive message archival or TTL — most clients only need the last 90 days hot. Multi-region deployment for global latency.

## Anti-patterns

- **Skipping math entirely** and going straight to architecture. The interviewer will pull you back, usually unkindly.
- **Over-precise math** — "100,003,247 events per day" — that you derived in your head and probably got wrong. Round generously, defend the round.
- **Numbers nobody uses.** "1.4 KiB/event with 3% overhead" loses people. Just say "~1 KB per event".
- **Computing the numbers and then ignoring them** when picking a database. "100K writes/sec — I'll use MySQL" is a contradiction in terms.
- **No peak factor.** Real traffic is spiky. Always multiply average by at least 3×.

## Cheat-line

> **DAU divided by 100,000 is QPS. Multiply by 3-5× for peak.** Then turn every big number — > 10K writes/sec, > 100 TB storage, > 1 Gbps bandwidth — into a specific architectural choice on the board.
