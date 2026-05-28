# 46 — HLD: Ride-Sharing (Uber / Lyft)

> Phase 7 • HLD Problems • Topic 46/74

## Problem statement

Design a ride-sharing platform: riders request a trip, the system finds nearby drivers, matches optimally, tracks the ride, and processes payment.

## Requirements

### Functional
- Riders request a ride from origin to destination.
- Drivers update location continuously.
- Find nearest drivers and dispatch.
- Trip lifecycle: requested → matched → en-route → in-trip → completed.
- ETAs, fares, surge pricing.
- Payment.

### Non-functional
- Real-time location updates (≤ 5 s lag).
- p99 dispatch < 5 s.
- Massive concurrency in dense cities.
- Globally distributed (region-isolated).

## Scale estimation

- 10M drivers worldwide; 1M concurrent online.
- Location update every 4 seconds → 250K updates/sec.
- 1M trips/day per region.

## High-level architecture

```
                        ┌──────────────┐
   Rider App ──────────►│ Trip API     │
                        └──────┬───────┘
                               ▼
                    ┌──────────┴──────────┐
   Driver App ────►│ Location Service     │ ── geo index (S2 / Geohash)
                    └─────────┬───────────┘
                              ▼
                   ┌──────────────────┐
                   │   Dispatch       │ ── matching algorithm
                   │   Engine         │
                   └──────────┬───────┘
                              ▼
                       ┌──────────┐
                       │ Trip Svc │ ── state machine
                       └────┬─────┘
                            ▼
                  ┌────────────────────┐
                  │ Payment + Receipts │
                  └────────────────────┘
```

## Detailed design

### Geo indexing

The core problem: "find drivers within 1 km of (lat, lng) in 10ms."

#### Geohash

Encode (lat, lng) into a string. Nearby points share prefixes. Pros: simple, indexable in any DB. Cons: distortion at boundaries.

#### S2 cells (Google)

Hierarchical spherical cells covering the globe. Each cell has an ID; nearby cells have nearby IDs. Used by Uber, Tinder, Pokémon Go for location.

#### H3 (Uber)

