# 41 — HLD: Distributed Cache (Redis Cluster)

> Phase 7 • HLD Problems • Topic 41/74

## Problem statement

Design a distributed cache cluster (Redis-style) for sub-ms reads of hot keyed data, horizontally scalable, with replication for HA and consistent hashing for sharding.

## Requirements

### Functional
- KV operations: GET, SET, DEL.
- TTL per key.
- Eviction when memory full.
- Replication for HA.
- Online resharding (no downtime).

### Non-functional
- p99 read latency < 5 ms.
- Throughput: millions of ops/sec aggregate.
- Highly available (single node failure tolerated).
- Eventual consistency on writes is OK.

## Scale estimation

- 1B keys at 500 bytes each = ~500 GB hot data.
- Cluster of 20 nodes × 32 GB each = 640 GB raw, with RF=2 = 320 GB usable.
- Throughput: 1M ops/sec aggregate → ~50K ops/sec per node.

## High-level architecture

```
                        ┌────────────┐
   Client SDK ───────►  │ Proxy /    │ ── consistent hash → shard
                        │ Cluster    │
                        │ Client     │
                        └─────┬──────┘
                              ▼
                       ┌──────────────┐
                       │  16,384      │
                       │  hash slots  │
                       └──┬───┬───┬───┘
                          ▼   ▼   ▼
                       [N1] [N2] [N3] ... [N20]
                          (primary + 1 replica each)
                          
                       Cluster bus (gossip) ──────► cluster state, failover
```

## Detailed design

### Sharding via hash slots (Redis Cluster model)

- 16,384 slots distributed across N primary nodes.
- Key → slot via `CRC16(key) % 16384`.
- Hash tags: keys with `{tag}` substring hash on `tag` only — colocate related keys.
- Slot movement is online; nodes update each other via cluster bus.

### Replication

- Each primary has 1 (or more) replica.
- Async replication (fast writes; small replication lag).
- On primary failure: replica is promoted (gossip-based election).
- Clients discover topology via `CLUSTER NODES` or `CLUSTER SLOTS`.

### Client topology awareness

- Smart clients (e.g., redis-py-cluster, lettuce, redisson) cache the slot map.
- On `MOVED` / `ASK` response, refresh slot map.
- One round trip in the steady state.

### Memory + eviction

- Set `maxmemory` per node.
- Choose eviction policy (`allkeys-lru` for general cache).
- Eviction is sampled (approximate LRU); rarely an issue.

### TTLs

- Stored per key.
- Expiration is lazy + sampled periodic — not instant but close.
- Use to cap "stale" duration.

### Persistence (optional for caches)

- Pure cache: no persistence (fastest).
- Cache with warmup: RDB snapshot + AOF for restart.

### Online resharding

- Add new nodes.
- Move slots from existing nodes (slot-by-slot copy in background).
- Clients get redirected (`ASK`/`MOVED`) during transition.
- Completion: cluster rebalanced.

### Hot-key problem

If one key (`celebrity_user`) takes 100K QPS, one shard saturates.

Solutions:
- **Read replicas** for that key: clients can hit any replica.
- **Local hot-key cache** at the application server: short-TTL Caffeine/Guava cache.
- **Key splitting**: store under N keys (`key:0`, `key:1`, ..., `key:N-1`), clients pick one at random.

### Big-key problem

A single key with 1 GB value (huge sorted set) — single-thread Redis blocks on operations.

