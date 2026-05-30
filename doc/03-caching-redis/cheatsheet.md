---
title: Caching & Redis — cheatsheet
---

# Caching & Redis · Cheatsheet

> One-page recall for Caching. Print, paste in Notion, glance before the system design interview.

## What this section covers
Cache as the universal latency band-aid: the four canonical patterns (aside / through / behind / read-through-write-around), Redis internals you have to know (single-threaded event loop, persistence modes, replication, Cluster), the stampede / TTL / hot-key problems, and CDN edge caching.

## Key topics (the 5-minute recall)

### Cache patterns
| Pattern | Read | Write | Use when |
|---|---|---|---|
| **Cache-aside (look-aside)** | App checks cache → miss → DB → fill cache | App writes DB, invalidates cache | Default — 95% of services |
| **Read-through** | App asks cache; cache fetches from DB on miss | App writes DB (separately) | Cache library can call DB (Caffeine, Guava) |
| **Write-through** | App reads cache | App writes cache → cache writes DB synchronously | Strong consistency between cache and DB |
| **Write-behind (write-back)** | App reads cache | App writes cache; cache flushes to DB async | High write throughput, OK losing recent writes on crash |
| **Refresh-ahead** | App reads cache | Cache pre-refreshes hot keys before TTL | Predictable hot keys, latency-critical |

- TTL = absolute or sliding (renewed on access). Sliding can keep dead data alive forever.
- Invalidation modes: **TTL** (eventual), **explicit delete** (on write), **versioned key** (`user:42:v17`).
- "There are only two hard problems in CS: naming, cache invalidation, and off-by-one errors." Two of them are caches.
- **In 10 seconds:** cache-aside + short TTL + explicit invalidation on write covers nearly every interview answer.

### Redis internals
- **Single-threaded event loop** for command processing (I/O multiplexing in 6+, modules can multi-thread).
- All in-memory; persistence is optional. Latency: **~50 μs per op** in-DC, ~100k ops/sec single-shard easily.
- Data structures: strings, lists, hashes, sets, sorted sets (ZSET), streams, bitmaps, HyperLogLog, geo.
- Persistence: **RDB** = periodic snapshot (compact, slow recovery rebuild), **AOF** = append every write (durable, larger, replay on start). Hybrid = RDB base + AOF tail.
- Replication: async, primary → replicas. WAIT command for sync semantics (not true sync).
- **Redis Cluster**: 16384 hash slots split across primaries. Each key hashed to a slot (CRC16). Use hash tags `{user42}:posts` to co-locate.
- Eviction policies (when `maxmemory` hit): `noeviction`, `allkeys-lru`, `allkeys-lfu`, `volatile-lru`, `volatile-ttl`. **Pick `allkeys-lru` for a cache; `noeviction` if Redis is your source of truth.**
- Pipelining batches commands; transactions = MULTI/EXEC (no rollback, atomic execution); Lua scripts are atomic.
- **In 10 seconds:** single-thread = avoid O(N) commands on big keys (KEYS, SMEMBERS on million-elem set).

### Cache stampede / TTL / hot keys
- **Stampede (dogpile / thundering herd)**: TTL expires → 1000 requests miss simultaneously → all hit DB.
- Mitigations:
  - **Lock / single-flight**: only one request rebuilds; others wait or return stale.
  - **Probabilistic early expiration (XFetch)**: refresh near expiry with growing probability.
  - **Stale-while-revalidate**: serve stale on miss, rebuild in background.
  - **Pre-warm / refresh-ahead** for predictable hot keys.
- **Hot key**: one key gets disproportionate traffic. Mitigations: client-side cache (TTL-per-process), key sharding (`user:42:shard0..N`), local cache in app + Redis as L2.
- **Negative caching**: store "miss" for short TTL to stop DB scans on non-existent keys.
- Cache penetration (lookups for missing rows) → bloom filter in front of cache.
- Cache avalanche (many keys expire at once) → jitter TTLs by ±10–20%.
- **In 10 seconds:** add jitter to every TTL, use single-flight on hot keys, never let one expiry cause a DB stampede.

