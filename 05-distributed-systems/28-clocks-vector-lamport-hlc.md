# 28 — Vector Clocks, Lamport Timestamps, HLC

> Phase 5 • Distributed Systems • Topic 28/74

## Definition (interview-ready)

In a distributed system, **wall-clock time can't be trusted** because clocks drift and aren't perfectly synced. **Logical clocks** capture causal ordering instead of real time:
- **Lamport timestamps**: a single counter per process that orders events causally but **can't distinguish concurrent vs ordered**.
- **Vector clocks**: one counter per process; comparing vectors tells you `<`, `>`, or "concurrent."
- **Hybrid Logical Clocks (HLC)**: combine wall-clock time + logical counter for near-physical ordering with causal guarantees.

## Why it matters

Wall-clock ordering breaks: replicas with skewed clocks make wrong decisions ("which write won?"). Distributed systems use logical or hybrid clocks for consistency, replication conflict resolution, version vectors, and tracing. Understanding the model determines correctness, not just performance.

## Core concepts

### The clock problem

- **NTP** keeps clocks within ~10s of milliseconds on a good network — but skew is real.
- **Leap seconds** add discontinuities.
- **VM clock drift**: virtual machines can lag or jump.
- **Clock skew between data centers**: easily 100ms+.

Last-write-wins (LWW) using wall-clock time can incorrectly drop a later write whose clock is behind. Cassandra historically had this problem; designed around it.

### Happens-before relation (Lamport, 1978)

`a → b` (a happens-before b) if:
1. `a` and `b` are in the same process and `a` precedes `b`, OR
2. `a` is a send and `b` is the matching receive, OR
3. Transitivity: `a → c → b`.

Two events are **concurrent** if neither happens-before the other.

### Lamport timestamps

Each process keeps a counter `C`.
- On any event: `C = C + 1`.
- On send: include `C` in the message.
- On receive (with `T`): `C = max(C, T) + 1`.

Guarantee: if `a → b`, then `C(a) < C(b)`.

**But not the reverse**: `C(a) < C(b)` doesn't imply `a → b`. They might be concurrent.

For total ordering, break ties by process ID. Useful for systems that need *some* deterministic order, like Spanner's TrueTime fallback ordering.

### Vector clocks

Each process maintains a vector `V` of length N (one entry per process).
- On any event in process i: `V[i] += 1`.
- On send: include the entire vector.
- On receive (with `W`): `V[j] = max(V[j], W[j])` for all j, then `V[i] += 1`.

Comparing vectors:
- `V1 < V2` iff every `V1[i] ≤ V2[i]` AND at least one `V1[i] < V2[i]` → `V1` happens-before `V2`.
- `V1 = V2` → same event (in theory, unlikely).
- Neither dominates → **concurrent**.

This is the only structure that can detect concurrency.

### Version vectors (vector clocks for objects)

Same idea but per-object. Used by:
- **Dynamo / Riak**: each object has a version vector; on read with multiple concurrent versions, return them all and let the application reconcile (LWW, app-specific merge, CRDT).
- **DVCS like Git**: not exactly version vectors but similar — partial-order revision history.

### Cost of vector clocks

A vector grows with the number of writer processes. With pruning (drop stale entries when a process is decommissioned), it stays manageable. But unbounded distinct writers = unbounded vector size — a real concern in DBs with many clients writing directly (Cassandra opted not to use full vector clocks for this reason).

### Hybrid Logical Clocks (HLC)

Goal: a timestamp that's close to physical time (so wall-clock readers make sense) but also preserves causal ordering.

```
HLC = (physical_part, logical_part)
On event:
   physical = max(local_physical_clock, last_HLC.physical)
   if physical == last_HLC.physical:
     logical = last_HLC.logical + 1
   else:
     logical = 0
   HLC = (physical, logical)

On receive with HLC_msg:
   physical = max(local_clock, last_HLC.physical, HLC_msg.physical)
   if physical == last_HLC.physical == HLC_msg.physical:
     logical = max(last.logical, HLC_msg.logical) + 1
   elif physical == last_HLC.physical:
     logical = last.logical + 1
   elif physical == HLC_msg.physical:
     logical = HLC_msg.logical + 1
   else:
     logical = 0
   ...
```

Properties:
- Monotonically increasing.
- Close to wall-clock (so it sorts roughly as humans expect).
- Captures happens-before — like Lamport, but with physical anchoring.

Used by: CockroachDB, YugabyteDB, MongoDB (since 3.6 for replica set ordering).

### TrueTime (Spanner)

Google's atomic-clock-backed API: returns time as `[earliest, latest]` interval. Commits wait out the interval to guarantee external consistency (strict serializability). Hardware investment (atomic clocks + GPS in every DC). Practically, HLC achieves much of what TrueTime does without hardware, at the cost of needing some clock sync (NTP) and slightly weaker guarantees.

### Practical applications

- **Conflict resolution in eventually-consistent stores**: use version vectors to detect conflicts; resolve via app logic, LWW, or CRDTs.
- **CDC ordering across replicas**: HLC for partial orderings.
- **Distributed tracing**: spans timestamped with HLC for cross-service ordering.
- **Snapshot reads in distributed DBs**: HLC timestamps define snapshots.
- **Snapshots in stream processing**: barriers tagged with sequence numbers (Flink, Kafka Streams).

## How it works (Lamport on three nodes)

```
P1: C=1 send to P2 with C=1
P2 receives (T=1): C=max(0,1)+1=2; C=3 send to P3 with C=3
P3 receives (T=3): C=max(0,3)+1=4
P1 does another local event: C=2 (independent of P2/P3)

Order:
  Events: (P1,1), (P1,2), (P2,2), (P2,3), (P3,4)
  (P1,1) → (P2,2)  (causal: send/receive)
  (P1,2) and (P2,2): concurrent — Lamport says 2<2 isn't helpful;
                     ties broken by process ID for total order.
```

