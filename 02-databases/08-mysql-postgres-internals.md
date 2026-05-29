# 08 — MySQL/Postgres Internals: B+ Tree, Query Planner, EXPLAIN

> Phase 2 • Databases • Topic 8/74

## Definition (interview-ready)

Relational databases like MySQL (InnoDB) and Postgres store rows in **B+ tree** indexes on disk, use a **query planner** to convert SQL into an execution plan based on table statistics, and expose that plan via **EXPLAIN**. Performance work means understanding how the planner picks plans and tuning indexes to give it good options.

## Why it matters

Most production performance issues in OLTP systems trace back to a missing index, a stale stats table, or a planner choosing a sequential scan when a seek would be 100× faster. If you can read an `EXPLAIN ANALYZE`, you can fix 80% of slow queries on day one of any new team.

<div class="sde-anim" data-anim="lsm-btree"></div>

## Core concepts

### B+ tree storage

- **B+ tree** = balanced, ordered tree where:
  - **Internal nodes** hold keys + pointers (no row data).
  - **Leaf nodes** hold all keys (and in Postgres, pointers to the heap row; in MySQL InnoDB, the actual row data).
  - Leaves form a **linked list** for fast range scans.
- High fanout (hundreds of keys per node) → very shallow (3–4 levels deep, even for billions of rows).
- Most reads = 3–4 page accesses → ~12–16 ms on HDD, μs on SSD with cache hits.

### Heap vs clustered storage

- **Postgres**: rows live in the **heap** (unordered file). Every index has pointers (TIDs) into the heap.
- **MySQL InnoDB**: rows live **inside the primary key's B+ tree** (clustered index). Secondary indexes store the PK value, not a row pointer.

Consequence:
- Postgres: cheap to add secondary indexes; PK change is normal.
- InnoDB: secondary index lookup = 2 B+ tree traversals (secondary → PK → row). Big PK = bloated secondary indexes. Choose a **small monotonic PK** (typically `BIGINT`).

### Index types

- **B-tree** (default): equality, range, sort.
- **Hash**: equality only. Postgres supports but B-tree is usually as good.
- **GiST / GIN / SP-GiST / BRIN** (Postgres): full-text, JSON, geo, etc.
- **Bitmap**: not a stored type in OLTP, but the planner can build bitmaps on the fly to combine indexes.
- **Covering index**: includes all columns the query reads — no heap fetch needed. Postgres `INCLUDE (...)`, MySQL just put them in the index.
- **Partial index** (Postgres): index only rows matching `WHERE` predicate. Smaller, faster, free of dead rows.

### Query planner

The planner uses **statistics** (sampled histograms, distinct counts) to estimate cardinality for each step and a **cost model** to choose between plans. Three phases:
1. **Parsing**: SQL → AST.
2. **Rewriting**: rules, view expansion, predicate push-down.
3. **Planning/optimizing**: enumerate alternatives, pick lowest cost.

Cost-based optimizers (CBO) — the choice depends on stats. **Bad stats = bad plans.** Run `ANALYZE` regularly (Postgres autovacuum does this).

### Join algorithms

- **Nested loop**: outer × inner. Great when outer is tiny or inner has an index.
- **Hash join**: build hash on smaller side, probe with larger. Great for equi-joins on big tables, no useful index.
- **Merge join**: both sides sorted on the join key. Great when input is naturally sorted or both sides have indexes.

### Sequential scan vs index scan

- **Seq scan**: read the whole table. Faster than index when you'll fetch >10–20% of rows (random I/O cost exceeds full read).
- **Index scan**: traverse B+ tree, fetch matching rows.
- **Index-only scan**: read only the index (all needed cols in it). No heap fetch.
- **Bitmap scan**: index produces bitmap of matching pages, then a single sequential pass over those pages (combines locality with selectivity).

### EXPLAIN basics

```
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42 AND status = 'OPEN';
```

Read top-down:
```
Index Scan using idx_user_status on orders  (cost=0.43..8.45 rows=2 width=...)
                                            (actual time=0.012..0.014 rows=2 loops=1)
  Index Cond: (user_id = 42 AND status = 'OPEN')
```

Key things to look for:
- **`Seq Scan`** on a big table with a selective predicate → missing index.
- **`Rows Removed by Filter`** = work done, then thrown away. Index doesn't cover the predicate.
- **Big gap between estimated and actual rows** → stale stats, run `ANALYZE`.
- **`Nested Loop` with high `loops=N`** = many round trips. Often want a hash join instead.

### MVCC (preview — full coverage in Topic 9)

Both Postgres and MySQL use MVCC: each row has multiple versions. Readers see a consistent snapshot without locking writers. Postgres marks rows as dead and relies on `VACUUM`; MySQL keeps old versions in an **undo log**.

## How it works (a query lifecycle)

```
1. Client sends SQL.
2. Parser → AST. Planner consults stats and indexes.
3. Planner picks Plan = Index Scan on idx_user_id, then Filter status='OPEN'.
4. Executor opens snapshot (MVCC), walks B+ tree to user_id=42, fetches matching rows.
5. Server returns rows over the wire.
```

## Real-world examples

- **Postgres at GitHub**: vacuum tuning is famously hard; long-running transactions block VACUUM and grow table bloat.
- **MySQL InnoDB at Shopify**: PK choice is critical — they enforce monotonic IDs to keep secondary indexes compact.
- **Multi-column index ordering**: `(user_id, status)` supports `WHERE user_id = ?` and `WHERE user_id = ? AND status = ?` — but **NOT** `WHERE status = ?` alone. Equality-first rule.

