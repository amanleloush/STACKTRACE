# 34 — API Gateways + BFF Pattern

> Phase 6 • HLD Patterns • Topic 34/74

## Definition (interview-ready)

An **API gateway** is a single entry point in front of multiple backend services, handling cross-cutting concerns: routing, authentication, rate limiting, TLS termination, request/response transformation, and observability. The **BFF (Backend-for-Frontend)** pattern creates one purpose-built gateway per client type (web, mobile, partner API) so each is tailored to its consumer's needs rather than serving a generic "one API for all."

## Why it matters

Once you have more than 3 services, putting clients (web, mobile, third parties) directly in front of them is a mess: every client needs to know every service, authenticate to each, handle retries, parse different formats. A gateway centralizes this. The BFF pattern then takes it further: mobile and web have *different* needs (data shapes, payload sizes, auth flows) — one BFF each.

## Core concepts

### API gateway responsibilities

- **Routing**: `/orders/*` → Orders service, `/payments/*` → Payments.
- **AuthN/AuthZ**: verify JWT or session, look up permissions, attach `user_id` to downstream calls.
- **Rate limiting** and quota enforcement.
- **TLS termination** at the edge.
- **Request/response transformation**: protocol translation (REST ↔ gRPC), payload reshaping.
- **Aggregation/Composition**: optionally compose responses from multiple backends into one (careful: latency tax).
- **Logging, metrics, tracing**: a single point to capture all incoming traffic.
- **Caching**: short-TTL response cache for hot read endpoints.
- **CORS**: handle browser preflight requests.
- **API versioning**: route by version header or URL.

### What an API gateway should NOT do

- **Business logic** — keep that in services. The gateway should be policy + plumbing.
- **Stateful session management** — keep sessions in a real store (Redis); the gateway is stateless.
- **Long-running orchestration** — that's a workflow engine (Temporal) or a saga, not gateway logic.
- **Become a god-class** with all logic crammed in — that's reinventing the monolith at the front.

### Gateway placement

```
[ Clients ] → [ CDN/edge ] → [ API Gateway ] → [ Services ]
                                        ↓
                                  [ Auth/RBAC ]
                                  [ Rate limit ]
                                  [ Observability ]
```

Some teams put a CDN in front of the gateway (cacheable GETs), some have the gateway behind a global load balancer (multi-region).

### BFF (Backend for Frontend)

A separate gateway per client family:
- **Web BFF**: serves the web app — bigger payloads, browser-friendly auth (cookies).
- **Mobile BFF**: smaller payloads, more aggressive compression, mobile-specific auth.
- **Partner BFF / Public API**: strict versioning, stable contracts, API keys, quotas.
- **Internal BFF**: admin tools or internal portals.

Each BFF can:
- Compose responses tailored to its UI's needs.
- Strip fields the client doesn't need.
- Use efficient internal protocols (gRPC) while exposing what's right externally.
- Move at the pace of its team (web team owns web BFF, mobile owns mobile BFF).

### Tradeoffs of BFF

Pros:
- Tailored client experience; no over-fetching/under-fetching.
- Independent evolution.
- Better mobile performance (smaller payloads).
- Each team owns their BFF — clear responsibility.

Cons:
- More gateways to operate.
- Duplicated logic across BFFs (mitigated by shared libraries).
- Risk of business logic creeping into BFFs.

### API gateway products

