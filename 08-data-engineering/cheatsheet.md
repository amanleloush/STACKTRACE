---
title: Data engineering — cheatsheet
---

# Data engineering · Cheatsheet

> One-page recall for data engineering. Print, paste in Notion, glance before the system design interview.

## What this section covers
The data-platform side of the house: batch vs streaming (Lambda + Kappa), Spark internals, Trino/Presto for ad-hoc query, file formats (Parquet/ORC/Avro), lakehouse table formats (Iceberg/Delta/Hudi), Airflow orchestration, SCD types, data quality / lineage, and PII handling.

## Key topics (the 5-minute recall)

### Batch vs streaming — Lambda & Kappa
- **One-line definition.** Lambda = two pipelines (batch for exact, stream for fresh); Kappa = one stream pipeline, replay for backfill.

| | Lambda | Kappa |
|---|---|---|
| Pipelines | 2 (batch + speed) | 1 (stream) |
| Code dup | Yes (same logic twice) | No |
| Reprocessing | Re-run batch | Replay Kafka |
| When right | Mature batch + needs real-time too | Greenfield, Kafka-centric |

- Batch latency: minutes–hours (Spark/Hive on HDFS/S3). Stream latency: milliseconds–seconds (Flink/KStreams).
- Kafka log retention is the replay window for Kappa — 7–30 days typical.
- **In 10 seconds:** Lambda has correctness, Kappa has simplicity; greenfield → Kappa.

### Spark internals
- **One-line definition.** Distributed DAG executor: driver builds a DAG, executors run tasks on partitions in parallel.
- **RDD** = low-level, immutable distributed collection; **DataFrame/Dataset** = RDD + schema + Catalyst optimizer.
- **Catalyst** = query optimizer (logical → physical plan, predicate pushdown, column pruning). **Tungsten** = whole-stage codegen + off-heap memory.
- **Stages** = sequence of tasks separated by **shuffles** (wide dependencies). Narrow ops (`map`, `filter`) stay in one stage; wide ops (`groupBy`, `join`, `reduceByKey`) force shuffle.
- **Shuffle** = disk write + network — the #1 perf killer. Default `spark.sql.shuffle.partitions = 200`.
- **Broadcast join**: small table (< 10 MB by default, `spark.sql.autoBroadcastJoinThreshold`) sent to every executor → no shuffle.
- **Partitioning**: aim for 100–200 MB per partition; tune `repartition()` vs `coalesce()`.
- Skew handling: salting the key, AQE (Adaptive Query Execution in Spark 3+), `skew hint`.
- **In 10 seconds:** stages are split by shuffles; broadcast small tables; tune shuffle partitions for data size.