## Common pitfalls

- **Index on a low-cardinality column** (e.g., a boolean) — planner often ignores it. Use partial indexes instead.
- **Leading column rule**: composite index `(a, b)` doesn't help `WHERE b = ?`.
- **Functions / casts on the indexed column** → can't use index. `WHERE LOWER(email) = ?` needs an **expression index** on `LOWER(email)`.
- **`SELECT *`**: forces heap fetches and breaks index-only scans.
- **OR predicates** sometimes block index use → bitmap OR / UNION ALL of two queries can be faster.
- **N+1 in ORM**: rolling a hash join into a hand-crafted query is often 100× faster than ORM `.includes`.
- **Big text/JSON columns in the row**: bloats the heap, slows scans. Move to a side table if you don't always read them (or use TOAST in Postgres).
- **Postgres table bloat**: long transactions + many updates → dead tuples pile up → VACUUM can't reclaim. Causes slow scans.

## Interview questions

### Q1 — Easy: Why is a B+ tree faster than a sorted array for lookup?
A sorted array supports O(log n) lookup but O(n) inserts (shifting). A B+ tree gives O(log n) for both, plus efficient range scans via the leaf-level linked list, all while being friendly to disk page-sized reads.

### Q2 — Easy: What's the difference between a clustered and a non-clustered index?
A **clustered index** physically orders the table data (or *is* the table data) by the index key — InnoDB's PK is clustered. A **non-clustered (secondary)** index stores key + pointer/PK; the actual row lives elsewhere. Clustered scan is sequential; non-clustered lookup requires a second hop.

### Q3 — Medium: When would a sequential scan be faster than an index scan?
When the predicate is unselective (matching > ~10–20% of rows) — the random I/O of index-scan + heap-fetch exceeds the cost of a single sequential pass. The planner makes this decision based on stats.

### Q4 — Medium: Walk through EXPLAIN ANALYZE output and what you'd look for.
Top-down: identify each operator (Seq Scan, Index Scan, Bitmap Heap Scan, Nested Loop, Hash Join). Check estimated vs actual rows — wildly off means stats issue. `Rows Removed by Filter` indicates inefficient predicates. High `loops` on nested-loop = potential hash-join opportunity. `Buffers` (with BUFFERS option) tells you cache vs disk reads.

### Q5 — Medium: How do you design a composite index?
Put the column used with **equality** first, then range/sort columns. Match the most common query pattern. Add columns to the right to enable index-only scans. Be mindful of index size — every write updates every index.

### Q6 — Hard: An EXPLAIN shows estimated rows = 10, actual rows = 1,000,000. What happened and what do you do?
The planner has wrong stats. Either (1) autovacuum/ANALYZE hasn't run recently after a big load, (2) the histogram bucket is too coarse, (3) correlation between columns isn't captured. Fix: `ANALYZE table`, increase `default_statistics_target` for that column, or create extended statistics (`CREATE STATISTICS`).

### Q7 — Hard: A query that used to be fast is now slow with no schema or query changes. How do you investigate?
- Check the new EXPLAIN plan vs the old one — did it switch from index to seq scan?
- Stats drift: `ANALYZE` and re-check.
- Table bloat: `pg_stat_user_tables` (Postgres) — many dead tuples?
- Lock contention: is a long transaction holding `AccessShareLock`?
- Storage: SSD wearing out, disk full triggering log flush stalls?
- Plan parameterization: parameter sniffing in prepared statements (SQL Server especially).

### Q8 — Hard: Design indexes for an `orders` table queried by `(user_id, status)`, `(created_at DESC)`, and `(merchant_id, created_at)` — millions of rows, mostly recent reads.
- `idx_user_status (user_id, status)` — equality on both.
- `idx_created (created_at DESC)` — recent rows fast for global feed; consider a **partial index** `WHERE created_at > now() - interval '30 days'` to keep it small.
- `idx_merchant_created (merchant_id, created_at DESC)` — merchant dashboards.
- Watch for write amplification (3 secondary indexes × every insert). Run `pg_stat_user_indexes` to confirm they're actually used.

## TL;DR cheat sheet

- B+ tree = high-fanout, leaf-linked. 3–4 levels for billions of rows.
- InnoDB clusters rows in the PK B+ tree. Postgres uses a separate heap.
- Cost-based planner picks plans from **stats** — keep them fresh (`ANALYZE`).
- Joins: nested loop (tiny outer + indexed inner), hash (big equi-join), merge (sorted inputs).
- `EXPLAIN ANALYZE` reads top-down; look for Seq Scan on big tables, big estimate-vs-actual gaps, `Rows Removed by Filter`.
- Composite index: equality columns first.
- Index-only scan = covering all needed columns in the index. Fastest path.
- Functions on indexed columns kill index use unless you have expression indexes.

## Go deeper

- **Use The Index, Luke**: [use-the-index-luke.com](https://use-the-index-luke.com/) — short, free, exceptional.
- **DDIA Chapter 3** — storage internals.
- **Postgres docs**: [Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html), [Indexes](https://www.postgresql.org/docs/current/indexes.html).
- **Hussein Nasser**: Database Engineering playlist (B-trees, MVCC, query lifecycle).
- **High Performance MySQL** (Schwartz, Zaitsev) — bible for InnoDB tuning.
- **pganalyze blog** — best Postgres performance content on the internet.
- **Tool**: [explain.depesz.com](https://explain.depesz.com/) and [explain.dalibo.com](https://explain.dalibo.com/) for visualizing plans.
