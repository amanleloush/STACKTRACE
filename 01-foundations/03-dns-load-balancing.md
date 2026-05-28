# 03 — DNS + Load Balancing (L4 vs L7, Consistent Hashing)

> Phase 1 • Foundations • Topic 3/74

## Definition (interview-ready)

**DNS** is a hierarchical, distributed key-value store mapping names to records (A, AAAA, CNAME, MX, TXT, SRV). **Load balancing** distributes traffic across backends; **L4** decides based on TCP/UDP (IP+port), **L7** decides based on HTTP content (path, headers, cookies). **Consistent hashing** is a placement algorithm that minimizes key remapping when nodes are added or removed.

## Why it matters

Every request begins with DNS and ends at a load balancer. If you can't explain the path from `api.example.com` to a specific pod, you can't debug latency, blue-green deploys, sticky sessions, or "why is one shard hot." Consistent hashing is the algorithm behind caches, sharded databases, and DHTs.

## Core concepts

### DNS — the journey of a lookup

```
Browser cache → OS cache → /etc/hosts → recursive resolver (ISP / 1.1.1.1)
                                          → root nameservers (.)
                                          → TLD nameservers (.com)
                                          → authoritative nameservers (example.com)
                                          → A record for api.example.com
```

The recursive resolver does the hard work and caches based on **TTL**.

### Key record types

- **A**: name → IPv4
- **AAAA**: name → IPv6
- **CNAME**: alias to another name. Can't coexist with other records at the same name.
- **MX**: mail exchange (with priority)
- **TXT**: arbitrary text (SPF, DKIM, domain ownership proofs)
- **SRV**: service location (host + port + priority + weight). Used in legacy directory systems and some service discovery.
- **NS**: which nameservers are authoritative for the zone.
- **CAA**: which CAs are allowed to issue certs for this domain.

### DNS-based load balancing

- **Round-robin DNS**: return multiple A records, client picks one. Cheap, no LB needed, but no health checks.
- **GeoDNS / weighted**: return different answers based on client location (Route 53, Cloudflare). Used for global multi-region routing.
- **Anycast DNS**: same IP advertised from multiple locations via BGP. Closest one wins. How 1.1.1.1 and 8.8.8.8 work.

### L4 load balancing (transport layer)

- Decides based on **IP + port** at the TCP/UDP layer.
- Doesn't terminate the connection — just forwards packets.
- Fast, cheap, protocol-agnostic.
- Examples: AWS NLB, HAProxy in TCP mode, Linux IPVS, kube-proxy.
- Algorithms: round robin, least-connections, source-IP hash.

### L7 load balancing (application layer)

- Terminates TCP+TLS, parses HTTP, decides based on **path, headers, cookies, method**.
- Can do: path-based routing, A/B testing, sticky sessions via cookie, request mirroring, rate limiting, WAF.
- Examples: AWS ALB, Nginx, Envoy, HAProxy in HTTP mode, Istio gateway.
- Cost: more CPU; needs a TLS cert.

### Consistent hashing

Naive sharding: `node = hash(key) % N`. Add a node → almost every key remaps. Catastrophic for caches.

**Consistent hashing**: place both keys and nodes on a ring (hash space 0 to 2^32). A key goes to the next node clockwise on the ring.

- Add a node: only ~1/N of keys move (the ones now closer to the new node).
- Remove a node: only its keys move.

**Virtual nodes** (vnodes): each physical node owns many points on the ring. Spreads load evenly even if you have few physical nodes, and lets you reshard without bias.

**Used by**: Redis Cluster (slot map, conceptually similar), Memcached clients (ketama), Cassandra, DynamoDB, CDN cache shard selection, Discord's voice servers.

### Rendezvous hashing (HRW)

Alternative: for each key, hash `(key, node)` for every node and pick the highest. Same minimal-remapping property, simpler logic, no ring data structure. Used by some CDNs and message brokers.

## How it works (a request's full path)

1. Client resolves `api.example.com` → IP of L7 LB (via DNS).
2. Client opens TCP to LB.
3. LB terminates TLS, reads `:path` header, picks an upstream pool.
4. LB picks a specific backend (least-connections, round-robin, EWMA).
5. LB opens a separate TCP connection to the backend (or reuses one from its pool).
6. Backend responds → LB streams response back → client.

## Real-world examples

- **AWS**: Route 53 (DNS), NLB (L4), ALB (L7), CloudFront (CDN with edge routing).
- **GCP**: Cloud Load Balancing with global anycast — one IP, lowest-latency region selected automatically.
- **Discord**: consistent-hashes voice channels onto servers; users in a channel always route to the same one. Adding capacity moves ~1/N channels.
- **Memcached clients**: use ketama (consistent hashing) so adding a Memcached node doesn't invalidate the whole cache.

## Common pitfalls