### Trino / Presto (MPP)
- **One-line definition.** Massively-parallel SQL engine for federated, ad-hoc analytics across S3/Hive/Kafka/Mongo.
- **No fault tolerance per query** (until Trino's recent fault-tolerant exec): a single failed task kills the query. Designed for interactive (< 1 min) workloads.
- Pushdown to connectors: predicate, column, aggregate (varies per connector).
- Coordinator + workers; in-memory exchange (no disk shuffle by default).
- **vs Spark**: Trino = interactive SQL, in-memory, no fault tolerance per task. Spark = ETL/batch, disk shuffle, fault-tolerant.
- **In 10 seconds:** Trino for interactive SQL across many sources; Spark for ETL.

### File formats — Parquet / ORC / Avro

| | Parquet | ORC | Avro |
|---|---|---|---|
| Layout | Columnar | Columnar | Row |
| Best for | Analytics / read-heavy | Hive ecosystem, ACID | Streaming, schema evolution |
| Compression | Snappy/Gzip/Zstd; high (columnar locality) | Zlib/Snappy; highest among 3 | Snappy/Deflate; row-locality only |
| Splittable | Yes | Yes | Yes (with sync markers) |
| Schema evolution | Limited (add/reorder; rename hard) | Better than Parquet | Best (forward + backward) |
| Predicate pushdown | Yes (min/max + bloom) | Yes (min/max + bloom + index) | No |

- Columnar wins for OLAP scans of few columns over many rows (typical aggregation).
- Row format (Avro) wins for Kafka payloads + schema registry compatibility.
- Parquet block size: 128–256 MB; row-group size: 64–128 MB. Match HDFS/S3 part size.
- **In 10 seconds:** Parquet for analytics, Avro for streaming, ORC if you're deep in Hive.

### Lakehouse — Iceberg / Delta / Hudi

| | Iceberg | Delta Lake | Hudi |
|---|---|---|---|
| Engine origin | Netflix → Apache | Databricks → Linux Foundation | Uber → Apache |
| Storage | Manifest files on S3/HDFS | _delta_log JSON on S3 | Timeline + base + log files |
| Best at | Multi-engine (Spark, Trino, Flink, Snowflake) | Spark / Databricks ecosystem | Streaming upserts (CoW + MoR) |
| ACID | Optimistic concurrency | Optimistic + Delta protocol | Optimistic |
| Schema evolution | Full (add, drop, rename) | Yes | Yes |
| Time travel | Yes (snapshot IDs) | Yes (versionAsOf) | Yes (incremental queries) |
| Killer feature | Hidden partitioning | Z-order + photon | Upserts on streaming data |

- **CoW (Copy-on-Write)** = rewrite files on update — read-fast, write-slow.
- **MoR (Merge-on-Read)** = write delta log, merge at read — write-fast, read-slow. Hudi supports both.
- All three solve the "no ACID on S3" problem of raw Parquet on Hive metastore.
- **In 10 seconds:** Iceberg for multi-engine open, Delta for Databricks, Hudi for streaming upserts.

### Airflow internals
- **One-line definition.** Python-defined DAG scheduler — operators (tasks) connected by dependencies, run on schedule or trigger.
- Components: scheduler, executor, webserver, metadata DB (Postgres typically), workers.
- **Executor types**:
  - **SequentialExecutor**: dev only, one task at a time.
  - **LocalExecutor**: parallel on one machine, multi-process.
  - **CeleryExecutor**: distributed via Redis/RabbitMQ broker.
  - **KubernetesExecutor**: each task = one Pod, isolated env.
  - **CeleryKubernetesExecutor**: hybrid.
- DAG run = one execution of the DAG at a `logical_date` (a.k.a. `execution_date`).
- **Idempotency**: tasks must be re-runnable on the same logical_date.
- Common pitfall: top-level code in DAG file runs on every parse (every ~30 s) — keep heavy imports inside operators.
- **In 10 seconds:** DAGs are Python; Kubernetes executor for isolation; tasks must be idempotent.

### Slowly Changing Dimensions (SCD)
- **Type 0**: never changes. **Type 1**: overwrite (no history). **Type 2**: new row per change with `effective_from/to`, `is_current` (canonical). **Type 3**: extra column for previous value. **Type 4**: separate history table. **Type 6**: hybrid 1+2+3.
- **In 10 seconds:** SCD2 unless you don't need history.

### Data quality + lineage
- DQ checks: schema, completeness (null %), uniqueness, freshness, range, referential.
- Tools: **Great Expectations**, **dbt tests**, **Soda**, **Monte Carlo**, **Bigeye**, **Anomalo**. Lineage: **OpenLineage** spec → **Marquez**, **DataHub**, **Atlas**, **Amundsen**, **Collibra**.
- Lineage levels: dataset, column-level (gold standard), transformation.
- **In 10 seconds:** column-level lineage + DQ tests at every transform.

### PII handling
- Classify (PII / SPI / PHI) and tag at column level. Treatments: **tokenize** (reversible via vault), **hash** (irreversible, rainbow risk if salt is weak), **encrypt** (key-reversible), **mask** (`****1234`), **redact**.
- Encrypt at rest (KMS) + in transit (TLS) + field-level for sensitive cols.
- Right to be forgotten (GDPR 30 d, CCPA): must delete by user_id across all stores and derived tables.
- **In 10 seconds:** tag columns; encrypt + tokenize sensitive; design for delete-by-user from day 1.

## Cheat numbers / formulas

- Spark default `spark.sql.shuffle.partitions = 200`.
- Spark broadcast join default threshold: 10 MB (`spark.sql.autoBroadcastJoinThreshold`).
- Spark optimal partition size: 100–200 MB.
- Parquet row-group size: 64–128 MB; page size: 1 MB.
- Kafka retention for Kappa replay: 7–30 days.
- Airflow scheduler parses DAGs every ~30 s (`min_file_process_interval`).
- GDPR delete SLA: 30 days from request.
- Trino query target: < 1 minute (interactive); else use Spark.
- HDFS block size: 128 MB default (used to be 64 MB).
- Hudi compaction trigger: every N delta commits (default 10).

## Decision tree

- **Real-time + exact?** Lambda (batch + stream).
- **Real-time only, replay for backfill?** Kappa on Kafka.
- **Interactive SQL across many sources?** Trino/Presto.
- **Heavy ETL, fault tolerance per task?** Spark.
- **Analytics (columnar scans)?** Parquet.
- **Streaming payload + schema evolution?** Avro + Schema Registry.
- **Open lakehouse, multi-engine?** Iceberg.
- **Streaming upserts to data lake?** Hudi (MoR for write-heavy).
- **Need history per dimension row?** SCD2.
- **PII column?** Tokenize or encrypt; never store raw.

## Common pitfalls / "gotchas"

- Forgetting to set shuffle partitions for data size — default 200 destroys small jobs and OOMs big ones.
- Joining a 10 GB table to a 1 MB table without `broadcast()` hint — 200 shuffle tasks instead of zero.
- Using `count(*)` on Parquet without column stats — full scan instead of metadata read.
- Raw Parquet on S3 without Iceberg/Delta — no ACID, partial writes leak.
- Airflow DAG with top-level DB query — runs on every parse.
- SCD2 without `is_current` flag — queries can't tell which row is the live one.
- Hashing PII with no salt — rainbow tables crack it in minutes.
- Forgetting GDPR delete on derived tables / backups.

## Related: see also
- [04 · Messaging cheatsheet](../04-messaging-kafka/cheatsheet.md) — Kafka, exactly-once.
- [02 · Databases cheatsheet](../02-databases/cheatsheet.md) — OLTP vs OLAP, columnar stores.
- [10 · Modern additions cheatsheet](../10-modern-additions/cheatsheet.md) — Flink, watermarks, KStreams.
- [09 · Production craft cheatsheet](../09-production-craft/cheatsheet.md) — observability, secrets for pipelines.
