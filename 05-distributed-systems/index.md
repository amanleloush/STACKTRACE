---
title: Distributed Systems
---

# Phase 05 · Distributed Systems

> Where intuition goes to die. Partial failure, asynchronous clocks, and the laws of physics conspire against you. The theorems in this phase are the load-bearing ones — CAP, PACELC, FLP, the consensus papers — that everything else builds on.

<div class="topic-grid">

  <a class="topic-card topic-card--featured" href="22-cap-pacelc-consistency/">
    <span class="topic-card__num">22</span>
    <span class="topic-card__pill">interactive</span>
    <h3>CAP / PACELC / consistency</h3>
    <p>The misunderstood theorems. Plus the full hierarchy — linearizable down to eventual — with a partition simulator you can poke.</p>
  </a>

  <a class="topic-card topic-card--featured" href="23-consensus-raft-paxos/">
    <span class="topic-card__num">23</span>
    <span class="topic-card__pill">interactive</span>
    <h3>Consensus — Raft &amp; Paxos</h3>
    <p>Leader election, log replication, the moment a follower turns candidate. Watch a 5-node cluster do it live.</p>
  </a>

  <a class="topic-card" href="24-distributed-transactions/">
    <span class="topic-card__num">24</span>
    <h3>Distributed transactions</h3>
    <p>2PC, 3PC, Saga, TCC. What "atomic across services" actually buys you and what it costs.</p>
  </a>

  <a class="topic-card topic-card--featured" href="25-rate-limiting/">
    <span class="topic-card__num">25</span>
    <span class="topic-card__pill">interactive</span>
    <h3>Rate limiting</h3>
    <p>Token bucket, leaky bucket, fixed/sliding window. Watch the same traffic hit each algorithm.</p>
  </a>

  <a class="topic-card" href="26-circuit-breakers-retries/">
    <span class="topic-card__num">26</span>
    <h3>Circuit breakers &amp; retries</h3>
    <p>Half-open state, exponential backoff with jitter, why retries amplify outages.</p>
  </a>

  <a class="topic-card" href="27-service-discovery/">
    <span class="topic-card__num">27</span>
    <h3>Service discovery</h3>
    <p>DNS-based, client-side, sidecar-based — Consul, Eureka, Envoy/Istio.</p>
  </a>

  <a class="topic-card" href="28-clocks-vector-lamport-hlc/">
    <span class="topic-card__num">28</span>
    <h3>Clocks — vector / Lamport / HLC</h3>
    <p>Why wall-clock fails in distributed systems and what logical clocks give you back.</p>
  </a>

</div>
