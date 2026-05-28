# 15 — Redis: Data Structures, Persistence, Eviction, Cluster

> Phase 3 • Caching (Redis) • Topic 15/74

## Definition (interview-ready)

**Redis** is an in-memory data-structure server: strings, lists, hashes, sets, sorted sets, bitmaps, hyperloglog, streams, geospatial. It runs single-threaded for command execution (predictable performance), supports persistence via RDB snapshots and AOF append-only logs, evicts keys under memory pressure, and scales horizontally via **Redis Cluster** with hash-slot sharding and replicas.

## Why it matters

Redis is the default cache, rate limiter, leaderboard, distributed lock, ephemeral queue, pub/sub bus, and "low-latency sidecar store" in production systems. Knowing its data structures and operational levers (persistence, eviction, cluster) is one of the highest-leverage skills in backend engineering.

## Core concepts

### Data structures (each is a Redis "type")

- **String**: bytes (max 512 MB), counters (`INCR`), bitmap ops (`SETBIT`, `GETBIT`, `BITCOUNT`).
- **Hash**: field → value within a key. Good for objects (`HSET user:42 name aman email ...`).
- **List**: doubly linked list with O(1) push/pop on ends. `LPUSH`/`RPOP` = simple queue. `LPUSH`/`LPOP` = stack.
- **Set**: unique unordered members. `SINTER`, `SUNION`, `SDIFF` are O(N).
- **Sorted set (zset)**: members ranked by score. O(log N) insert. Backbone of leaderboards, rate limiters (`ZADD`+`ZREMRANGEBYSCORE`), time-windowed counts.
- **Bitmap** (a string usage): 1 bit per key id. Daily active users via `BITCOUNT`. Insanely memory efficient.
- **HyperLogLog**: cardinality estimation. Counts distinct items in 12 KB regardless of cardinality (~0.8% error).
- **Streams** (5.0+): persistent append-only log with consumer groups — Kafka-lite.
- **Geo**: lat/lng + radius queries (built on sorted sets).

### Why single-threaded works

- Redis processes commands serially → no locks, no race conditions, predictable latency.
- I/O is multi-threaded (network buffer reads), but execution is single-threaded.
- Throughput per node: 100K+ ops/sec, often into millions on modern hardware with pipelining.
- Limitation: a single CPU core caps you. For more, scale out via Redis Cluster.
- Avoid commands that scan large data sets (`KEYS *`, big `SMEMBERS`) — they block.

### Persistence

- **RDB**: periodic snapshot (fork + write binary dump). Fast restart, last snapshot age = max data loss window. Good for backups.
- **AOF**: append-only log of every write command. `fsync` policy: `always` (slow, safest), `everysec` (default, ≤1s loss), `no` (OS decides).
- **Both**: AOF for durability, RDB for fast restart and backup. Default in production.
- **No persistence**: pure cache — fastest, simplest, no durability.

### Eviction policies

Set `maxmemory` and choose `maxmemory-policy`:

- `noeviction` — error on writes once full (default; not what you want for a cache).
- `allkeys-lru` — least-recently-used across all keys. **Cache default**.
- `allkeys-lfu` — least-frequently-used. Better for keys with stable popularity.
- `volatile-lru` — only evict keys with TTL set (cache + persistent data in same store).
- `volatile-lfu`, `volatile-ttl`, `volatile-random`, `allkeys-random` — other flavors.

LRU/LFU are sampled approximations (not exact) for performance — usually fine, very rarely an issue.

### TTL & expiration

`EXPIRE key 60` → key auto-deletes in 60s. Expirations are sampled lazily + periodically — not exact instant deletion, but close enough.

### Pipelining & transactions

- **Pipelining**: send N commands without waiting for each reply → batch round-trips. Throughput-doubler.
- **MULTI/EXEC**: transaction — queued commands executed atomically. No rollback on individual command error.
- **Lua scripts**: server-side atomicity, conditional logic. `EVAL` / `EVALSHA`. Limited to ~5ms before they become a problem (single-thread).

### Pub/Sub & Streams

- **Pub/Sub**: fire-and-forget messaging. If no subscriber is listening, message is dropped. Not durable.
- **Streams**: durable log + consumer groups. Use when you need replay or guaranteed delivery.

### Redis Cluster

- 16,384 hash slots distributed across nodes. Key hashed to slot via CRC16(key) mod 16384.
- Each master owns some slots; replicas mirror. Default 1 replica per master.
- **No multi-key ops across slots** unless keys share a **hash tag** (`{user42}:profile`, `{user42}:cart` go to the same slot).
- Auto-failover via gossip + cluster-bus consensus (replica promoted).
- Client must be cluster-aware (most modern clients are; they cache the slot map and follow `MOVED`/`ASK` redirects).

### Redis Sentinel (alternative HA)

- Sentinels monitor a single primary + replicas; on failure, promote a replica.
- Simpler than Cluster, but no sharding.
- Use for HA without sharding needs.

### Common patterns

- **Distributed lock**: `SET lock:x token NX EX 30`. Release via Lua (CAS on token to avoid releasing someone else's lock). For production: **Redlock** (still debated — see Kleppmann's critique).
- **Rate limiter**: sliding-window with sorted set, or token bucket with Lua.
- **Idempotency key**: `SET req:xyz 1 NX EX 86400` → if NX returned, this is the first time we've seen this request.
- **Leaderboard**: sorted set + `ZADD` + `ZRANGE`.
- **Counter**: `INCR` / `INCRBY`.
- **Session store**: hash per user with TTL.

## How it works (a typical cache hit/miss)

```
GET user:42
  Cluster client → slot 12345 owner is node N1
  N1 returns value (hit) or NIL (miss)

On miss, app fetches from DB, then:
  SETEX user:42 300 <serialized json>
```

