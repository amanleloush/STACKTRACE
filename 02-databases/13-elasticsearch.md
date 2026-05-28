# 13 — Elasticsearch: Inverted Index, BM25, Shards

> Phase 2 • Databases • Topic 13/74

## Definition (interview-ready)

**Elasticsearch** is a distributed search and analytics engine built on **Apache Lucene**. Documents are JSON, indexed into **inverted indexes** that map terms → document IDs, scored with **BM25** (or vector similarity for embeddings). Data is partitioned into **shards**, replicated, and queried via a JSON DSL.

## Why it matters

Whenever the question is "fast text search," "log search," "faceted product search," "autocomplete," or "log/metric aggregation," Elasticsearch (or its fork OpenSearch) is almost always in the answer. It's also a misused tool: people put primary data in it, then learn the hard way that it isn't an ACID database.

## Core concepts

### Document, index, mapping

- **Document**: JSON. Belongs to an index.
- **Index**: like a "table" — a logical grouping of documents (e.g., `products`).
- **Mapping**: schema definition for the index — field types (`text`, `keyword`, `integer`, `date`, `dense_vector`, etc.), analyzers, settings.

### `text` vs `keyword`

The most consequential mapping distinction:
- **`text`**: tokenized, lowercased, stemmed → goes into inverted index. Use for full-text search.
- **`keyword`**: stored exactly as-is. Use for IDs, enums, filters, exact match, sort, aggregation.

Often you map a field as **both**: `name` (text) and `name.keyword` (keyword) — for search AND aggregation.

### Inverted index

A map from term → list of document IDs containing it.

```
"redis": [doc1, doc4, doc9]
"cluster": [doc1, doc2, doc4]
```

For "redis cluster" query, intersect the two lists. Brilliantly fast and at the heart of every search engine.

### Analyzer pipeline

When text is indexed:
1. **Character filters** (strip HTML, etc.).
2. **Tokenizer** (whitespace, standard, edge n-gram for autocomplete).
3. **Token filters** (lowercase, stop-word removal, stemming, synonyms).

