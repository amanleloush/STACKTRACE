# 35 — HLD: URL Shortener (TinyURL / bit.ly)

> Phase 7 • HLD Problems • Topic 35/74

## Problem statement

Build a service that converts long URLs to short ones (`bit.ly/xY3qZ`) and redirects users back to the original URL on access. Track click counts.

## Requirements

### Functional
- POST `/shorten` — long URL in → short URL out.
- GET `/{code}` → 301/302 redirect to long URL.
- Optionally: custom alias, expiration, analytics.

### Non-functional
- Read-heavy (redirects ≫ creations): ~100:1.
- Low-latency redirects (< 50 ms p99).
- Highly available — short URLs in emails / SMS must keep working.
- Codes are unique, short (6–8 chars).

## Scale estimation

- 100M new URLs/month → 100M / 30 / 86400 ≈ **40 writes/sec average, ~120 peak**.
- 10B redirects/month → ~4K reads/sec average, ~12K peak.
- 5 years storage: 100M × 60 = **6B URLs**.
- Per record ~500 bytes → 6B × 500 = **3 TB raw**, ~9 TB with RF=3.

## Core API

```
POST /api/shorten
  body: { "long_url": "...", "custom_alias?": "...", "ttl_days?": 30 }
  → { "short_url": "https://sho.rt/abcdef" }

GET /{code}
  → 302 with Location: <long_url>

GET /api/analytics/{code}  (auth required)
  → { "clicks": N, "by_country": {...} }
```

## Encoding scheme

Short codes need ~6–8 chars from a 62-char alphabet `[a-zA-Z0-9]`.

- 62^6 ≈ 56 billion — enough.
- 62^7 ≈ 3.5 trillion — comfortable for 5+ years.

Two approaches:

### Hash-based (md5/sha256 → base62)
- Hash long URL, take first N base62 chars.
- Collision risk → check DB, increment if collision.
- Pro: stable mapping (same URL → same code if desired).
- Con: collisions, predictability.

### Counter-based (recommended)
- Maintain a global counter (DB sequence or Redis INCR).
- Encode counter in base62.
- Pro: no collisions, simple.
- Con: predictable (security issue if URLs are meant to be unguessable — add salt or use UUID-derived codes).

Multi-region: per-region counters with non-overlapping ranges (region A gets 0–1B, B gets 1–2B). Or generate codes via a snowflake-like ID generator.

## High-level architecture

```
                     ┌──────────┐
Client ──► CDN ──►   │   LB     │
                     └──────┬───┘
                            ↓
                     ┌──────┴───┐
                     │ App tier │ (stateless, autoscaled)
                     │ (FastAPI │
                     │ / Go )   │
                     └─┬────┬───┘
                       │    │
                  ┌────┘    └─────┐
                  ▼                ▼
              ┌────────┐    ┌──────────┐
              │ Redis  │    │  DB      │ (Postgres / Cassandra)
              │ cache  │    │ url_map  │
              └────────┘    └──────────┘
                                  │
                                  ▼
                              ┌─────────┐
                              │ Kafka   │ (click events)
                              └────┬────┘
                                   ▼
                             ┌──────────┐
                             │Analytics │ (ClickHouse / S3+Trino)
                             └──────────┘
```

## Data model

```sql
CREATE TABLE url_map (
  code        VARCHAR(8)  PRIMARY KEY,
  long_url    TEXT        NOT NULL,
  user_id     BIGINT,
  created_at  TIMESTAMP   NOT NULL,
  expires_at  TIMESTAMP,
  custom      BOOLEAN     DEFAULT FALSE
);
CREATE INDEX idx_user ON url_map(user_id);
CREATE INDEX idx_expires ON url_map(expires_at) WHERE expires_at IS NOT NULL;
```

Sharded by `code` (hash) once you outgrow one node.

For analytics (clicks), use a separate store — never the OLTP DB.

## Detailed design

### Write path (POST /shorten)

1. Validate URL (length, scheme).
2. Generate code:
   - Get next counter value (`INCR` in Redis, or a sequence in DB).
   - Encode in base62.
3. Insert into `url_map`.
4. Write-through to Redis cache.
5. Return short URL.

### Read path (GET /{code})

