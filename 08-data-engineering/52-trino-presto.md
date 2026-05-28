# 52 — Trino / Presto: MPP Query Engine

> Phase 8 • Data Engineering • Topic 52/74

## Definition (interview-ready)

**Trino** (formerly PrestoSQL) and **Presto** (now PrestoDB) are open-source **MPP (Massively Parallel Processing) SQL query engines**. They federate queries across heterogeneous sources (S3, Postgres, MongoDB, Kafka, ...) via connectors, with all work done in-memory, leveraging distributed planning and execution for sub-second to minutes-scale queries on huge datasets.

## Why it matters

Trino/Presto fill the niche between "interactive query" (Redshift, BigQuery, Snowflake) and "batch ETL" (Spark): SQL over data lakes (Parquet/ORC in S3), federating multiple sources, no copy required. Used by Facebook (origin), Netflix, Airbnb, Lyft, Pinterest, Slack — anywhere people need fast SQL over warehouses or lakehouses.

## Core concepts

### Architecture

```
   Client SQL ──► Coordinator ──► parse + plan + optimize
                                         │
                                         ▼
                                   distribute to workers
                                         │
   ┌─────────────────────────────────────┴────────────────────────┐
   ▼                                                              ▼
 Worker 1 ──► reads from connector (S3 Parquet)              Worker N
   │
   └── shuffle data with other workers as plan dictates
```

- **Coordinator**: parses, plans, schedules. One per cluster.
- **Workers**: execute tasks in parallel.
- **Connectors**: pluggable adapters per data source (Hive on S3, Postgres, MongoDB, Kafka, Elasticsearch, ...).
- **In-memory**: data flows through workers without spilling (mostly), so it's fast but limited by RAM.

### Query lifecycle

1. Client submits SQL → coordinator.
2. **Parse** → AST.
3. **Plan** → logical plan with operators (Scan, Filter, Project, Aggregate, Join, ...).
4. **Optimize** → cost-based (statistics + heuristics), predicate pushdown, projection pruning.
5. **Distribute** → split plan into **stages** (similar to Spark) — each stage parallelized across workers.
6. **Execute** → workers fetch data from connectors, process in pipelines, exchange data over network.
7. **Stream results back** to coordinator → client.

### Connectors

- **Hive** (most common): reads Parquet/ORC on S3/HDFS with Hive metastore for schemas.
- **Iceberg**: native support for the table format.
- **Delta Lake**: connector available.
- **Postgres / MySQL / Oracle**: pushdown predicates and projections.
- **Kafka**: query a topic as a table.
- **Elasticsearch**: query indices via SQL.
- **MongoDB**: pushdown filters.
- **GCS / Azure / S3**: object store.

A query can JOIN across connectors:

```sql
SELECT u.name, o.total
FROM postgres.public.users u
JOIN s3_data.sales.orders o ON o.user_id = u.id
WHERE o.created_at > DATE '2026-05-01';
```

Trino fetches from Postgres + S3, joins in workers.

### Predicate / projection pushdown

For Parquet/ORC: column pruning (only read needed columns) + row-group skipping (use min/max stats). Massive savings — often 100× speedup over column-scan.

For JDBC connectors: WHERE pushed to the source DB.

### Exchange operators

Stages exchange data via **exchange operators**:
- **GATHER**: all → coordinator (final result).
- **HASH** / **REPARTITION**: hash-based redistribution by key (for joins, groupBy).
- **BROADCAST**: small data to all workers (broadcast join).

Each exchange is a network shuffle — minimize.

### Resource management

- **Memory**: each query has a memory budget per worker. Hits limit → query aborts.
- **CPU**: scheduled across workers; concurrent queries share.
- **Resource groups**: tagged hierarchies for tenant quotas.

### Caching

- **Result cache** (some commercial Trino offerings).
- **Worker-side caching** of file metadata, but generally no data caching (Trino is "stateless" between queries).
- **Alluxio** as a caching layer for S3 reads.

### vs Spark

- Trino: in-memory, low-latency, no persistence. Great for ad-hoc analytics.
- Spark: pipeline ETL, persistent execution, can spill to disk.
- Pattern: Spark for nightly ETL → store as Parquet/Iceberg → Trino for interactive queries.

### Differences: Trino vs Presto

- Originally one project; forked in 2018 over governance.
- **Trino** = active, big OSS community, used by Starburst.
- **PrestoDB** = Facebook-maintained.
- Similar engines, syntax 95% compatible; Trino has more features and community velocity.

## How it works (a query)