Result: a stream of normalized tokens that go into the inverted index. Query analyzer **must match** index analyzer (or you'll get no hits).

### Relevance scoring: BM25

Default scoring since ES 5.0. Rewards rare terms (IDF), penalizes long documents (length norm), saturates term frequency. For each matching document:

```
score = Σ (IDF * TF / (TF + k1 * (1 - b + b * docLen/avgDocLen)))
```

You don't memorize the formula — just know:
- Common terms contribute less (good).
- TF saturation prevents keyword stuffing (good).
- You can tune k1 and b per index.

### Shards & replicas

- An index is split into **primary shards** (set at index creation, can't change without reindexing for older indices; data streams + ILM let you rotate).
- Each primary has N **replica shards** (configurable any time).
- A shard is a self-contained Lucene index.
- Queries fan out to shards in parallel, results merged by the coordinating node.

### Distribution & cluster

- **Master-eligible** node: coordinates cluster state. Usually 3 in production for quorum.
- **Data nodes**: hold shards, serve queries.
- **Ingest** / **ML** / **Coordinating** roles for specialization.
- **Cluster state** broadcast through master node — node membership, shard allocation, index mappings.

### Refresh & near-real-time

Indexed documents aren't immediately searchable. Every `refresh_interval` (default 1s) Elasticsearch flushes the in-memory buffer to a Lucene segment — this makes new docs visible. Hence "near-real-time."

For high-throughput logging, set `refresh_interval` to 30s+ to reduce overhead.

### Segments & merging

Each shard is many Lucene **segments** (immutable). Background merges combine small segments into larger ones. Search reads from all segments and merges results. Force-merge is sometimes useful on cold indices (read-only logs) but expensive.

### Aggregations

Beyond search, Elasticsearch supports rich aggregations:
- **Metric**: avg, sum, percentile, cardinality (HyperLogLog).
- **Bucket**: terms (group-by), date histogram, range.
- **Pipeline**: derivative, moving avg over bucket outputs.

Used for analytics dashboards and log/metric exploration.

### Vector search

`dense_vector` field type + HNSW index for k-NN search. Used for semantic search, RAG embeddings. Big growth area.

## How it works (a search query)

```
Client → Coordinating Node
   Parse query, identify target indices
   Forward to one shard copy (primary or replica) per shard, in parallel
   Each shard runs query → returns top K + scores
   Coordinator merges → top K overall
   Optionally fetch source docs (second round trip)
   Return to client
```

## Real-world examples

- **Wikipedia**: full-text search powered by Elasticsearch.
- **GitHub**: code search (currently their own engine, but powered Elasticsearch for years).
- **Uber, Netflix, eBay**: log search (ELK / EFK pipelines).
- **Stack Overflow**: search.
- **Algolia**: not Elasticsearch but solves the same problem — useful comparison.

## Common pitfalls

- **Using as a source of truth**: it's eventually consistent, near-real-time, and not ACID. Lose data and you can't recover unless you reindex from primary store.
- **Wrong analyzer**: index with `standard`, query with `keyword` → no hits. Be explicit.
- **Mapping explosion**: 10K+ unique field names (dynamic mapping in user-generated JSON) → cluster state blow-up. Use **strict mapping** or **dynamic templates**.
- **Too many small shards**: each shard has overhead (a few MB of heap, file handles). Aim for shards 10–50 GB each.
- **Hot threading on aggregations**: large `terms` agg on high-cardinality field → OOM. Use composite aggregations or query a different store.
- **Mixing old and new data in one big index**: rotate via **data streams** + **ILM** (Index Lifecycle Management): hot → warm → cold → frozen → delete.
- **Heavy nested fields**: each nested object creates hidden docs. Don't go crazy.
- **Master overload**: dynamic mapping or rapid index creation can pin the master node.

## Interview questions

### Q1 — Easy: What's an inverted index?
A data structure mapping terms (tokens) to the documents that contain them. Reverse of a forward index (doc → its words). Lets full-text queries return matching docs in O(log) per term + intersection cost.

### Q2 — Easy: What's the difference between `text` and `keyword`?
`text` is analyzed (tokenized, lowercased, stemmed) and used for full-text search. `keyword` is stored as-is and used for exact match, filtering, sorting, and aggregations. Map a field as both if you need both behaviors.

### Q3 — Medium: How does BM25 differ from TF-IDF?
BM25 adds **term frequency saturation** (extra occurrences contribute less and less, prevents keyword stuffing) and **document length normalization** (rewards shorter, more relevant docs). It's a probabilistic refinement; Elasticsearch uses BM25 since 5.0.

### Q4 — Medium: How does Elasticsearch scale horizontally?
Indices are split into **primary shards** (parallelism unit) and each primary has **replicas** (HA + read scaling). Cluster distributes shards across data nodes. Queries fan out to shards in parallel, results merged. Add nodes → rebalance shards automatically.

### Q5 — Medium: Why is Elasticsearch only "near-real-time"?
Indexed documents are buffered and made searchable on a periodic **refresh** (default 1s). Until that refresh, the doc isn't visible to search even though it's been written. Tunable per index — log-ingestion clusters often raise `refresh_interval` to reduce overhead.

### Q6 — Hard: A log cluster ingests 1 TB/day. How would you size and operate it?
- **ILM**: hot shards on SSD, warm on HDD after 7 days, cold/frozen after 30 days, delete after 90 days.
- **Daily index per source**: ~50 GB per shard target. If 1 TB/day = 20 shards/day (or use data streams to auto-roll).
- **Mappings**: strict + dynamic templates to avoid mapping explosion.
- **Refresh interval**: 30s+ on hot indices.
- **Replication**: replica=1 hot, 0 on cold (rely on snapshots).
- **Bulk indexing** with appropriate batch size (5–15 MB).
- **Snapshots to S3** for backup.
- **Monitor**: pending tasks, heap, GC, queue rejections, ingest latency.

### Q7 — Hard: An e-commerce site's search highlights products but never matches misspellings. How would you improve recall?
Add **fuzzy queries** (`fuzziness: AUTO`) with care (slow). Better: a synonyms filter for common misspellings, an n-gram subfield for partial matches, query-time normalization (`asciifolding`, lowercase). Even better: use **vector search** with embeddings (k-NN on `dense_vector`) to capture semantic similarity, then re-rank with BM25.

### Q8 — Hard: A team uses Elasticsearch as the source of truth for product data and lost the cluster. What went wrong?
- Elasticsearch is **not** an ACID database; it's eventually consistent and prone to bugs that lose individual docs.
- Snapshots aren't enough for transactional correctness — they're point-in-time but not coordinated with writes.
- Right architecture: primary store (Postgres / Mongo / Kafka) → CDC / dual-write → Elasticsearch for queryable search. On loss, reindex from primary.

## TL;DR cheat sheet

- JSON docs → analyzers → inverted index in Lucene segments inside shards.
- `text` for search, `keyword` for exact + aggregations.
- Scoring: BM25 (TF saturation + length norm).
- Shards: primary (set at create) + replicas (HA + read scaling).
- Queries fan out to one copy per shard, results merged by coordinator.
- Near-real-time: refresh every 1s (tunable).
- Not a primary store. Use it as a search/analytics layer on top of one.
- ILM for log retention. Aim ~50 GB per shard.
- For semantic search, use `dense_vector` + HNSW (k-NN).

## Go deeper

- **Elastic official docs**: [elastic.co/guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html) — surprisingly readable.
- **Elastic blog**: ["BM25 explained"](https://www.elastic.co/blog/practical-bm25-part-1-how-shards-affect-relevance-scoring-in-elasticsearch), ["Mapping explosion"](https://www.elastic.co/blog/found-beginner-troubleshooting), [vector search](https://www.elastic.co/blog/introducing-elasticsearch-vector-database).
- **Book**: *Elasticsearch: The Definitive Guide* (older, free, still good fundamentals).
- **Lucene documentation** — for when you really want to know what's under the hood.
- **OpenSearch docs**: AWS fork of ES, mostly compatible — useful if you're on AWS.
- **YouTube**: ElasticON sessions, Elastic's own conference talks.