1. Check Redis cache.
2. If hit → 302 redirect immediately (~5 ms).
3. If miss → DB lookup → populate cache (with TTL = days for stable URLs) → redirect.
4. Asynchronously emit a click event to Kafka (don't block redirect).

### Click tracking

- Producer: emit `{code, ts, ip, ua, referrer}` to Kafka topic `url.clicks`.
- Consumer: aggregate into ClickHouse / Druid for real-time analytics; raw events to S3 Parquet for long-term.
- DO NOT increment a counter in the OLTP DB on every click — locks and write amplification.

### Caching strategy

- 80/20: a small fraction of codes get most traffic.
- Cache-aside with long TTL (codes are immutable).
- Redis cluster sized for ~20% of total URLs.
- On cache miss: stampede protection via single-flight (rare for distinct codes).

### Custom aliases

- User picks `/my-event`.
- Validate uniqueness; insert with `custom=true`.
- Reserved alias list (blacklist for confusing or branded terms).

### Rate limiting

- Per-API-key for `/shorten`.
- Per-IP for read endpoints to prevent abuse.
- Use Redis-based rate limiter.

## Scale-out

- **App tier**: stateless, behind LB, autoscale.
- **DB**: shard by code prefix or hash once one Postgres can't hold.
- **Redis**: cluster mode.
- **Geo**: CDN at edge for very hot codes (CloudFront / Cloudflare); analytics CDN handles cookie-less hits cheaply.
- **Multi-region active-active**: per-region counter ranges; eventual cross-region read.

## Bottlenecks & optimizations

- **Hot codes** (a viral link): CDN cache absorbs the spike.
- **Counter generation**: single global counter is a SPOF — use per-region ranges or distributed ID generator (Twitter Snowflake).
- **Click event write storm**: use Kafka to absorb burst; never write OLTP per click.
- **Analytics queries**: use OLAP store (ClickHouse, BigQuery), not the OLTP DB.

## Trade-offs

- 301 (permanent) vs 302 (temporary): 301 is browser-cached aggressively — analytics undercount. Default to **302** for accurate clicks.
- Counter-based codes are predictable. If unguessability matters (private links), use a random 8-char code derived from secure random or HMAC.
- Cache TTL: long for stable URLs, short for short-lived (expirable) URLs.

## Interview questions

### Q1: How would you generate short codes uniquely at scale?
Counter-based encoded in base62. For multi-region, partition counter ranges per region. Alternative: Twitter Snowflake-style 64-bit IDs (time + machine + sequence) — every ID unique without coordination.

### Q2: How to avoid DB hit on every redirect?
Cache codes in Redis. Codes are immutable so long TTL is safe. The hottest 1% of codes typically serve 50%+ of traffic — cache hit rate >99% with modest cache.

### Q3: How do you track click analytics without slowing the redirect?
Emit a Kafka event asynchronously; redirect proceeds in parallel. Aggregations happen in a separate consumer → ClickHouse/Druid for real-time, S3 Parquet for archival.

### Q4: A celebrity tweets a short URL; 1M clicks/sec. How does the system survive?
- CDN caches the redirect at edge — most clicks never hit origin.
- App tier and Redis scale horizontally.
- Click events go to Kafka — high-throughput append-only buffer.
- Origin DB sees ~1 read per cache TTL per region, plus 0 writes (no counter to update).

### Q5: A user wants `/my-event` as custom alias but it's taken. Design?
Check uniqueness against a reserved-aliases blacklist + existing customs. Return error if taken. Charge premium for custom aliases (typical product model).

### Q6: How to handle URL expiry?
Store `expires_at`; check on read, return 410 Gone if expired. Background job sweeps expired codes from primary store and CDN purge. Don't rely solely on TTL for security-sensitive expiry.

### Q7: A shortened malicious URL gets flagged. How do you take it down?
Add a `disabled` flag in `url_map`. On read, return error page if disabled. Issue CDN purge to remove cached redirects. Maintain a blacklist of malicious domains (or use a service like Google Safe Browsing) and reject on shorten if matched.

## TL;DR cheat sheet

- Counter-based codes + base62 encoding.
- Read-heavy: cache aggressively in Redis + CDN.
- Async click events to Kafka → ClickHouse for analytics.
- Multi-region: partition counter ranges per region.
- Use 302 not 301 to keep click analytics accurate.
- Stateless app tier; DB shard when needed.
- Rate-limit creates; not really reads (CDN handles).

## Go deeper

- **ByteByteGo**: ["URL Shortener course"](https://bytebytego.com/courses/system-design-interview/design-a-url-shortener).
- **System Design Primer**: [shortlink](https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design/pastebin).
- **Alex Xu, *System Design Interview Vol 1*** — Chapter 8.
- **Twitter Snowflake**: [github.com/twitter-archive/snowflake](https://github.com/twitter-archive/snowflake) — distributed ID generation.
- **bit.ly engineering blog** for production stories.
