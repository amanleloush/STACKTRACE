---
title: Databases — cheatsheet
---

# Databases · Cheatsheet

> One-page recall for Databases. Print, paste in Notion, glance before the system design interview.

## What this section covers
The data layer: relational engines (MySQL/Postgres) and their B-tree + WAL internals, ACID transactions and isolation levels, replication and sharding strategies, and the NoSQL trio every interview asks about — MongoDB (document), Cassandra/Scylla (wide-column LSM), and Elasticsearch (inverted-index search).

## Key topics (the 5-minute recall)

### MySQL / Postgres internals
- **Both store rows in B+ trees indexed by primary key; both write a WAL first.**
- MySQL InnoDB: **clustered index on PK** (leaf = full row). Secondary indexes store PK, so secondary lookup = 2 B-tree walks.
- Postgres: heap files + indexes are separate; **MVCC via tuple versions** in the heap → needs VACUUM. MySQL MVCC is in undo log.
- WAL aka redo log (MySQL) / WAL segments (PG). fsync on commit → durability (D in ACID).
- Index types: B-tree (default), Hash (PG, exact match), GIN (PG, jsonb/full-text), BRIN (PG, time-series).
- Query planner: cost-based using stats. `EXPLAIN ANALYZE` is your friend; watch for seq-scan + sort + nested-loop on big tables.
- Typical: a single MySQL box handles ~**5k–20k QPS** with sub-ms primary-key reads.
- **In 10 seconds:** B+ tree on disk, WAL ahead of writes, MVCC for concurrent reads — that's "an RDBMS."

### Transactions & isolation
| Level | Dirty read | Non-repeatable | Phantom | Default |
|---|---|---|---|---|
| Read Uncommitted | ✓ | ✓ | ✓ | rare |
| Read Committed | ✗ | ✓ | ✓ | **Postgres, Oracle** |
| Repeatable Read | ✗ | ✗ | ✓\* | **MySQL InnoDB** |
| Serializable | ✗ | ✗ | ✗ | most expensive |

\* InnoDB RR actually prevents phantoms via next-key locks; PG RR (snapshot) does not.

- **ACID**: Atomicity (all or nothing), Consistency (constraints hold), Isolation (concurrent illusion), Durability (survives crash).
- Locking: shared (S) for reads, exclusive (X) for writes. Deadlock detection on cycle → one txn aborts.
- MVCC = readers don't block writers and vice versa. Cost: tuple versions, vacuum/cleanup.
- Snapshot isolation ≠ serializable (write-skew anomaly).
- **In 10 seconds:** RC by default in Postgres, RR in MySQL; bump to Serializable only when business logic needs it.

### Replication & sharding
- Replication topologies: **single leader** (one writer, many readers), multi-leader (rare, conflict hell), leaderless (Dynamo/Cassandra).
- MySQL: async binlog. Postgres: streaming WAL (sync or async). Lag = staleness on reads.
- Sync replication = strong, slow. Async = fast, lossy on failover. Semi-sync = wait for one replica ack.
- Read-replica gotcha: stale reads. Route reads with explicit consistency requirements to leader.
- Sharding strategies: **range** (good for scans, hot spots), **hash** (even, no scans), **directory** (lookup table → flexibility, extra hop), **consistent hash** (rebalances on node change).
- Resharding is painful — pick PK with care (high-cardinality, write-distributing).
- **In 10 seconds:** single-leader async covers 95% of services; shard only when one box runs out of CPU/disk/connections.

### MongoDB
- Document store: BSON, collections, dynamic schema. PK = `_id` (ObjectId or set explicitly).
- WiredTiger storage engine: B-tree + compression. WAL = journal (fsync ~100ms).
- Replica set = primary + secondaries. Election via Raft-like protocol; quorum-based commit.
- Sharding via `mongos` router + config servers; shard key chosen at collection creation (immutable in older versions, mutable since 5.0).
- Indexes: single-field, compound (ESR rule: equality, sort, range), text, geo (2dsphere).
- Transactions: multi-doc since 4.0 (replica), 4.2 (sharded). Snapshot isolation. Slower than single-doc.
- Aggregation pipeline: `$match → $group → $project`. Push `$match` early (predicate pushdown).
- **In 10 seconds:** schema-flexible, single-doc atomic by default, shard-key is destiny.

