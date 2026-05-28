# 36 — HLD: Distributed Rate Limiter

> Phase 7 • HLD Problems • Topic 36/74

## Problem statement

Design a rate limiter that enforces request quotas per user/API key across many app servers and regions, returning `429 Too Many Requests` when exceeded, with low latency.

## Requirements

### Functional
- Per-key limits (user, API key, IP).
- Multiple tiers (free 100/min, pro 1K/min, enterprise 10K/min).
- Returns 429 + `Retry-After`.
- Optionally: per-endpoint limits, per-time-window quotas.

### Non-functional
- Latency overhead < 5 ms per request (ideally < 2 ms).
- Available — never fail open silently, never fail closed entirely.
- Accurate enough — small over/under-limit acceptable (≤ 1% drift).
- Multi-region with low cross-region traffic.

## Scale estimation

- 1M QPS across the platform.
- Each request consumes one rate-limit check.
- 100M unique keys (users + API keys).
- State per key: ~50 bytes → 5 GB. Fits in memory.

## High-level architecture

```
                   ┌────────────┐
       Client ──►  │ API Gateway│ ──► App Tier
                   └─────┬──────┘
                         ▼
                   ┌──────────────┐
                   │ Rate Limiter │
                   │   sidecar    │
                   └──────┬───────┘
                          ▼
                   ┌──────────────┐
                   │ Redis (Lua)  │ ──► (optional Kafka)
                   └──────────────┘
```

Two placement choices:
- **Gateway-level**: cheap, global view, but extra network hop.
- **Per-service / sidecar**: closer to the call; one Redis op per request.

Most production setups use **gateway-level for ingress + per-service for sensitive endpoints**.

## Algorithm choice

**Token bucket** (recommended):
- Allows controlled bursting (UX-friendly).
- O(1) per check via Lua script.
- See Topic 25.

For exact limits, sliding-window counter is the next choice.

## Detailed design

### Lua-script rate limit (token bucket)

```lua
-- KEYS[1] = rl:user42
-- ARGV: now_ms, refill_rate (per ms), capacity
local b = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(b[1]) or tonumber(ARGV[3])
local ts = tonumber(b[2]) or tonumber(ARGV[1])
local elapsed = tonumber(ARGV[1]) - ts
tokens = math.min(tonumber(ARGV[3]), tokens + elapsed * tonumber(ARGV[2]))
local ok = 0
if tokens >= 1 then
  tokens = tokens - 1
  ok = 1
end
redis.call("HMSET", KEYS[1], "tokens", tokens, "ts", ARGV[1])
redis.call("EXPIRE", KEYS[1], 600)
return ok
```

One round-trip, atomic, ~1 ms.

### Plan lookup

- Plans table (small) cached in memory at app boot, refreshed every N minutes.
- Key → plan resolved before the Redis call.

### HTTP response

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1716985260
Content-Type: application/json

