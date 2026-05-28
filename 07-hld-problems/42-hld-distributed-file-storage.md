# 42 — HLD: Distributed File Storage (S3 / Dropbox)

> Phase 7 • HLD Problems • Topic 42/74

## Problem statement

Design an object storage system: users can upload, download, and delete files of any size, with durability, availability, and a global namespace.

## Requirements

### Functional
- Upload / download files (range reads for partials).
- Multi-part upload for large files.
- Versioning (optional).
- Permissions / ACLs.
- Metadata (filename, mime type, custom metadata).

### Non-functional
- Durability: 99.999999999% (11 nines, S3 standard).
- Availability: 99.9% read.
- Storage: petabytes to exabytes.
- Throughput: gigabytes/sec aggregate.

## Scale estimation

- 100M users, 100 files each, average 1 MB = **10 PB** total.
- 50M uploads/day → ~600 writes/sec.
- 500M downloads/day → ~6K reads/sec.

## Core API

```
PUT  /buckets/{bucket}/keys/{key}      → upload
GET  /buckets/{bucket}/keys/{key}      → download
GET  /buckets/{bucket}/keys/{key}?versionId=... → versioned download
DELETE /buckets/{bucket}/keys/{key}
HEAD /buckets/{bucket}/keys/{key}      → metadata only
POST /buckets/{bucket}/keys/{key}?uploads → multipart upload init
POST /buckets/{bucket}/keys/{key}?uploadId=...&partNumber=... → upload part
POST /buckets/{bucket}/keys/{key}?uploadId=... → complete upload
```

## High-level architecture

```
                  ┌─────────────┐
   Client ──HTTPS►│ API Gateway │ ──► Auth + Bucket policy
                  └──────┬──────┘
                         ▼
                  ┌─────────────┐
                  │  Metadata   │ (sharded SQL or KV)
                  │  Service    │
                  └──────┬──────┘
                         ▼
                  ┌──────────────────────┐
                  │ Object Placement      │
                  │ (chunking + erasure)  │
                  └──────────────────────┘
                         ▼
                ┌──────┬────────┬──────┐
                │ DN-1 │ DN-2   │ DN-N │ ── data nodes
                └──────┴────────┴──────┘
```

## Detailed design

### Object chunking

- Files split into **chunks** (4–64 MB each).
- Each chunk has a content-addressable hash (`sha256(chunk)`).
- Allows: parallel upload/download, dedup by hash, repair of single bad chunk.

### Storage scheme: replication vs erasure coding

- **Replication (3 copies)**: simple, fast reads, 3× storage cost.
- **Erasure coding (e.g., 10+4)**: data + parity. Survives any 4 failures with 1.4× overhead instead of 3×. Reconstruction is CPU-heavy.

S3 uses erasure coding internally. HDFS started with 3 replicas, now supports EC. Dropbox uses both (replicas for hot, EC for cold).

### Metadata service

- Mapping: `(bucket, key, version) → list of chunks → list of placements`.
- Sharded by `(bucket, key)` hash for write distribution.
- Hot reads cached.
- Postgres / Cassandra / proprietary (S3 uses custom KV).

### Placement & data nodes

- **Data nodes**: storage servers with many disks.
- **Placement algorithm**: pick N nodes in different fault domains (racks, AZs) for replication / EC.
- **Health checks**: periodic; failed nodes' data is re-replicated/re-encoded automatically.

### Upload flow (multipart)

```
1. Client: POST .../uploads → uploadId from metadata service.
2. Client: PUT part 1, 2, ..., N (each part 5MB-5GB) in parallel.
   Each part: gateway hashes, picks placement, writes to N data nodes, returns etag.
3. Client: POST .../complete with list of (part, etag).
4. Metadata service finalizes the key → list-of-chunks mapping.
5. Returns success only after durable storage of all parts.
```

### Download flow

1. Lookup metadata → list of chunks + their locations.
2. For each chunk, GET from a healthy replica/EC group.
3. Stream to client.
4. Range requests: skip to chunk containing the start offset.

### Consistency model

- S3 became strongly consistent for read-after-write in 2020 (used to be eventual for overwrites). Big engineering effort: write succeeds only when metadata is updated atomically with placement durability.
- Most homegrown systems are read-after-write consistent for new keys, eventually consistent for overwrites unless explicit care.

### Versioning

- Each PUT to an existing key creates a new version.
- Metadata stores `(key, version, chunks)`.
- DELETE adds a delete marker; doesn't physically remove until lifecycle policy.

