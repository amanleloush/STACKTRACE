# 51 — Spark Internals: DAG, Shuffle, Partitioning, Skew

> Phase 8 • Data Engineering • Topic 51/74

## Definition (interview-ready)

**Apache Spark** is a distributed computation engine that represents jobs as a **DAG** of transformations on resilient distributed datasets (RDDs / DataFrames). It executes lazily, splits into **stages** at **shuffle** boundaries, and parallelizes work across **partitions**. The performance killer is **shuffle** (cross-node data exchange) and its enemy: **data skew** (uneven partition sizes).

## Why it matters

Spark powers most modern big-data pipelines (ETL, ML, Kafka-stream-to-warehouse). Understanding shuffle, partitioning, and skew is the difference between "10 min job" and "10 hour job that fails."

## Core concepts

### Lazy evaluation + DAG

Operations are **transformations** (`map`, `filter`, `join`) that build a DAG, not executed. **Actions** (`collect`, `count`, `write`) trigger execution.

The Spark Catalyst optimizer:
1. Parses SQL or DataFrame ops.
2. Builds a logical plan.
3. Optimizes (predicate pushdown, projection pruning, join reordering).
4. Generates a physical plan.
5. Splits into stages at shuffle boundaries.
6. Sends tasks to executors.

### Partitions

- Data split into partitions; one task per partition.
- Partition count = parallelism unit.
- Defaults: 200 shuffle partitions (`spark.sql.shuffle.partitions`).
- Tune: target 100-500 MB per partition is a healthy heuristic.

### Narrow vs wide transformations

- **Narrow** (`map`, `filter`, `union`): each input partition contributes to one output partition. No network shuffle.
- **Wide** (`groupBy`, `join`, `repartition`): data must be reshuffled across nodes by some key. **Stage boundary**.

### Shuffle (the cost center)

When data must be redistributed by key (group, join, repartition):
1. **Map side**: each input partition writes its records to N output files (one per reducer), keyed by hash.
2. **Reduce side**: each reducer reads its corresponding file from all mappers across the network.

Costs:
- Network I/O across N×M paths.
- Disk I/O (shuffle files spill to disk).
- Serialization.
- GC pressure.

Reducing shuffle is the biggest performance lever in Spark.

### Skew

A partition with disproportionately more data → that task takes far longer → whole stage slow → cluster idle waiting.

Causes:
- Group/join key has hot values (one customer has 50% of data).
- NULL keys colliding into one partition.
- Bad partitioner.

Mitigations:
- **Salting**: append random suffix to the key before group/join, then aggregate.
- **Broadcast join**: if one side is small, broadcast it to all executors (no shuffle).
- **Adaptive query execution (AQE)** (Spark 3.0+): detects skew at runtime, splits skewed partitions automatically.
- **Bucketing**: pre-bucket data on a key in storage; shuffle skipped for matching joins.
- **Skew hints**: explicit hints to the optimizer.

### Broadcast join

For "small × big" join: broadcast small side as a hash table to every executor; join locally → no shuffle.

Spark auto-broadcasts tables below threshold (`spark.sql.autoBroadcastJoinThreshold`, default 10MB). Manual broadcast via `broadcast(df)`.

### Sort-merge join

For "big × big" join: shuffle both sides on the join key, sort each partition, merge. Standard for large joins. Skew prone.

### Shuffle hash join

For "big × medium" join: shuffle both sides; smaller side built as a hash table per partition. Faster than sort-merge if memory allows.

### Caching / persistence

- `df.cache()` or `df.persist(StorageLevel.MEMORY_AND_DISK)`: keep DataFrame in memory across actions.
- Helps when a DataFrame is reused multiple times — avoid recomputing.
- Be aware of memory cost; OOM if you cache too much.

### Adaptive Query Execution (AQE, Spark 3.0+)

Runtime optimizations:
- Dynamic shuffle partition coalescing (combine small ones).
- Skew handling (split skewed partitions).
- Switch sort-merge to broadcast if a stat indicates it's now safe.

Enable: `spark.sql.adaptive.enabled = true`. Default in Spark 3.2+.

### Predicate pushdown + projection pruning

The optimizer pushes filters and column selection down to the source:
- Parquet: read only the columns needed, skip row groups that don't match the predicate.
- JDBC: push WHERE clauses to the source DB.
- Often the biggest single optimization.

## How it works (a join with shuffle)

```
df1.join(df2, "user_id"):
  Stage 1: read df1 (map) → write shuffle files keyed by hash(user_id)
  Stage 2: read df2 (map) → write shuffle files keyed by hash(user_id)
  Stage 3 (post-shuffle): each partition reads its matching files from df1 + df2,
           sort-merge, emit join results.
```