```sql
SELECT customer_id, SUM(amount) AS total
FROM s3_data.sales.orders
WHERE created_at >= DATE '2026-01-01'
GROUP BY customer_id
ORDER BY total DESC
LIMIT 100;
```

1. Coordinator plans: Scan → Filter (pushdown) → HashAggregate → SortLimit.
2. Stage 1 (scan + partial aggregate): workers read S3 Parquet, prune columns, skip row groups, aggregate per worker.
3. Stage 2 (final aggregate): hash-shuffle by customer_id, sum per key.
4. Stage 3 (sort + limit): gather to coordinator.
5. Return.

## Real-world examples

- **Facebook**: invented Presto for ad-hoc SQL over Hive.
- **Netflix**: Trino on top of Iceberg for petabyte-scale interactive queries.
- **Airbnb**: heavy Trino use; Presto-on-Spark adapter for the long-running queries.
- **Pinterest, Lyft, Slack, LinkedIn**: large Trino fleets.

## Common pitfalls

- **OOM on huge aggregation**: Trino keeps state in memory; queries exceeding memory die. Tune `query.max-memory-per-node` or rewrite.
- **Skew in joins/groupBy**: one worker takes all the work → slow stage. Salt or rewrite.
- **No materialized views in OSS Trino** (was historically): some queries should be pre-aggregated rather than computed from raw.
- **Many small files**: Trino lists S3 metadata; many files = slow listing. Compact.
- **Connector mismatch**: a JDBC connector with no pushdown → fetches all rows → slow. Verify pushdown works.
- **Long-running queries on a busy cluster**: starve interactive ones. Use resource groups to isolate.

## Interview questions

### Q1: How does Trino differ from Spark?
Trino is in-memory, low-latency, designed for interactive SQL. Spark is general-purpose distributed compute, optimized for pipelined ETL with disk spill. Trino doesn't have Spark's ML / streaming. Spark is heavier-weight per query. Pattern: Spark for ETL, Trino for interactive analytics.

### Q2: What is a connector?
A plugin that lets Trino read from (and sometimes write to) a data source — Hive on S3, Postgres, Kafka, ES, MongoDB. Each connector implements scan + (when possible) predicate/projection pushdown to its source.

### Q3: How does Trino federate queries across sources?
Each table in the query identifies its catalog (Postgres or S3-hive). Trino fetches from each source via its connector. Joins happen in workers in memory. Pushdown means the source DB does as much filtering as possible.

### Q4: Why is column pruning so important?
Parquet/ORC are columnar: column pruning means reading only the columns the query needs from disk. With wide tables (100+ columns), pruning means 1-10× I/O savings — often dominant.

### Q5: A Trino query OOMs. How do you handle?
- Identify the offending operator (aggregate, join).
- Check for skew; mitigate with salting.
- Increase worker memory.
- Rewrite query to be incremental (LIMIT, pre-filter).
- Use materialized views or pre-aggregations.
- Split into multiple smaller queries.

### Q6: Difference between Trino and Spark SQL?
Both run SQL distributed. Spark SQL is part of Spark (long-running executor model, disk spill, broader ML/streaming integration). Trino is standalone, in-memory only, more focused on low-latency SQL. Performance: Trino faster for typical analytics; Spark wins for very long jobs or complex DAGs.

### Q7: How does Trino handle a join across S3 and Postgres?
Scans Postgres (with predicate pushdown) for one side; scans S3 Parquet for other. Decides broadcast vs hash-distributed join based on cost estimates. Performs the join in workers in memory.

### Q8: How do you manage multi-tenant Trino?
Resource groups: hierarchical quotas (cpu, memory, concurrent queries) per team. Isolate "interactive" vs "etl" queues. Per-query memory limits. Optionally separate clusters per workload (heavy long jobs on one cluster, interactive on another).

## TL;DR cheat sheet

- MPP SQL engine with pluggable connectors.
- In-memory, low-latency; no disk spill (mostly).
- Coordinator plans + distributes; workers execute in parallel.
- Predicate + projection pushdown crucial for performance.
- Joins via hash, broadcast, or merge — same as Spark.
- Best for interactive SQL over lakehouse / federated sources.
- Spark for ETL; Trino for analytics. Pair them up.
- Resource groups for multi-tenancy.

## Go deeper

- **Trino docs**: [trino.io/docs](https://trino.io/docs/current/).
- **Starburst Academy**: free Trino courses.
- **Book**: *Trino: The Definitive Guide* (free from Starburst).
- **Trino blog**: optimizations and feature deep dives.
- **Iceberg + Trino**: a common production pattern; lots of writeups.
- **Netflix engineering**: Iceberg + Trino at petabyte scale.
- **DDIA Chapter 10** for context.