- **Open source**: Kong, Envoy, Nginx, Tyk, Apache APISIX.
- **Managed**: AWS API Gateway, GCP API Gateway, Azure API Management.
- **Built-in to mesh**: Istio Gateway, Linkerd's edge.
- **Custom-built**: many large companies (Netflix Zuul, LinkedIn's Rest.li).

### Gateway vs service mesh

- **API gateway**: north-south traffic (clients ↔ services), at the edge of your system.
- **Service mesh**: east-west traffic (service ↔ service) within your system.

They're complementary. Modern setups have both: gateway at the edge + mesh internally.

### Aggregation pattern

Gateway composes a response from multiple backends:
```
GET /home →
  parallel: profile from UserService, feed from FeedService, notifications from NotifService
  merge → return single payload
```

Tradeoff:
- Pro: client gets one round trip.
- Con: gateway latency = slowest backend; failures partial; complexity creeps into gateway.

Best: keep aggregation thin (BFF use case), don't put serious logic in there. For complex composition, build a real composition service or use GraphQL with a federation layer.

### GraphQL gateway / federation

Apollo Federation, Hasura — gateways that resolve a unified GraphQL schema by querying multiple backend services. Each service owns its part of the schema. Clients query one endpoint, get exactly the fields needed.

Trade-offs: powerful for diverse client needs, but adds complexity in the gateway tier. Caching is harder. Authorization needs field-level care.

## How it works (gateway request lifecycle)

```
1. Client → CDN → API Gateway.
2. Gateway:
   a. Terminate TLS.
   b. Parse JWT, validate signature, expiry.
   c. Look up rate limit budget for this user/API key.
   d. Apply request transformation (rename headers, strip internal-only fields).
   e. Route based on path/method.
3. Gateway → Service (over internal network, possibly gRPC).
4. Service response → Gateway response transformation (strip internal fields, add headers).
5. Gateway → Client.

Throughout: emit metrics, logs, traces.
```

## Real-world examples

- **Netflix Zuul** (and later Zuul 2, then a custom gateway): edge gateway for streaming services.
- **AWS API Gateway**: managed; handles billions of requests; integrates with Lambda.
- **Kong**: open-source gateway, plugin-rich.
- **Shopify**: GraphQL gateway (Storefront API) for storefronts.
- **GitHub**: REST + GraphQL gateways.
- **Phil Calçado on BFF**: classic post about the SoundCloud BFF pattern (origin of the term).

## Common pitfalls

- **Business logic in the gateway**: gateway becomes the new monolith. Keep it thin.
- **Stateful gateway**: sessions, caches — these should live in dedicated stores.
- **Synchronous fan-out blowing latency**: composing 10 services in a single response = slowest-of-10 latency.
- **No rate limiting**: gateway absorbs DDoS but propagates it to services.
- **TLS only at the gateway**: backend-to-backend cleartext is a security gap. Use mTLS internally.
- **Single gateway as SPOF**: it's at the front of everything; HA, multi-region critical.
- **Versioning mess**: gateway routes by version → version logic spreads across all routes. Centralize.
- **Trying to be smart with caching**: caching responses with user-specific data is dangerous.
- **Auth split between gateway and services**: re-validate JWT at services to be safe — gateway is in your trust boundary, but a buggy gateway shouldn't authorize too much.

## Interview questions

### Q1 — Easy: Why use an API gateway?
Centralize cross-cutting concerns: auth, rate limiting, TLS termination, routing, observability, request transformation. Otherwise, every client needs to know every service and every service handles auth/rate-limit separately.

### Q2 — Easy: What is the BFF pattern?
Backend for Frontend — a separate API gateway per client type (web, mobile, partner). Each BFF is tailored to its consumer: payload size, response shapes, auth method, ownership.

### Q3 — Medium: When would you use one gateway vs multiple BFFs?
One gateway: small teams, similar clients, single product. Multiple BFFs: distinct clients with very different needs (mobile vs web vs partner API), separate teams owning each, performance-sensitive mobile vs feature-rich web.

### Q4 — Medium: Should the API gateway do business logic?
Generally no — keep the gateway thin and focused on cross-cutting concerns. Business logic in the gateway becomes a chokepoint and a re-implemented monolith. BFFs can do light shaping/composition for their specific UI, but anything domain-specific belongs in a service.

### Q5 — Medium: Difference between API gateway and service mesh?
API gateway = north-south traffic (clients ↔ services), at the system boundary. Service mesh = east-west traffic (service ↔ service), internal. Different concerns; complementary in a modern setup.

### Q6 — Hard: Your team is building a mobile app for a service that already has a web UI. Design the gateway strategy.
Two BFFs:
- **Web BFF**: handles browser auth (cookies, CSRF), large rich responses, fewer mobile-specific constraints.
- **Mobile BFF**: token auth, small JSON payloads, compression, offline-friendly responses, batched calls.

Both call the same internal services (typically via gRPC). Shared auth library; shared rate limit policy; per-route logic in each BFF.

### Q7 — Hard: A team built a "smart" API gateway that aggregates responses from 10 services for each request. P99 spiked. Fix?
- The gateway's p99 = max(p99 of 10 backends) + composition cost. Tail latency amplification.
- Fixes:
  - Identify the slowest call and reduce its p99 (cache, retry, optimize backend).
  - Make non-critical calls truly optional (return partial response if some fail).
  - Move aggregation to client where possible.
  - Use HTTP/2 multiplexing or gRPC streaming so backends respond concurrently.
  - Cache aggregated responses where safe.

### Q8 — Hard: A gateway centralizes auth. A bug causes it to accept invalid tokens. Mitigations?
- **Defense in depth**: services should re-validate JWT signature/expiry. Gateway is in trust boundary, but bugs shouldn't escalate.
- **Audit log every request** with user ID + action.
- **Quick rollback**: gateways should support fast rollback to last-known-good config.
- **WAF rules**: stop obviously bad requests at edge before they reach the gateway.
- **Bug bounty / security review** for gateway code.
- Post-incident: add fuzz testing, contract tests against valid/invalid token shapes.

## TL;DR cheat sheet

- API gateway = single entry point: routing, auth, rate limit, TLS, transformation, observability.
- Keep the gateway **thin**: cross-cutting only, not business logic.
- **BFF** = per-client gateway (web, mobile, partner). Tailored payloads and auth.
- Pair with **service mesh** for east-west (internal) traffic.
- Aggregation in gateway is OK for BFFs but introduces tail-latency risk.
- Always have HA + multi-region; gateway is a SPOF for everything behind it.
- Backend should re-validate auth even if gateway already did.

## Go deeper

- **Sam Newman**: ["Backend For Frontend pattern"](https://samnewman.io/patterns/architectural/bff/) — origin reference.
- **Phil Calçado**: ["The Back-end for Front-end Pattern (BFF)"](https://philcalcado.com/2015/09/18/the_back_end_for_front_end_pattern_bff.html) — SoundCloud experience.
- **Microservices.io**: [API gateway pattern](https://microservices.io/patterns/apigateway.html).
- **Kong docs**, **Envoy docs**, **AWS API Gateway docs**.
- **Apollo Federation** docs — for GraphQL gateways.
- **Building Microservices** (Sam Newman) — chapter on gateways and APIs.
