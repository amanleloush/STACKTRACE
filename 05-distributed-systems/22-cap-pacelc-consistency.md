# 22 — CAP + PACELC + Consistency Models

> Phase 5 • Distributed Systems • Topic 22/74

## Definition (interview-ready)

**CAP theorem**: in the presence of a network **P**artition, a distributed system must choose between **C**onsistency (every read sees the latest write) and **A**vailability (every request gets a response). **PACELC** extends CAP: *if Partition* (PC vs PA), *else* (LC vs LA — Latency vs Consistency). **Consistency models** are a hierarchy ranging from **linearizable** (real-time order) → **sequential** → **causal** → **eventual**, each trading strictness for performance and availability.

## Why it matters

Almost every database brochure overpromises. CAP/PACELC + the consistency hierarchy give you the vocabulary to evaluate claims and to reason about what your system actually guarantees — which matters when correctness bugs appear under failure or contention.

<div class="sde-anim" data-anim="cap"></div>

## Core concepts

### CAP theorem (Brewer 2000, proven 2002)

In a distributed system, during a network partition you can guarantee at most two of:
- **Consistency**: all reads see the most recent write (linearizability, technically).
- **Availability**: every request completes (non-error response).
- **Partition tolerance**: system keeps working despite some messages being dropped.

**P is not optional** in any real distributed system — networks fail. So in practice CAP says: **during a partition, choose C or A.**

- **CP**: refuse some requests rather than return stale data (Mongo majority, Zookeeper, etcd, HBase).
- **AP**: return possibly-stale data rather than refuse (Cassandra default, DynamoDB, Riak).

### PACELC (Abadi 2010)

CAP only addresses partitions, which are rare. PACELC says:
- **If Partition: choose C or A** (same as CAP).
- **Else (normal operation): choose L (latency) or C (consistency).**

Every system always trades L vs C even when healthy. Examples:
- **PC/EC** (Spanner): strong consistency always, at the cost of latency.
- **PA/EL** (Cassandra default): availability and low latency, eventual consistency.
- **PC/EL** (DynamoDB with eventually consistent reads): refuse on partition but fast reads otherwise.

### Consistency hierarchy

From strongest (most expensive) to weakest:

```
Strict serializability  ⊃ Linearizability  ⊃ Sequential  ⊃ Causal  ⊃ Eventual
       (rare)               (Spanner)         (txn order)    (Pulsar)   (Cassandra default)
```

#### Linearizability

There exists a single global order of operations consistent with real-time order. If op A finishes before op B starts (wall-clock), B sees A's effect. **Strong reads** in Postgres, **Spanner reads**, etcd, Zookeeper.

#### Sequential consistency

All operations appear in some consistent order to all nodes, but **not necessarily real-time order**. Each node's operations appear in its own program order. Weaker than linearizable; rarely used in DBs but common in shared-memory multiprocessors.

#### Causal consistency

Operations causally related (B reads value written by A → A causally precedes B) are observed in causal order by all nodes. Concurrent operations (no causal relation) can be observed in different orders. Sweet spot for social apps — comments-after-posts, replies-after-messages, etc. Implemented via vector clocks or hybrid logical clocks.

#### Eventual consistency

Given no new writes, all replicas eventually converge. No order guarantees in between. Cassandra default, DNS, Amazon S3 (historically).

#### Read-your-writes / monotonic reads (session guarantees)

Weaker than causal but practical:
- **Read-your-writes**: after you write, your reads see at least your write.
- **Monotonic reads**: reads are non-decreasing across time (you never see an older version after seeing a newer one).
- **Monotonic writes**: your writes are applied in the order you submitted them.
- **Writes-follow-reads**: write that follows a read of value v sees v's effect.

These are **session guarantees** — usually implemented via sticky sessions or tracking the user's latest version.

### Strong vs strict serializability vs linearizable

- **Linearizability**: real-time order for *single object* operations.
- **Serializable**: transactions appear as if run serially, but no real-time guarantee.
- **Strict serializability**: serializable + real-time order. The gold standard. What Spanner provides.

### Tradeoff in practice

| System | CAP | PACELC | Why |
|---|---|---|---|
| Spanner | CP | PC/EC | Geo-distributed strong consistency via TrueTime |
| Postgres (single primary) | CP | PC/EC | Primary blocks during partition |
| Postgres replicas | CP+AP mix | PC/EL on replicas | Reads can be stale |
| Cassandra (QUORUM) | CP-ish | PC/EC | Strong via R+W>RF, but availability degraded |
| Cassandra (ONE) | AP | PA/EL | Availability + low latency, eventual |
| DynamoDB (strong read) | CP | PC/EC | Same trade |
| DynamoDB (eventual read) | AP | PA/EL | Fast, possibly stale |
| Redis (no cluster) | CP | PC/EL | Single primary, fast |
| MongoDB (majority) | CP | PC/EC | Quorum writes |
| Kafka | CP | PC/EC | min.insync.replicas writes |

## How it works (a CAP example)

```
3 nodes (A, B, C), one record x=0. Network splits A from {B, C}.

CP system:
  Client writes x=1 to B (majority); B and C update; A doesn't see it.
  Read on A → returns error or blocks (won't return stale 0).
  System sacrifices availability on the A side.

AP system:
  Client writes x=1 to B; B updates locally; replicates async.
  Client on A reads x → returns 0 (stale).
  When partition heals, A converges via repair/anti-entropy.
  System remained available; consistency violated until repair.
```