## Real-world examples

- **Riak / Dynamo**: vector clocks per object → multiple "siblings" on conflict.
- **CockroachDB**: HLC for transaction ordering and snapshot reads.
- **MongoDB**: HLC (since 3.6) for oplog ordering and causal consistency.
- **Cassandra**: uses wall-clock timestamps (LWW), with all the caveats. Knowing this is critical when writing to Cassandra.
- **Google Spanner**: TrueTime for global strict serializability.
- **Distributed tracing (Jaeger, Zipkin)**: spans across services use HLC-like ordering.

## Common pitfalls

- **LWW with wall-clock time**: clock skew can drop later writes. If you must LWW, use HLC or strict clock sync.
- **Vector clocks for many writers**: vector grows unbounded.
- **Believing NTP is accurate enough for ordering**: it isn't, at small intervals (sub-100ms).
- **Forgetting concurrency**: Lamport hides it. If you need to detect conflicts, you need vector clocks.
- **Hybrid clocks without bounded skew**: HLC assumes clocks within some skew bound; far-apart clocks degrade its physical fidelity.

## Interview questions

### Q1 — Easy: Why can't we trust wall-clock time in distributed systems?
Clocks drift, NTP syncs lag, VM clocks can jump, and clocks across regions easily differ by 100ms+. Using wall-clock time for ordering or last-write-wins can silently drop the actually-later write.

### Q2 — Easy: What's the difference between Lamport timestamps and vector clocks?
Lamport: single counter per process — orders events causally but can't tell if two events are concurrent or causally related. Vector clocks: one counter per process — can detect concurrency. Lamport is cheap but coarser; vector clocks are richer but grow with process count.

### Q3 — Medium: How do vector clocks help in eventually consistent systems?
On read, if two replicas return different versions, comparing version vectors tells you whether one supersedes the other or they're truly concurrent (a conflict). Conflicts are surfaced to the application (Dynamo siblings) or merged via app logic / CRDT. Wall-clock LWW can't distinguish these cases reliably.

### Q4 — Medium: What is a Hybrid Logical Clock and why use it?
HLC combines wall-clock time and a logical counter. Each timestamp has (physical, logical) — the physical part roughly tracks real time, the logical part increments on tied physical times to preserve causal order. Result: close-to-wall-clock for humans, monotonic and causally accurate for the system. Used by CockroachDB and MongoDB.

### Q5 — Medium: Why does Cassandra still use wall-clock timestamps despite the LWW risk?
Vector clocks were considered too operationally complex (size grows with number of writers; users would write directly from many clients). The team chose simpler semantics with the explicit guidance: clients should sync clocks tightly, or use idempotent CRDT-style operations (counters, sets) that aren't sensitive to ordering.

### Q6 — Hard: Design conflict resolution for a multi-region eventually-consistent KV store.
Options:
- **Version vectors per key**: detect conflicts; on read, return all concurrent versions; app merges.
- **HLC + CRDT**: writes are commutative (G-counter, OR-set, LWW-Register with HLC). No conflict detection needed.
- **App-level resolver**: provide a hook; default = LWW with HLC.

Best for new design: HLC + CRDTs where data semantics allow; explicit conflict resolution for the rest.

### Q7 — Hard: How does Spanner achieve global strict serializability?
**TrueTime**: hardware (atomic clocks + GPS) bounds clock uncertainty to ~7ms in each DC. The API returns time as `[earliest, latest]`. On commit, Spanner picks a timestamp `t` and *waits* for `t < TrueTime.now().earliest` before returning success — guaranteeing no transaction in the future will be assigned a lower timestamp. Combined with Paxos for replication, this gives external (strict serializable) consistency without 2PC-style blocking.

### Q8 — Hard: A distributed-tracing system orders spans by local timestamps and shows children before parents sometimes. Fix?
- Clock skew across services. Spans from service A may show smaller timestamps than later spans from service B due to clock drift, even though B's call came after A's.
- Fix: include logical or HLC timestamps in span context. Compute order from these, not raw wall-clock.
- Alternatively: parent-child relationships are explicit in trace propagation — order by trace tree, use timestamps only for duration.

## TL;DR cheat sheet

- Wall-clock time is unreliable across distributed nodes.
- **Lamport**: 1 counter per process; ensures causality but hides concurrency.
- **Vector clocks**: 1 counter per process; can detect concurrent vs ordered. Grows with process count.
- **HLC** (Hybrid Logical Clock): (physical, logical) pair. Close to wall-clock + causally correct. Used by CockroachDB, MongoDB.
- **TrueTime** (Spanner): atomic-clock-backed time intervals; enables strict serializability.
- Use version vectors per object for conflict detection in eventually consistent KVs.
- For LWW, prefer HLC over wall-clock.

## Go deeper

- **Lamport's original paper** (1978): ["Time, Clocks, and the Ordering of Events in a Distributed System"](https://lamport.azurewebsites.net/pubs/time-clocks.pdf) — a four-page classic.
- **Hybrid Logical Clocks paper** (Kulkarni et al, 2014): [HLC paper](https://cse.buffalo.edu/tech-reports/2014-04.pdf).
- **DDIA Chapter 5** — replication and conflict resolution.
- **Martin Kleppmann lectures** (YouTube): "Distributed Systems" course at Cambridge.
- **CockroachDB blog**: [Living without atomic clocks](https://www.cockroachlabs.com/blog/living-without-atomic-clocks/) — practical HLC usage.
- **Google Spanner paper**: TrueTime explanation.
- **Riak docs**: [vector clocks and conflict resolution](https://riak.com/posts/technical/vector-clocks-revisited/).