## Real-world examples

- **Twitter**: timelines materialized in Redis (sorted set per user).
- **Stack Overflow**: question/answer caching, vote counts.
- **GitHub**: rate limiting, session store.
- **Discord**: ephemeral state, voice channel routing.
- **Shopify**: rate limiting, idempotency keys for storefront APIs.

## Common pitfalls

- **`KEYS *` in production**: blocks the single thread, kills latency. Use `SCAN`.
- **Big key**: a 1 GB hash takes >1 second to GET in some shapes — blocks. Slice into smaller pieces.
- **Big O of commands**: know them. `SMEMBERS` on a 10M-element set is bad.
- **No eviction policy → `noeviction`**: production caches hit OOM, error out, take service down.
- **TTL drift**: setting TTL only on write — reads with `GET` don't reset. Use `EXPIRE` thoughtfully.
- **Persistence fork stalls**: BGSAVE/AOF rewrite fork uses copy-on-write; in heavy-write workloads, the fork itself can spike memory and latency. Tune `save` policy, disable THP.
- **Cluster cross-slot multi-key ops fail**: refactor to hash tags or single-shard ops.
- **Treating pub/sub as durable**: it isn't. Use Streams or Kafka.
- **Naive Redlock**: read Kleppmann's critique before relying on Redis for distributed locking in critical paths.

## Interview questions

### Q1 — Easy: Why is Redis fast?
In-memory storage, single-threaded command execution (no locks, no context switching), efficient data structures with tight C implementations, simple protocol (RESP), pipelining, well-optimized network I/O.

### Q2 — Easy: When would you pick a sorted set over a list?
When you need **ordering by a score** (leaderboards, time-based queues, rate limit windows) and want O(log N) insert/remove anywhere. Lists give you O(1) at the ends only, no random insert.

### Q3 — Medium: Explain RDB vs AOF.
RDB = periodic binary snapshot (e.g., every 5 min if 100 keys changed). Fast restart, lower disk overhead, but you lose up to interval. AOF = log of every write command, fsynced per policy (`always`/`everysec`/`no`). Slower restart (replay), more disk write, but at most ~1 second loss with `everysec`. Production: usually both.

### Q4 — Medium: Why is `KEYS *` dangerous in production?
It iterates all keys synchronously on the single-threaded server. For large datasets, this blocks all other commands for seconds — effectively a DDoS on yourself. Use `SCAN` which iterates in cursor-paginated batches.

### Q5 — Medium: How does Redis Cluster partition data?
By **CRC16(key) mod 16384** → one of 16,384 hash slots. Slots are distributed across master nodes. Keys in the same hash slot can be operated on together (multi-key commands, transactions). Use `{tag}` in the key name to force colocation: `{user42}:cart`, `{user42}:profile`.

### Q6 — Hard: Design a sliding-window rate limiter in Redis.
Use a sorted set per user keyed by timestamp:
```
key = "rl:user:42"
now = current_ms
ZREMRANGEBYSCORE key 0 (now - window_ms)   -- drop old
ZADD key now now                            -- record this request
EXPIRE key window_ms
n = ZCARD key
if n > limit: reject
```
Wrap in a Lua script for atomicity.

### Q7 — Hard: Implement a distributed lock with Redis correctly.
```
Acquire: SET lock:x <random-token> NX EX 30
Release: Lua script: 
   if redis.call('GET', key) == token then 
     redis.call('DEL', key) 
   end
```
Random token prevents releasing someone else's lock (after your TTL expired and theirs took over). For multi-node redundancy: Redlock — but read Kleppmann's critique. For correctness-critical locking, use a true consensus system (ZK, etcd) instead.

### Q8 — Hard: Your Redis hit ratio is 90%, but p99 jumps from 1ms to 50ms periodically. What's happening?
- Big-key operations on the single thread (someone is `HGETALL`ing a huge hash).
- AOF rewrite or BGSAVE fork stall on a memory-pressured box.
- A slow Lua script (>5ms).
- Network congestion or noisy neighbor.
- Memory near max, eviction thrashing.
- Use `SLOWLOG`, `LATENCY DOCTOR`, `INFO commandstats`, `MEMORY USAGE` to diagnose.

## TL;DR cheat sheet

- Single-threaded execution; multi-threaded I/O. Predictable latency.
- Data structures: string, list, hash, set, sorted set, bitmap, HLL, stream, geo.
- Persistence: RDB (snapshots) + AOF (log). Use both for production.
- Eviction: set `maxmemory` + `allkeys-lru` (or `lfu`) for cache use.
- Cluster: 16,384 slots; hash tag `{...}` for colocation. No cross-slot multi-key.
- Avoid `KEYS *`, big-key ops, long Lua. Use `SCAN`.
- Pub/sub is not durable; use Streams (or Kafka) when you need replay.
- Distributed locks: `SET NX EX` with token + Lua release. Don't trust Redlock for safety-critical paths.

## Go deeper

- **Redis docs**: [redis.io/docs](https://redis.io/docs/) — exceptionally good.
- **ByteByteGo**: ["The Ultimate Redis 101"](https://bytebytego.com/guides/the-ultimate-redis-101/), ["What is Redis"](https://www.youtube.com/watch?v=z_NbVtbgBJw).
- **Salvatore Sanfilippo's blog** (antirez, original Redis author): [antirez.com](http://antirez.com).
- **Martin Kleppmann**: ["How to do distributed locking"](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) — Redlock critique.
- **Hussein Nasser**: Redis internals YouTube series.
- **Book**: *Redis in Action* (Josiah Carlson) — old but the data-structure intuition is timeless.
- **Tool**: `redis-cli --latency`, `--bigkeys`, `MEMORY DOCTOR`, `LATENCY DOCTOR`.