Solutions:
- Split into smaller keys.
- Use SCAN-based operations instead of full reads.
- Move to a different store (sometimes the data shouldn't be in Redis).

## Bottlenecks & optimizations

- **Pipelining**: batch many commands per round trip → enormous throughput gain.
- **Tail-latency**: occasional fork-related stalls during BGSAVE/AOF rewrite — tune or disable persistence on pure caches.
- **Cross-slot operations**: forbidden. Restructure with hash tags if you need multi-key transactions.
- **Cluster bus**: gossip cost grows with N; ~100-200 nodes per cluster is the practical ceiling. Beyond that, multi-cluster.

## Trade-offs

- **Cluster mode vs single-node + Sentinel**: cluster scales writes (sharding); Sentinel is HA without sharding. Pick cluster only when single-node memory/throughput insufficient.
- **Async vs sync replication**: Redis Cluster uses async (default) — fast, but writes can be lost on primary failure within the replication window. WAIT command can force sync-like ack.
- **Pure cache vs durable**: pure cache loses data on full cluster failure. Acceptable for caches; not for source-of-truth.

## Interview questions

### Q1: How does Redis Cluster partition data?
By 16,384 hash slots. Key → CRC16(key) % 16384 → slot owner. Hash tags `{tag}` force keys to the same slot for multi-key operations.

### Q2: How does failover work?
Each primary has a replica. Replicas monitor primary via gossip pings. On loss, replicas vote (cluster-bus consensus); winner is promoted. Other nodes update their topology. Clients receive MOVED responses for affected keys until they refresh slot map.

### Q3: Can you do multi-key operations across shards?
Not by default — Redis Cluster rejects cross-slot commands. Use hash tags `{user42}:profile` and `{user42}:cart` to ensure colocation. For larger transactions, restructure the data model or use external coordination.

### Q4: How would you handle a hot key receiving 1M QPS?
- Read replicas (clients hit any).
- Local in-process cache with short TTL.
- Key splitting (N copies under different keys; client picks one).
- CDN if the data is static enough to push there.

### Q5: How would you online-reshard from 10 to 20 nodes?
- Add 10 new nodes.
- Initiate slot migration: each existing node moves ~N/2 of its slots to a new node.
- Clients see ASK redirects during transition; complete migration; topology stabilizes.
- Run during low-traffic; monitor latency.

### Q6: What if the entire cluster restarts (no persistence)?
- All data lost; cache is cold.
- Cold cache means all reads hit the backing store → potential overload.
- Mitigations: persist with AOF (slower writes), or have a warm-up procedure (replay top N keys), or run the cluster in HA mode so a full restart is rare.

### Q7: Compare consistent hashing vs Redis Cluster's hash slots.
Both partition keys across nodes. Consistent hashing uses a ring; resharding moves only ~1/N keys per node added. Hash slots are 16384 fixed slots reassigned to nodes; rebalancing moves a small fraction of slots between nodes. Functionally similar; hash slots are simpler to reason about (you can list "which slots does N1 own?") and easier for online migration.

### Q8: What if Redis Cluster isn't enough — too many nodes, gossip overhead?
- **Federated clusters**: multiple smaller clusters, app routes by namespace.
- **Different cache product**: Cassandra (not as fast for KV), Memcached cluster (simpler, no replication), or specialized (Apache Ignite, Hazelcast).
- **Cell-based architecture**: each cell has its own Redis cluster; tenant pinning to cell.

## TL;DR cheat sheet

- 16,384 hash slots distributed across primaries; 1 (or more) replicas each.
- Async replication, gossip-based failover.
- Smart clients cache topology; refresh on MOVED/ASK.
- Hash tags for multi-key locality.
- Eviction (`allkeys-lru`) for cache use.
- Hot key: replicas + local cache + key splitting.
- Big key: split or move out of Redis.
- Pipelining for throughput.

## Go deeper

- **Redis docs**: [scaling/cluster](https://redis.io/docs/management/scaling/) and [cluster spec](https://redis.io/docs/reference/cluster-spec/).
- **ByteByteGo**: Redis cluster videos.
- **Hussein Nasser**: Redis internals + cluster deep dives.
- **Antirez blog** (Salvatore Sanfilippo): history of Redis Cluster decisions.
- **Topic 15** in this collection (Redis deep).
- **Memcached docs**: alternative architecture for comparison.