- **DNS TTL**: clients (especially JVMs!) may cache DNS forever if `networkaddress.cache.ttl` isn't tuned. Failover takes hours instead of minutes.
- **CNAME at apex**: you can't put a CNAME at the root `example.com` per RFC. Use `ALIAS` / `ANAME` from the DNS provider, or A records.
- **L4 LB + sticky sessions**: L4 can do source-IP hash, but NATs (corporate networks, mobile carriers) collapse many users to one IP — unbalanced.
- **L7 LB + WebSockets**: most support it, but configuration is finicky (upgrade headers, longer timeouts).
- **Consistent hashing without vnodes**: skew. A 3-node ring with 3 points gives ~25% / 30% / 45% load distribution easily.
- **DNS as service discovery**: DNS clients cache aggressively — a removed pod's IP can linger and you get connection-refused. Use a real service discovery system (Consul, k8s headless services, Eureka) for fast-moving backends.

## Interview questions

### Q1 — Easy: What's the difference between L4 and L7 load balancing?
L4 routes by IP + port (transport layer) — fast, protocol-agnostic, no payload inspection. L7 terminates the connection and routes by HTTP semantics (path, headers, cookies) — slower but lets you do path-based routing, A/B tests, sticky sessions, WAF.

### Q2 — Easy: What is a CNAME and when can't you use one?
A CNAME is a DNS alias from one name to another. You **cannot** put a CNAME at the zone apex (`example.com`) because it would conflict with the required SOA/NS records at that name. Use A records or DNS provider's ALIAS/ANAME.

### Q3 — Medium: Why use consistent hashing instead of `hash % N`?
With modular hashing, adding or removing a node remaps ~all keys — devastating for a cache (massive cold-start) or sharded DB (massive rebalance). Consistent hashing remaps only ~1/N of keys.

### Q4 — Medium: Walk through what happens from typing `api.example.com` until your TCP SYN reaches a server.
Browser cache → OS cache → recursive resolver (with possible cache hit) → root NS → .com TLD NS → example.com authoritative NS → returns A record → browser opens TCP to that IP (which is the LB) → LB picks a backend.

### Q5 — Medium: How would you do blue-green deploys with DNS?
Two environments: blue (live) and green (new). Cut over by updating DNS to point to green. Risks: long TTLs cause slow rollover; if green is bad, rollback is also TTL-bound. Prefer LB-based cutover (instant) for fast feedback; DNS is fine for slow, planned migrations.

### Q6 — Hard: A cache cluster uses consistent hashing. One node has 3x the load of others. Why and what do you do?
Hot keys (one key getting heavy traffic on one node) — fix with key splitting or local caching. Or insufficient vnodes per physical node — increase vnode count (typical: 100–200 vnodes per node). Or a hash function with poor distribution.

### Q7 — Hard: Compare consistent hashing with rendezvous (HRW) hashing.
Both have the minimal-remapping property. Consistent hashing needs a sorted ring data structure and vnodes to balance well. HRW: for each key, hash with every node and pick the max — O(N) per lookup, but trivial to implement, no vnode tuning, and naturally balanced. HRW wins for small N; consistent hashing wins for huge N with a careful ring.

### Q8 — Hard: Your L7 LB shows healthy backends but users see 502s. What do you check?
Health check protocol mismatch (LB checks HTTP/200 but app returns 401 to unauthenticated probes), upstream connection pool exhaustion, idle timeout mismatch between LB and backend (LB sends request on a connection backend just closed), TLS cert issue on the upstream leg, slow DNS lookup inside the LB resolving the backend pool, or a stuck stream in HTTP/2.

## TL;DR cheat sheet

- DNS = distributed hierarchical lookup with TTL-based caching. Records: A, AAAA, CNAME, MX, TXT, SRV.
- L4 = IP+port, L7 = HTTP semantics. L7 needs TLS termination.
- LB algorithms: round-robin, least-connections, least-response-time, source-IP hash, EWMA.
- Consistent hashing: place nodes on a ring; key → next node clockwise. Adding a node remaps ~1/N keys.
- Use **virtual nodes** for even distribution; expect 100–200 vnodes per physical node.
- Rendezvous hashing: simpler alternative, O(N) per lookup, naturally balanced.

## Go deeper

- **System Design Primer** [load balancing](https://github.com/donnemartin/system-design-primer#load-balancer), [DNS](https://github.com/donnemartin/system-design-primer#domain-name-system).
- **ByteByteGo** YouTube: load balancing algorithms, DNS deep dives.
- **Discord engineering**: ["How Discord Stores Billions of Messages"](https://discord.com/blog/how-discord-stores-billions-of-messages) — touches on consistent hashing for routing.
- **Original paper**: Karger et al, [*Consistent Hashing and Random Trees*](https://www.akamai.com/site/en/documents/research-paper/consistent-hashing-and-random-trees-distributed-caching-protocols-for-relieving-hot-spots-on-the-world-wide-web-technical-publication.pdf) (1997, Akamai).
- **Cloudflare blog**: [How DNS works](https://blog.cloudflare.com/dns-resolver-1-1-1-1/), [Anycast](https://www.cloudflare.com/learning/cdn/glossary/anycast-network/).