Hexagonal hierarchical index. Hexagons have uniform-distance neighbors (squares don't). Uber's open-source library; production-grade.

#### Quadtree / R-tree

In-memory data structures for range queries. Per-process maps; sharded across services.

**Pick H3 or S2 for geo distribution at planetary scale.**

### Location updates

- Driver app sends GPS every ~4 seconds.
- Updates routed via load balancer (consistent hash by driver_id) to a Location Service.
- Update in-memory + writes to Kafka (durability + downstream consumers).
- Geo index updated.
- For freshness, keep in-memory; persist periodic snapshot.

### Dispatch / matching

When rider requests:
1. Lookup their pickup S2/H3 cell + neighbors (within ~1 km).
2. Get list of available drivers in those cells.
3. Filter: vehicle type, rating, busy status.
4. Score and pick best match (distance, ETA, driver utilization).
5. Send dispatch notification to chosen driver.
6. Wait for accept; on decline/timeout, try next.

Variants:
- **First-accept**: send to N drivers, first to accept wins. Worse for drivers (rejection rate).
- **Bidding / batched matching**: in dense areas, batch riders + drivers for global optimum (Uber Marketplace).

### Trip state machine

```
REQUESTED → MATCHED → DRIVER_EN_ROUTE → ARRIVED → IN_TRIP → COMPLETED
                ↓
             CANCELED (by rider or driver)
```

Persistent state in DB; state transitions emit events to Kafka for downstream (notifications, analytics, surge model).

### Surge pricing

- Stream of demand (requests) and supply (online drivers) per cell.
- Real-time model (Flink) computes supply-demand ratio per cell.
- Surge multiplier per cell, updated every 1–2 minutes.
- Applied at fare quote time.

### ETAs

- Routing engine: graph of road network with current traffic.
- OSRM (open source), Google Maps API, or proprietary engine.
- Cache ETAs for common O-D pairs.
- For fast UI, predict ETA before full route compute.

### Payment

- Pre-authorize card on trip start.
- Capture on trip end with final fare.
- Saga (Topic 43) for cancellations / disputes.
- Driver payouts: separate ledger and bank transfer flow.

### Region isolation

Each city / region has its own service stack:
- Pros: blast radius limited, latency local, compliance easier.
- Cons: cross-region trips (rare) need coordination.

## Bottlenecks & optimizations

- **Location write storm**: 250K updates/sec. Sharded by driver_id; in-memory per shard.
- **Geo query at scale**: H3 cells precomputed; per-cell index is a small list.
- **Dispatch latency**: pre-warm rider-side ETAs; in-memory matching.
- **Push to driver app**: WebSocket connections per driver (Topic 38 concepts).
- **Surge calculation**: streaming aggregation; not batch.

## Trade-offs

- **First-accept vs auctioned matching**: faster vs better global match.
- **Push vs poll for driver updates**: push (WebSocket) is real-time; poll is simpler but slower.
- **Real-time surge vs smoothed**: real-time reacts faster; smoothed avoids price flapping.

## Interview questions

### Q1: Why H3 or S2 over a SQL geo query?
SQL geo queries (`WHERE distance < r`) can use PostGIS but slow at scale; hierarchical cell index gives O(1) cell lookup + small per-cell list. Much faster for "drivers within 1km" at 100K+ QPS.

### Q2: How does the dispatch engine match riders to drivers?
For each rider request, look up nearby cells, filter available drivers, score by ETA + utilization, dispatch to top match(es). Accept/timeout drives next attempt. For dense areas, batched optimization (assigns multiple rider-driver pairs jointly) wins.

### Q3: How do you handle 1M concurrent drivers updating location every 4s?
- Driver app → WebSocket / HTTP to Location Service.
- Service shards by driver ID; each shard handles a slice.
- In-memory geo index per shard, updated on every event.
- Persisted to Kafka for durability and downstream consumers.

### Q4: Walk through the trip state machine.
Requested → Matched (driver accepted) → Driver en route → Arrived → In trip → Completed. Each transition is persisted and emits events. Cancellations handled at any state with appropriate compensation.

### Q5: Design surge pricing.
- Stream demand (requests/sec/cell) and supply (online drivers/cell) into Flink.
- Compute supply-demand ratio per cell on a sliding window.
- Apply a function (e.g., piecewise) to get surge multiplier.
- Update every 1–2 minutes; push to mobile clients.
- Smooth via EMA to avoid flapping.

### Q6: How do you handle a driver going offline mid-trip?
- Detect via heartbeat loss.
- Try to recover (driver app retries connection).
- If extended: notify rider; offer reassignment if possible.
- Trip state machine has a "stuck" state that escalates to support.
- Money: trip data captured; partial fare logic applied.

### Q7: How would you globally optimize dispatch (e.g., not greedy per request)?
Batched marketplace optimization: every N seconds, snapshot all pending requests and available drivers; solve as a bipartite matching problem (Hungarian algorithm or LP). Optimizes global utility (less waste). Used by Uber for dense areas. Tradeoff: small delay (a few seconds) for batching.

### Q8: How to scale to a new city?
- Spin up a new region: services + DBs + Kafka.
- Pre-load map data (OSRM tiles, H3 grid).
- Local payment integration if needed.
- Region routing at edge.
- Compliance + legal per jurisdiction.
- Region isolation: a city outage doesn't affect others.

## TL;DR cheat sheet

- Geo index: H3 (Uber) or S2 (Google) cells.
- Driver locations: sharded in-memory + Kafka for downstream.
- Dispatch: lookup nearby cells, filter, score, dispatch.
- Trip state machine: persisted, eventful.
- Surge: streaming aggregation per cell.
- Region-isolated stacks; cross-region rare.
- Payment: pre-authorize + saga capture.
- WebSocket from driver/rider apps for real-time.

## Go deeper

- **Uber Engineering**: [H3](https://www.uber.com/blog/h3/), DISCO (dispatch), Schemaless (KV).
- **Lyft engineering blog**: geo indexing, dispatch.
- **High Scalability**: Uber architecture posts.
- **ByteByteGo**: Uber-style design videos.
- **Alex Xu Vol 2**: ride-sharing design.