### Cassandra / ScyllaDB
- **Wide-column LSM, leaderless replication.** No primary, all nodes equal.
- Data model: keyspace → table → partition key (where) + clustering key (order within partition).
- Partitioner: Murmur3 hash → token ring. Replication factor (RF) typically 3.
- Consistency: per-query. `ONE`, `QUORUM` (RF/2+1), `ALL`, `LOCAL_QUORUM` (multi-DC). **R + W > RF = strong reads**.
- LSM: writes → commit log + memtable → flush SSTables → compaction (size-tiered or leveled).
- Read amplification: check memtable + multiple SSTables + bloom filter. Slow reads if not careful.
- Scylla = C* protocol-compatible, written in C++ with shard-per-core (Seastar). 5-10× throughput.
- Bad at: joins (don't), secondary indexes (ok small cardinality), unbounded partitions (>100MB per partition = pain).
- **In 10 seconds:** model the table per query, pick partition key to spread writes and keep hot data in one partition.

### Elasticsearch
- Built on Lucene. **Inverted index**: term → posting list of doc IDs.
- Documents → indices → shards (immutable count per index) → replicas.
- Segments are immutable; new writes go to a new segment, deletes are tombstones. Merge in background.
- Refresh interval (default 1s) controls near-real-time visibility. Commit = fsync segment.
- Query DSL: bool (must/should/filter/must_not), match (analyzed), term (exact). **`filter` is cacheable + no scoring → use it for non-relevance predicates.**
- Mappings = schema. Once set, mostly immutable; reindex to change.
- Analyzers: tokenizer + filters. Standard for English; custom for IDs, n-grams for autocomplete.
- Not a primary store — typically fed from MySQL/Kafka. Loss-tolerant (rebuild from source).
- **In 10 seconds:** inverted index of analyzed terms, near-real-time (1s refresh), don't use as source of truth.

## Cheat numbers / formulas

- B+ tree depth for 100M rows ≈ **3–4 levels** (fanout 100–500).
- A single MySQL primary saturates around 5k–20k write QPS, 10k–50k read QPS on commodity SSD.
- Postgres VACUUM should run before bloat exceeds **20%** of relation size.
- Cassandra: keep a single partition < **100 MB** and < ~100k cells; bigger = compaction/repair pain.
- ES heap: ≤ **30 GB** (compressed oops); above that JVM stops compressing pointers.
- Replication factor for prod: **3** (survives 1 failure with quorum reads/writes).
- Index overhead: ~30% disk per indexed column on a B-tree; less for BRIN, more for GIN.
- Per-row size estimate: text fields × utf8 (1–4 B/char) + ints (4–8 B) + 20–40 B overhead per row.

## Decision tree

- **Need ACID + relations + ad-hoc joins?** Postgres.
- **OLTP at scale on commodity hardware, primary writer?** MySQL (proven ops story).
- **Schema-flexible, single-doc updates, ok with eventual indexes?** MongoDB.
- **Massive write throughput, time-series, no joins, ok being eventually consistent?** Cassandra/Scylla.
- **Full-text search, aggregations, ad-hoc filters across user-facing data?** Elasticsearch (read-only mirror).
- **Need strong consistency in a NoSQL?** Cassandra with `QUORUM` R+W, or use a NewSQL (Spanner/CockroachDB).
- **One box can't keep up?** Shard. Pick a key that distributes load and rarely needs cross-shard joins.
- **Stale read OK?** Read replica. **Not OK?** Read from leader (or use `MAX(GTID)`-style read-your-writes).

## Common pitfalls / "gotchas"

- Treating read replicas as if they were strongly consistent — async means lag (sometimes seconds).
- Setting Cassandra consistency to `ONE` and hoping for the best — you'll get stale or lost data.
- Hot partitions in Cassandra / shard hot spots in MySQL — caused by low-cardinality keys (e.g., `country`, `today's date`).
- Using ES as a primary store — segments can corrupt, indexes get reindexed; have a source.
- Repeatable Read in PG ≠ Repeatable Read in MySQL InnoDB (the second blocks phantoms via gap locks).
- Forgetting that **PG MVCC writes new tuples** → tables bloat without VACUUM; long transactions block VACUUM.
- Indexing every column "just in case" — each index is a B-tree to maintain on every write.
- Sharding too early. A single Postgres box is much more capable than people give it credit for.

## Related: see also
- [01 · Foundations cheatsheet](../01-foundations/cheatsheet.md) — storage IOPS, fsync semantics.
- [03 · Caching cheatsheet](../03-caching-redis/cheatsheet.md) — caching in front of the DB.
- [05 · Distributed cheatsheet](../05-distributed-systems/cheatsheet.md) — CAP/PACELC trade-offs that explain quorum.
- [06 · HLD patterns cheatsheet](../06-hld-patterns/cheatsheet.md) — sharding strategies and schema evolution.