{ "error": "rate_limit_exceeded", "retry_after": 30 }
```

### Multi-tier limits

- Per-user: 1000/min.
- Per-endpoint family: 100/min on `/search`.
- Per-IP fallback (for unauthenticated traffic).
- Each tier = separate Redis key; all must allow → request passes.

```
allowed = all([
  rate_limit("user:42", per_user_limit),
  rate_limit("endpoint:search:user:42", per_endpoint_limit),
  rate_limit("ip:1.2.3.4", per_ip_limit),
])
```

### Multi-region strategy

Two approaches:

#### 1. Per-region limits (sum-of-regions ≤ global limit)

- Each region has its own Redis.
- Pro: low latency, simple.
- Con: drift — a user can briefly exceed global limit if traffic is uneven.

Acceptable for most use cases.

#### 2. Global synchronization

- Each region pulls **leases** from a global counter.
- More accurate; more complex.
- Used by Cloudflare for strict per-second global limits.

Most teams use #1 with conservative per-region caps.

### Failure modes

- **Redis down**: fail open? fail closed?
  - **Fail open**: allow all requests during outage. Risk: protected resource gets overwhelmed.
  - **Fail closed**: reject all. Risk: outage visible to all users.
  - **Practical**: degraded mode — local in-memory token bucket per gateway instance as fallback (no global view, but each instance limits itself).

### Header propagation

For composite rate limits (gateway + service), the gateway can pass `X-RateLimit-Cost` and `X-RateLimit-Plan` headers; downstream services trust the gateway.

## Optimizations

- **In-memory cache + periodic sync**: each gateway instance maintains a local token bucket; periodically syncs with Redis to merge state. Reduces Redis pressure dramatically. Used by Stripe and others.
- **Batched updates**: instead of every request hitting Redis, batch updates per (key, window). Tradeoff: small accuracy loss.
- **Sliding window counter** instead of token bucket for stricter limits without sacrificing too much accuracy.
- **Sharded Redis by key**: hash key → Redis instance. Linear scaling.

## Trade-offs

- **Strict accuracy vs latency**: cross-region sync = accurate but slow. Per-region = fast but drifts.
- **Token bucket vs sliding window**: token bucket allows bursting (good UX); sliding window is smoother (anti-burst).
- **Fail open vs closed**: matters when Redis fails. Tier-based: fail closed for sensitive APIs, fail open for read-only.
- **Per-IP limiting**: NATs and mobile carriers share IPs — false positives. Combine with user limits.

## Interview questions

### Q1: How would you implement rate limiting in Redis?
Lua script implementing token bucket: read tokens + last refill timestamp, refill based on elapsed time, attempt to consume a token, write back. Lua makes it atomic in one Redis round trip.

### Q2: How to handle multi-region rate limiting?
Per-region limits with sum-of-regions ≤ global is the most common. Each region operates independently; some drift accepted. For strict global limits, regions pull leases from a global counter (more complex).

### Q3: Token bucket vs sliding window counter — when to use each?
Token bucket allows controlled bursting (better UX); sliding window counter is closer to a strict rate. For user-facing APIs, bursting is desirable (a quick rush isn't abuse). For DDoS protection, smoother is better.

### Q4: A rate limiter adds 5 ms to every request — too much. Optimize.
- Local cache + periodic Redis sync: maintain local state, sync every N ms or every K requests.
- Co-locate Redis with the gateway (same DC).
- Batch updates.
- Avoid extra round trips: combine plan lookup with rate check via Lua.

### Q5: What happens when Redis fails?
Options: fail open (let all through, risk overload), fail closed (reject all, visible outage), degraded (per-instance fallback). Tier responses by endpoint sensitivity: fail open for read paths, fail closed for write paths.

### Q6: Design rate limiting for a free/pro/enterprise tiered API.
- Plans table mapping user_id → plan (free 100/min, pro 1K/min, enterprise 10K/min).
- Cached in app for fast lookup.
- Per-user token bucket with capacity = limit.
- Refill rate = limit / 60 per second.
- Optional per-endpoint sub-limits for expensive operations (e.g., 10/min on `/export`).
- 429 + Retry-After + headers.

### Q7: Design abuse detection on top of rate limiting.
- Stream all rate-limit events to Kafka.
- Consumer detects patterns: same IP rotating user agents, burst-then-pause, denied requests from known abusers.
- Auto-throttle abusers (lower their tier dynamically) or escalate to security team.
- WAF rules for known bad signatures.

### Q8: User reports being rate-limited when they shouldn't be. Investigate.
- Check actual recent request rate from logs vs limit.
- Look at all rate-limit tiers (user, endpoint, IP) — which one tripped?
- Clock skew: if Lua uses local time vs Redis time, mismatch may misfire.
- Plan misconfig: their plan downgraded?
- Bug in Lua script under edge case (e.g., very small intervals).
- NAT'd IP shared with abuser?

## TL;DR cheat sheet

- Token bucket in Redis via Lua = single round trip, atomic, ~1 ms.
- Multi-tier: user + endpoint + IP limits combined.
- Multi-region: per-region with sum ≤ global; accept drift.
- Return 429 + `Retry-After` + headers.
- Optimize: local cache + sync, batched updates.
- On Redis failure: tier the fail-open/closed by endpoint sensitivity.
- Pair with abuse detection pipeline.

## Go deeper

- **Stripe blog**: ["Scaling your API with rate limiters"](https://stripe.com/blog/rate-limiters).
- **ByteByteGo**: ["Design a Rate Limiter"](https://www.youtube.com/watch?v=YXkOdWBwqaA).
- **Alex Xu Vol 1** Ch. 4.
- **Cloudflare blog**: counting algorithms, sliding window counter.
- **GitHub**: secondary rate limits explanation.
- Topic 25 in this collection for algorithmic deep dive.