### CDN basics
- Edge cache pop physically close to user (anycast routes you to the nearest PoP).
- **Origin pull** (default) vs **origin push** (rare, big files).
- Cache key = method + host + path + (optionally) query/headers (`Vary`). Configure carefully to avoid duplicate entries.
- Headers: `Cache-Control: max-age=N, s-maxage=N (CDN), public/private, no-store, no-cache (revalidate), stale-while-revalidate=N, stale-if-error=N`.
- ETag + `If-None-Match` → 304 (no body). Last-Modified + `If-Modified-Since` → same.
- TTLs: static asset = days/years (immutable filenames). API responses = seconds to minutes if any.
- Purge: tag-based, URL-based, or wildcard. Propagation usually < 30s.
- **In 10 seconds:** cache static aggressively (immutable URLs), cache dynamic only with very short TTL + SWR.

## Cheat numbers / formulas

- Cache hit ratio target: **> 90%** for hot paths to be worth it.
- Redis: ~100k ops/sec/core, ~50 μs P50 in-DC, ~150 μs cross-AZ.
- Redis Cluster: **16384 slots**, max recommended ~1000 nodes, but typical <100.
- Memcached: simpler, multi-threaded, slab allocator, no persistence, ~1M ops/sec.
- CDN cache hit: aim **> 95%** on static; < 50% means your cache key is too narrow.
- Cost saving: 1 cache hit ≈ 100–1000× cheaper than a DB query.
- Acceptable staleness ≈ **2 × TTL** for most user-facing data (TTL + propagation).
- Per-key memory in Redis: ~50–100 B overhead + value. 1 GB of Redis ≈ ~10M small string keys.

## Decision tree

- **Latency dominated by repeated reads?** Add a cache. Start with **cache-aside + short TTL + explicit invalidation on write.**
- **Write-heavy + tolerant of recent-write loss?** Write-behind.
- **Need strict cache↔DB consistency?** Write-through or skip caching and improve the DB.
- **Hot keys?** Add jitter, then client-side cache, then key sharding.
- **Single-region read scaling?** Redis primary + replicas with reads from replicas (accept lag).
- **Multi-region read scaling?** Per-region Redis, populated from per-region origin OR from a global change stream.
- **Static assets?** CDN with `immutable` + long TTL + hashed filenames.
- **Dynamic content?** CDN with very short TTL + stale-while-revalidate.
- **Don't know if a cache will help?** Measure the read-to-write ratio first; cache only when reads ≫ writes.

## Common pitfalls / "gotchas"

- **Cache invalidation on update is the bug**: write order DB-then-cache vs cache-then-DB both leak under failure. Pick "DB then delete cache" (not set) + accept brief miss.
- TTLs all the same → avalanche. Always jitter.
- Storing big blobs in Redis (>1 MB values) — slows event loop, blocks other ops.
- Using `KEYS *` in production — O(N) over entire keyspace, blocks Redis. Use `SCAN`.
- Relying on Redis as a durable store with only AOF `everysec` — you can lose up to 1s on crash.
- Treating CDN cache hit as if it accounts for `Vary: Cookie` — every cookie value = a separate cache entry.
- Forgetting that Redis Cluster does not support multi-key ops across slots (use hash tags or pipeline).
- Cache stampede solved by "just adding more Redis" — the bottleneck is the DB behind the cache.

## Related: see also
- [01 · Foundations cheatsheet](../01-foundations/cheatsheet.md) — DNS/anycast for CDN routing.
- [02 · Databases cheatsheet](../02-databases/cheatsheet.md) — the thing you're caching.
- [05 · Distributed cheatsheet](../05-distributed-systems/cheatsheet.md) — consistent hashing for cache cluster.
- [07 · HLD problems cheatsheet](../07-hld-problems/cheatsheet.md) — distributed-cache design problem.