## Real-world examples

- **Databricks**: commercial Spark; pretty much every Fortune 500 data team.
- **Netflix Iceberg + Spark**: petabyte-scale ETL.
- **Uber, Pinterest, Lyft**: huge Spark fleets for ETL + ML.
- **dbt over Spark SQL**: SQL-driven ETL on top of Spark.

## Common pitfalls

- **Many small files**: each Parquet file = one Spark task = overhead. Compact via `OPTIMIZE` or coalesce.
- **Too few partitions**: parallelism underutilized.
- **Too many partitions**: scheduling overhead, tiny tasks.
- **Wide join with skew**: one task at 99% completion forever.
- **`collect()` on big data**: brings everything to driver → OOM.
- **Caching everything**: memory exhaustion.
- **Inappropriate use of UDFs**: Python UDFs slow due to serialization. Prefer Spark SQL / vectorized UDFs.
- **Bad partition keys for output**: too many partitions per writer → small file explosion.
- **Cluster sizing**: too many tasks per executor → contention; too few → idle resources.

## Interview questions

### Q1: What's a stage in Spark?
A unit of execution bounded by shuffle. All transformations between shuffles are in the same stage and pipelined together. When a shuffle is needed, the stage ends; a new stage starts on the shuffled data.

### Q2: Why is shuffle expensive?
Network I/O across all mappers × all reducers. Disk I/O (shuffle files spill). Serialization/deserialization. GC pressure. Often the biggest fraction of job runtime.

### Q3: What is data skew and how do you handle it?
Skew = some partitions have far more data than others, blocking the stage. Mitigations: salt the key (random suffix), broadcast join (if small side), adaptive query execution (Spark 3 auto-handles), bucketing, custom partitioners. Sometimes pre-aggregate or filter out skewed values.

### Q4: When does Spark choose broadcast join vs sort-merge?
Broadcast: if one side is below `autoBroadcastJoinThreshold` (default 10 MB). Build a hash table on each executor; no shuffle. Sort-merge: both sides big. Shuffle and merge. AQE can switch at runtime.

### Q5: What does AQE do?
At runtime: coalesces small shuffle partitions, splits skewed partitions, can switch sort-merge to broadcast if shuffle stats now indicate it's safe. Default-on in Spark 3.2+.

### Q6: A Spark job has 1 task that takes 90% of total time. Diagnose.
Classic skew: one partition has disproportionate data. Look at Spark UI: stage details show per-task input size. Identify the key with the huge volume. Apply salting on the join/groupBy key, or filter that key separately, or broadcast the small side.

### Q7: 1 million small Parquet files in S3 → Spark job slow. Why and fix?
Each file → at least one task; per-task overhead (planning, S3 metadata listing, task launch) dominates. Fixes:
- Compact small files into larger ones (OPTIMIZE in Delta, custom compaction job).
- Increase target file size on write (~128 MB+).
- Tune Spark to handle many small files (`spark.sql.files.maxPartitionBytes`).
- Use a file format that supports manifest-based reads (Iceberg, Delta).

### Q8: How would you optimize a join of two 10 TB tables?
- Use a columnar format (Parquet/ORC) with predicate pushdown.
- If joinable by partition, use bucketing on the join key.
- Adequate shuffle partitions (`spark.sql.shuffle.partitions` tuned to ~1000-2000 for 10 TB).
- Enable AQE.
- Detect and handle skew explicitly.
- Use `EXPLAIN` to see the plan.
- Sufficient cluster resources (memory and cores per executor).

## TL;DR cheat sheet

- Spark = lazy DAG → stages bounded by shuffle.
- Narrow transformations: no shuffle. Wide: shuffle (stage boundary).
- Shuffle is the cost center; reduce it.
- Skew: one partition huge → fix with salting, broadcast, AQE.
- Broadcast join for small × big. Sort-merge for big × big.
- AQE (Spark 3.0+) auto-handles shuffle coalescing + skew at runtime.
- Predicate pushdown + projection pruning huge win with columnar files.
- Avoid many small files; compact regularly.

## Go deeper

- **Sameer Farooqui**: [Advanced Spark Training (YouTube)](https://www.youtube.com/watch?v=7ooZ4S7Ay6Y).
- **Databricks**: [Learning Spark 2nd Ed (free)](https://www.databricks.com/resources/ebook/learning-spark-2nd-edition).
- **Spark docs**: [SQL performance tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html).
- **Databricks blog**: [Adaptive Query Execution](https://www.databricks.com/blog/2020/05/29/adaptive-query-execution-speeding-up-spark-sql-at-runtime.html).
- **Book**: *Spark: The Definitive Guide* (Chambers, Zaharia).
- **DDIA Chapter 10** — batch processing.