## Real-world examples

- **Spanner**: CP / PC-EC. Uses atomic clocks + TrueTime API to bound clock skew, achieving global strong consistency.
- **Cassandra**: AP by default; tunable to CP via QUORUM.
- **MongoDB**: write concern majority + read concern majority → strong consistency.
- **DNS**: classic AP. Eventually consistent. Stale records can persist for TTL.
- **S3**: was eventually consistent for years (could read your own write after a delay); became strongly consistent in 2020 — major engineering effort.
- **Discord**: causal consistency model for message ordering in channels.

## Common pitfalls

- **"We're CP, we're consistent"**: doesn't say anything about latency during normal operation. Use PACELC.
- **Mistaking serializable for linearizable**: serializable transactions can return a snapshot from the past. Linearizable requires real-time order.
- **Assuming "strong consistency" means atomic transactions**: linearizability is per-object; cross-object atomicity requires explicit transactions.
- **Reading from a replica and assuming read-your-writes**: replicas lag. Need sticky session or read-from-primary after write.
- **CRDT lazy-merging surprises**: counters and sets behave well; ordering-dependent operations don't merge cleanly.
- **Believing CAP is one-time choice**: it's per-operation (Cassandra: read at ONE = AP, read at ALL = CP).

## Interview questions

### Q1 — Easy: State the CAP theorem.
In a distributed system, when a network partition occurs, you can guarantee at most two of Consistency, Availability, and Partition tolerance. Since partitions happen in real networks, you must choose between C and A during partitions.

### Q2 — Easy: Give an example of an AP database and a CP database.
AP: Cassandra (default), DynamoDB (eventually consistent reads), Riak. CP: Spanner, etcd, Zookeeper, Postgres (majority), MongoDB (write concern majority).

### Q3 — Medium: What does PACELC add to CAP?
PACELC accounts for the everyday tradeoff between latency and consistency *even without partitions*. CAP only addresses partition-time behavior; PACELC also describes "else" (no partition) — latency vs consistency. Useful because partitions are rare; the everyday choice is the bigger deal.

### Q4 — Medium: Explain causal consistency and where it helps.
Causally related operations are seen in causal order by all observers. Independent operations can be seen in any order. Useful for social apps: reply must follow original message, comment must follow post. Cheaper than linearizable, more useful than eventual.

### Q5 — Medium: Difference between linearizable and serializable.
Linearizable = per-object real-time order. Serializable = transactions appear to run in some serial order, but no real-time guarantee. **Strict serializable** = serializable + real-time. Spanner provides strict serializability.

### Q6 — Hard: How does Google Spanner provide global strong consistency despite WAN delays?
Spanner uses **TrueTime**, an API that returns time as an interval `[earliest, latest]` bounded by GPS + atomic clock uncertainty (~7ms typically). Commits wait out the uncertainty interval before returning success → guarantees that any future transaction sees a strictly later timestamp. Combined with Paxos for replication, this yields external (strict serializable) consistency.

### Q7 — Hard: A team claims "we use Cassandra with QUORUM, so we're consistent." Critique.
QUORUM with `R+W>RF` gives you **strong consistency for single-key, single-DC reads**. It does **not** give you:
- Cross-row atomicity (different keys may be inconsistent).
- Read-your-writes across DCs (LOCAL_QUORUM doesn't traverse DCs).
- Linearizability under all conditions — Cassandra's LWT (Paxos) is needed for that.
- Protection from clock skew issues (last-write-wins).

### Q8 — Hard: Design a feed system that needs read-your-writes guarantee with a multi-replica DB.
Options: (a) After write, route the user's subsequent reads to the primary for a TTL. (b) Track a "user version" — client carries it; reads compare and wait or retry. (c) Sticky sessions to one replica that contains the write (after enough lag time). (d) Use a primary-only path for user-personalized data; eventually-consistent for non-personalized. Real systems combine: primary write, then write-through cache, then user-affinitized reads.

## TL;DR cheat sheet

- **CAP**: under partition, pick C or A. P is not optional.
- **PACELC**: during partition (P) → C vs A. Else (E) → L vs C.
- Consistency hierarchy: linearizable > sequential > causal > eventual.
- Per-session: read-your-writes, monotonic reads, monotonic writes, writes-follow-reads.
- Linearizable = per-object real-time order. Serializable = transactions appear serial. Strict serializable = both.
- Spanner uses TrueTime for global strict serializability.
- Cassandra QUORUM gives single-key strong consistency, not cross-row atomicity.
- "Strong consistency" is per-object unless you're explicitly in a transaction.

## Go deeper

- **DDIA Chapter 9** — the best chapter on consistency models in print.
- **Jepsen consistency models**: [jepsen.io/consistency](https://jepsen.io/consistency) — the canonical visual hierarchy.
- **Jepsen analyses**: [jepsen.io/analyses](https://jepsen.io/analyses) — real systems under partition; sobering.
- **Brewer's CAP retrospective**: ["CAP Twelve Years Later"](https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/).
- **Daniel Abadi's PACELC paper**: ["Consistency Tradeoffs in Modern Distributed Database System Design"](http://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf).
- **Google Spanner paper** (2012) — TrueTime is the magic ingredient.
- **Martin Kleppmann YouTube** lectures on consistency models.
