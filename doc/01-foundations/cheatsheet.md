---
title: Foundations — cheatsheet
---

# Foundations · Cheatsheet

> One-page recall for Foundations. Print, paste in Notion, glance before the system design interview.

## What this section covers
The vocabulary every system design interview reuses: TCP/UDP/TLS, HTTP 1.1→2→3, DNS + load balancing, REST/gRPC/GraphQL, back-of-envelope math, OS/concurrency primitives, and storage fundamentals. If you can't recite the latency numbers and what a load balancer actually does, the rest is memorization without a frame.

## Key topics (the 5-minute recall)

### Networking — TCP / UDP / TLS
- **TCP = reliable, ordered, in-flight congestion-controlled byte stream; UDP = fire-and-forget datagrams.**
- TCP three-way handshake = **1 RTT** before data. With TLS 1.2 add 2 RTT; TLS 1.3 = **1 RTT** (0-RTT on resume).
- TCP has head-of-line blocking (one lost packet stalls the whole stream); QUIC/HTTP3 solves it by running streams over UDP.
- Congestion control: slow start, AEAD, cubic (Linux default), BBR (Google, latency-sensitive). Window scales until loss/ECN.
- MTU = 1500 bytes typical; MSS ≈ 1460. Anything bigger fragments — bad.
- **In 10 seconds:** TCP gives you correctness for free at the cost of one RTT and HOL blocking; UDP gives you nothing but speed.

### HTTP 1.1 / 2 / 3
- **1.1** = text, one request per connection (keep-alive helps), pipelining broken in practice.
- **2** = binary frames, multiplexed streams over one TCP connection, header compression (HPACK), server push (mostly dead).
- **3** = HTTP/2 semantics over QUIC (UDP). 0-RTT resume, no TCP HOL blocking, connection migration across IP changes.
- HTTP/2 still has TCP-level HOL blocking; HTTP/3 fixes it at the transport.
- HTTPS = HTTP + TLS. ALPN negotiates h2/h3 during TLS handshake.
- **In 10 seconds:** HTTP/2 = multiplex over one TCP; HTTP/3 = multiplex over UDP + 0-RTT.

### DNS & load balancing
- DNS resolution path: stub resolver → recursive resolver (ISP/8.8.8.8) → root → TLD → authoritative. TTL on each record.
- Record types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), TXT, SRV. Negative caching uses SOA minimum.
- **Anycast** = same IP advertised from many sites; BGP routes to the closest. How Cloudflare/8.8.8.8 work.
- L4 LB = TCP/UDP, opaque to HTTP, very fast (millions of cps). L7 LB = HTTP-aware, can route by path/header/cookie.
- Algorithms: round-robin, least-conn, **consistent hash** (sticky w/o sessions), p2c (power of two choices).
- Health checks: active (LB pings) vs passive (LB notices errors). Failing-open vs failing-closed matters.
- **In 10 seconds:** L4 = fast and dumb, L7 = slow and smart, consistent hash = the only sane sticky.

### REST / gRPC / GraphQL
| | REST | gRPC | GraphQL |
|---|---|---|---|
| Wire | JSON/HTTP1-2 | Protobuf/HTTP2 | JSON/HTTP |
| Schema | OpenAPI (optional) | .proto (required) | SDL (required) |
| Best at | Public APIs, caching | Internal RPC, low latency | Aggregating data for clients |
| Worst at | N+1, over/under-fetch | Browser, debug-by-curl | Caching, query complexity |
| Latency | ~5-20ms overhead | ~1-5ms | varies w/ resolvers |

- REST resources + verbs (GET/POST/PUT/PATCH/DELETE), idempotency on GET/PUT/DELETE.
- gRPC streaming: unary, server-stream, client-stream, bidi.
- GraphQL solves over/under-fetching; introduces N+1 (use DataLoader) and breaks HTTP caching.
- **In 10 seconds:** REST for public, gRPC for service-to-service, GraphQL when clients want to pick their fields.

### Back-of-envelope math
Memorize these — they ground every estimate:

| Operation | Time |
|---|---|
| L1 cache | 0.5 ns |
| Branch mispredict | 5 ns |
| L2 cache | 7 ns |
| Mutex lock/unlock | 25 ns |
| Main memory read | 100 ns |
| Compress 1 KB w/ Zippy | 3 μs |
| Send 1 KB over 1 Gbps | 10 μs |
| SSD random read | 150 μs |
| Round-trip same DC | 500 μs |
| SSD sequential read 1 MB | 1 ms |
| HDD seek | 10 ms |
| Cross-region RTT (US ↔ EU) | ~80 ms |
| US ↔ Asia RTT | ~200 ms |

