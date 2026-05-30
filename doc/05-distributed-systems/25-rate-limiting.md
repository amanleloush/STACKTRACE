# 25 — Rate Limiting: Token/Leaky Bucket, Sliding Window

> Phase 5 • Distributed Systems • Topic 25/74

## Definition (interview-ready)

**Rate limiting** caps the number of operations a client (user, IP, key) can perform in a time window. **Token bucket** maintains a bucket of tokens refilled at a rate; each request consumes a token. **Leaky bucket** treats requests like water in a fixed-size bucket leaking at a constant rate. **Fixed window** counts in discrete buckets; **sliding window** counts over a rolling time interval to avoid boundary spikes.

## Why it matters

Rate limiting is the front line for: API abuse protection, DoS mitigation, fair resource sharing, cost control on expensive operations, defending downstream services. Done wrong, it punishes good users; done right, it's invisible.

<div class="sde-anim" data-anim="bucket"></div>

<div class="sde-anim" data-anim="rate-window"></div>

## Core concepts

### Token bucket

A bucket of capacity `C` refilled at `r` tokens/sec. Each request takes 1 token. If empty → reject (or queue).

```
state: tokens, last_refill
on request:
  now = current_time
  elapsed = now - last_refill
  tokens = min(C, tokens + elapsed * r)
  last_refill = now
  if tokens >= 1:
    tokens -= 1
    allow
  else:
    deny
```

Properties:
- **Allows bursts** up to bucket capacity.
- Smooth long-run rate.
- Simple to implement.

### Leaky bucket

Requests enter a queue (the bucket). They're processed at a constant rate (leak). Excess → drop or block.

- Implements **shaping** rather than just limiting — even output rate.
- No bursting beyond bucket size.
- Used in network QoS, less common at API layer.

### Fixed window counter

Count requests within each fixed clock interval (e.g., 1000/minute, reset at minute boundary).

```
key = "rl:" + user_id + ":" + minute_bucket
INCR key
EXPIRE key 60
if count > limit: deny
```

- Simple, cheap (one Redis op).
- **Boundary effect**: user can do 1000 requests at minute 59 and 1000 at the next minute 00 = 2000 in 2 seconds.

### Sliding window log

Track timestamps of each request in a sorted set; count entries within the window.

```
ZADD rl:user42 <ts> <ts>
ZREMRANGEBYSCORE rl:user42 0 (now - window)
n = ZCARD rl:user42
if n > limit: deny
```

- Exact, no boundary effect.
- Memory: O(requests in window) per user — expensive at scale.

### Sliding window counter (approximate)

Combine fixed windows with weighted overlap.

```
count = current_window * elapsed_in_current_window / window
      + previous_window * (1 - elapsed_in_current_window / window)
```

Roughly: count in current window + weighted slice of previous. Cheap (two counters) and avoids boundary spikes.

### Where to enforce

- **Per-edge** (CDN, gateway): cheap, distributed, drops attacks early.
- **Per-API** (gateway, service mesh): per-route, per-user.
- **Per-resource** (DB row, expensive call): protect specific resources.
- **Cascading**: per-IP + per-API-key + per-endpoint — common.

### Algorithms vs guarantees

| Algorithm | Bursty? | Exact? | Memory | Notes |
|---|---|---|---|---|
| Token bucket | Yes (up to C) | Approximate | O(1) per key | Most common |
| Leaky bucket | No | Approximate | O(1) per key + queue | Shaping |
| Fixed window | Yes (at boundary) | Exact within bucket | O(1) per key | Boundary effect |
| Sliding log | Configurable | Exact | O(N) | Expensive |
| Sliding counter | Modest | Approximate | O(1) per key | Best general fit |

### Distributed rate limiting

Single-node Redis fronts most APIs.