### Lifecycle / tiered storage

- **Hot**: SSD, recent files, fast access.
- **Warm**: HDD, moderate access.
- **Cold (Glacier / Coldline)**: tape or low-RPM HDD, retrieval in minutes-to-hours, cheapest.
- Lifecycle rules: move objects between tiers based on age.

### Garbage collection

- Deleted objects' chunks are not physically deleted immediately.
- GC scans for orphan chunks (no live key references them) → delete in background.
- Special care for versioning + retention policies.

### Replication across regions

- S3 Cross-Region Replication: async, configurable on bucket.
- Each region holds independent durable copy.
- Failover by changing bucket endpoint or DNS.

## Bottlenecks & optimizations

- **Small files** dominate metadata service traffic — combine into containers if you have many tiny files (HDFS HAR, Facebook Haystack).
- **Hot objects**: CDN cache in front.
- **Repair traffic**: re-replicating after node failure can saturate network — throttle.
- **Metadata service hot spots**: shard by (bucket, key prefix) hash, not by bucket alone.

## Trade-offs

- **Replication vs EC**: replication is fast and simple; EC is space-efficient but CPU-heavy.
- **Strong vs eventual consistency on overwrites**: strong is hard at scale; eventual is the historical default.
- **Hot/cold tiering** vs uniform: tiering is cost-effective for large datasets with skewed access.

## Interview questions

### Q1: How does S3 achieve 11 nines of durability?
Erasure coding (or replication) across multiple AZs in a region. Continuous integrity checks (checksum on every chunk). Automatic repair on detected corruption or node failure. Eventually multiple full copies on independent hardware in independent power/network domains.

### Q2: Why chunk files?
Parallel upload/download (each chunk over a separate connection). Repair of one bad chunk doesn't require re-sending the whole file. Dedup possible by chunk hash. Fits memory/network buffers.

### Q3: Compare replication and erasure coding.
Replication: N copies, simple, fast reads, N× storage cost. EC: data split into k pieces + m parity; survives m failures with (k+m)/k overhead — much lower than N×. Repair is CPU-heavy (XOR / Reed-Solomon). Replication for hot, EC for cold.

### Q4: How do you handle a 100 GB file upload?
- Multipart upload: client splits into ~100 parts of 1 GB each.
- Parts uploaded in parallel.
- Each part durably stored as it lands.
- Final completion call assembles into the key.
- Resumable: failed parts retried without re-uploading the rest.

### Q5: Design metadata storage for 100B keys.
Sharded KV (or Postgres with hash sharding) by hash of (bucket, key). Each shard handles ~1B keys = manageable per node. Frequently accessed metadata cached in front (Redis). Versioning: each version is a row.

### Q6: How does Dropbox sync clients efficiently?
- Content-addressable chunks: client sends only chunks that changed (rsync-style).
- Server-side hash dedup: identical chunks (same file shared by 1M users) stored once.
- Block-level delta sync.
- Push events to clients (long-poll or WebSocket) on change.

### Q7: How would you handle deletion safely with versioning?
- DELETE doesn't remove; creates a "delete marker" version.
- Old versions retained per lifecycle policy.
- Compliance lock options (S3 Object Lock) prevent deletion for retention period.
- Physical chunk GC happens later, only when no live version or marker references them.

### Q8: How to scale reads for a viral file getting 1M req/sec?
- CDN in front: caches at edge.
- Multiple replicas of the chunks across more data nodes (auto-replicate hot keys).
- Origin shield to reduce CDN-to-storage traffic.

## TL;DR cheat sheet

- Files chunked (4–64 MB), each addressed by content hash.
- Metadata service maps key → list of chunks.
- Replication (hot) and erasure coding (cold).
- Multipart upload for large files (resumable, parallel).
- Versioning + lifecycle policies for retention/tier.
- Durability via multi-AZ + integrity checks + auto-repair.
- CDN for hot objects.

## Go deeper

- **Google File System paper** (2003): [research.google/pubs/gfs](https://research.google/pubs/the-google-file-system/) — foundational.
- **Colossus** (Google's GFS successor) — talks and papers.
- **HDFS architecture docs**.
- **Facebook Haystack** paper: small file storage.
- **AWS S3 deep dive**: re:Invent talks (look for "S3 internals").
- **Dropbox engineering blog**: ["Magic Pocket"](https://dropbox.tech/infrastructure/inside-the-magic-pocket).
- **Alex Xu Vol 2**: object storage chapter.