- 1 day ≈ 86,400 s ≈ **10^5 s**. 1 year ≈ **3·10^7 s**.
- 1 KB = 10^3, 1 MB = 10^6, 1 GB = 10^9, 1 TB = 10^12.
- QPS estimation: DAU × actions/user/day ÷ 86,400 × **peak factor 2-4×**.
- **In 10 seconds:** memory is 100× faster than SSD, SSD is 100× faster than network round-trip, network is 100× faster than disk seek.

### OS & concurrency
- **Process** = isolated address space; **thread** = shared address space, own stack.
- Context switch: **1-10 μs** kernel, ~100 ns user-space (goroutine/fiber).
- Linux file descriptor model: blocking, non-blocking, `epoll`/`kqueue` (Linux/BSD), io_uring (modern Linux).
- Concurrency models: thread-per-request (Tomcat), event loop (Node, nginx), goroutines (Go), virtual threads (JDK 21).
- Memory hierarchy: register → L1 (32KB) → L2 (256KB) → L3 (MB) → RAM → SSD → HDD → network.
- C10K → C10M solved by event loops + offloaded kernel.
- **In 10 seconds:** if you ever block in an event loop, you have killed throughput; either go async or thread-per-request.

### Storage fundamentals
- Block (SAN/EBS) → raw, OS owns FS. File (NFS/EFS) → hierarchical, POSIX. Object (S3) → flat key→bytes, HTTP, eventually consistent reads of metadata.
- Durability: 11 9's (S3) = lose ≤ 1 of 10^11 objects per year.
- IOPS vs throughput: small random = IOPS-bound; large sequential = throughput-bound.
- `fsync` = force to durable medium; `fflush` = just to OS page cache. Crash-safe code calls `fsync`.
- WAL (write-ahead log) = append for crash recovery; fsync the log, not the heap.
- Typical SSD: ~100k IOPS, 500 MB/s sequential. Typical HDD: ~150 IOPS, 150 MB/s sequential.
- **In 10 seconds:** flush ≠ fsync. If you don't fsync, your data is a suggestion.

## Cheat numbers / formulas

- TCP handshake = **1 RTT**, TLS 1.3 = **+1 RTT** (0-RTT on resume), HTTP/2 reuses connection = **0 RTT** after warm.
- 1 ms = 1,000 μs = 1,000,000 ns.
- Bandwidth-delay product = BW × RTT (how many bytes "in flight"). 100 Mbps × 100 ms = 1.25 MB buffer.
- Little's Law: **L = λ × W** (concurrency = arrival rate × latency). 1000 rps × 50 ms = 50 in-flight.
- Daily QPS = events/day / 86,400. Peak = avg × 2-4×.
- Storage = items × avg-size × replication-factor × (1 + index overhead 30-50%).
- Bytes-on-wire for a typical HTTP request: ~500 B headers, response varies. 1 RTT amortized across many requests with keep-alive.

## Decision tree

- **Need ordering and reliability over network?** TCP.
- **Need lowest possible latency, can lose packets?** UDP (DNS, video, QUIC).
- **Public API for partners/browsers?** REST + OpenAPI.
- **Internal service-to-service, low latency?** gRPC.
- **Mobile/web client wants flexible response shape?** GraphQL (and pay the caching tax).
- **LB needs to route by URL/header?** L7 (nginx, Envoy, ALB).
- **LB just needs to push packets fast?** L4 (HAProxy TCP mode, NLB).
- **Need low-latency reads with global users?** Anycast + CDN.
- **DNS-based failover?** Acceptable RTO ≥ TTL (60s–5min). For sub-second, use anycast.
- **Storing files for users?** Object (S3). **Boot disk?** Block (EBS). **POSIX needed?** File (NFS).

## Common pitfalls / "gotchas"

- Assuming TLS adds zero round-trips — it adds **1 RTT** even on 1.3, **2 RTT** on 1.2.
- Confusing HTTP/2 multiplexing with HTTP/3 multiplexing — HTTP/2 still has TCP HOL blocking.
- Ignoring DNS TTL when planning failover; client cache + ISP cache + JVM cache (default infinite) all bite.
- Mixing up MB/s (data rate) and Mbps (bits/s). Divide by 8.
- Using `flush` and thinking you're durable. **Only `fsync` is durable.**
- Treating L4 round-robin behind sticky-session apps as the right call (it isn't — use consistent hash or session store).
- Latency numbers in **ms when they should be μs** (memory is nanos, not millis).

## Related: see also
- [02 · Databases cheatsheet](../02-databases/cheatsheet.md) — storage layer.
- [03 · Caching cheatsheet](../03-caching-redis/cheatsheet.md) — where CDN lives.
- [05 · Distributed cheatsheet](../05-distributed-systems/cheatsheet.md) — circuit breakers, rate limiting on top of these primitives.
- [09 · Production craft cheatsheet](../09-production-craft/cheatsheet.md) — mTLS, observability for these stacks.