Challenges at scale:
- **Lua scripts** for atomicity (compute + check + increment in one).
- **Latency budget**: Redis adds ~1ms — fine for most APIs; bad for high-frequency internal RPCs.
- **Cross-region**: per-DC limits accept some drift; for global limits, lean on token bucket with cross-DC sync (Cloudflare's algorithm).

### Backoff and retry

Returning `429 Too Many Requests` with `Retry-After` header is standard. Clients should:
- Honor `Retry-After`.
- Use **exponential backoff** with jitter to avoid retry storms.
- Apply per-request budgets (don't retry forever).

### Quota vs rate limit

- **Rate limit**: short-term cap (per second/minute). Smoothing.
- **Quota**: long-term budget (per day/month). Accounting.

Often combined: 100 RPS short, 1M/day long.

## How it works (token bucket in Redis Lua)

```lua
-- KEYS: rl:userid
-- ARGV: now, refill_rate, capacity
local data = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(data[1]) or tonumber(ARGV[3])
local ts = tonumber(data[2]) or tonumber(ARGV[1])
local elapsed = tonumber(ARGV[1]) - ts
tokens = math.min(tonumber(ARGV[3]), tokens + elapsed * tonumber(ARGV[2]))
local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end
redis.call("HMSET", KEYS[1], "tokens", tokens, "ts", ARGV[1])
redis.call("EXPIRE", KEYS[1], 600)
return allowed
```

## Real-world examples

- **Stripe**: token bucket per API key, with overflows (allowed to spike briefly).
- **GitHub API**: tiered by auth (60/hr unauth, 5000/hr authenticated) + secondary limits per endpoint.
- **Cloudflare**: edge rate limiting, configurable per route, with bot detection on top.
- **AWS API Gateway**: per-account, per-API-key throttling.
- **Twitter/X**: layered limits — IP, user, app, tweet content.

## Common pitfalls

- **Limiting only by IP**: NAT'd corporate networks share IPs; mobile carriers do too. Combine with auth or device fingerprint.
- **Forgetting the boundary effect** of fixed windows.
- **Returning 200 OK silently dropping** — never. Return 429 with `Retry-After`.
- **No headers for clients** to see remaining quota — bad DX. Include `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- **Rate limit on read-only health checks** — kicks out probes; service marked unhealthy.
- **Atomicity bug**: GET then INCR can race; use Lua / INCR-then-check.
- **Limit too aggressive**: false positives during legitimate spikes (deploys, retries).
- **Rate limiting after expensive work**: limit at the edge, not after you've already burned the resource.

## Interview questions

### Q1 — Easy: Compare token bucket and leaky bucket.
Token bucket fills at a rate; each request consumes a token; allows bursts up to bucket size. Leaky bucket queues requests and drains at a constant rate — enforces smooth output, no bursting. Token bucket is more common for APIs (users like a little bursting); leaky is for shaping.

### Q2 — Easy: Why is fixed-window rate limiting flawed?
Boundary effect — a user can fully consume the limit at the end of one window and again at the start of the next, effectively doubling the allowed rate around the boundary. Sliding window approaches fix this.

### Q3 — Medium: How would you implement rate limiting in Redis?
For token bucket: Lua script that reads tokens + last refill timestamp, refills based on elapsed time, attempts to consume a token, atomically writes back. For sliding window log: sorted set + ZREMRANGEBYSCORE + ZADD + ZCARD. For sliding window counter: two counters and weighted math. Always Lua for atomicity.

### Q4 — Medium: How would you do rate limiting in a multi-region setup?
Several options:
- **Per-region limits** that sum to the global limit (with some buffer for drift) — simple, eventually consistent.
- **Local fast-path + global slow-path**: each region maintains a local counter and periodically syncs to a global truth.
- **Token leasing**: regions pull "leases" of tokens from a global pool, refill from it.
Most companies accept some over-limit at the boundary in exchange for simplicity.

### Q5 — Medium: What HTTP responses and headers should rate-limited APIs return?
- `429 Too Many Requests` status code.
- `Retry-After: 30` — seconds (or HTTP date) the client should wait.
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (Unix timestamp).
- Clear error body explaining limits and how to upgrade.

### Q6 — Hard: Design a rate limiter for a public API tiered by plan (free 100/min, pro 1000/min, enterprise 10000/min).
- Token bucket per (user, plan) with capacity = limit, refill = limit/60/sec.
- Stored in Redis under `rl:{user_id}` — single-key, atomic Lua.
- Plan looked up from a config table cached locally.
- Return 429 + `Retry-After` + remaining counter.
- Add a secondary limit per endpoint family (heavy endpoints get sub-limits).
- Add a global concurrency cap per user (semaphore in Redis) to prevent long-running endpoints from monopolizing.
- Log denials for observability and abuse detection.

### Q7 — Hard: A legitimate user gets rate-limited because they retry too aggressively after 429. Solutions?
- Document and require **exponential backoff + jitter** in their client.
- Surface `Retry-After` honored by client SDKs.
- Add a **secondary "burst" tolerance** — allow some bursting above limit, then deny.
- Educate via dashboard/logs — show the user *why* they hit the limit.
- Consider tier upgrade prompts vs hard cap.

### Q8 — Hard: Your rate limiter starts adding 5ms to every request — too much. Why and how to fix?
- Network RTT to Redis is ~1ms; if Redis is in a different DC, much more. Co-locate.
- Lua script may be slow (complex math, multiple commands). Profile via `SLOWLOG`.
- Connection pool exhaustion → latency under load. Increase pool size.
- Consider **local pre-check + async sync to global** for steady-state efficient path (only consult Redis when local is empty).
- Alternative: in-memory rate limiter at each gateway instance with periodic sync (eventually consistent global limit).

## TL;DR cheat sheet

- **Token bucket**: tokens refill at rate r, capacity C → allows bursts up to C. Most common.
- **Leaky bucket**: constant-rate processing of queued requests → smooths output.
- **Fixed window**: cheap, has boundary effect (2x spike at edges).
- **Sliding log**: exact, expensive memory (O(N) per user).
- **Sliding counter**: cheap + reasonably accurate. Sweet spot.
- Always **Lua** for atomic Redis-based check-and-increment.
- Return 429 + `Retry-After` + rate limit headers.
- Layer limits: per IP, per user, per endpoint. Apply at edge if possible.
- For distributed: accept drift or use lease-based / regional sums.

## Go deeper

- **Stripe blog**: ["Scaling your API with rate limiters"](https://stripe.com/blog/rate-limiters) — the canonical post.
- **ByteByteGo**: ["Rate Limiting Fundamentals"](https://blog.bytebytego.com/p/rate-limiting-fundamentals).
- **Cloudflare blog**: counting algorithms, sliding window counter.
- **Alex Xu**, *System Design Interview Vol 1*, Chapter 4 — rate limiter design.
- **GitHub Engineering**: blog posts on their secondary rate limits.
- **Redis docs**: examples in the [rate limiting recipes](https://redis.io/commands/incr/).
