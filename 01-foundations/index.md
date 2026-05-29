---
title: Foundations
---

# Phase 01 · Foundations

> The vocabulary every system design conversation reuses. If you can't talk fluently about TCP, HTTP, DNS, and what a load balancer actually does, the rest of the curriculum is just memorization.

<div class="topic-grid">

  <a class="topic-card" href="01-networking-tcp-udp-tls/">
    <span class="topic-card__num">01</span>
    <h3>Networking — TCP/UDP/TLS</h3>
    <p>Three-way handshake, congestion control, head-of-line blocking, what TLS 1.3 actually does in 1-RTT.</p>
  </a>

  <a class="topic-card" href="02-http-versions/">
    <span class="topic-card__num">02</span>
    <h3>HTTP 1.1 → 2 → 3</h3>
    <p>Why HTTP/2 multiplexes, why HTTP/3 abandons TCP for QUIC, and when it matters in practice.</p>
  </a>

  <a class="topic-card" href="03-dns-load-balancing/">
    <span class="topic-card__num">03</span>
    <h3>DNS &amp; load balancing</h3>
    <p>Resolution path, anycast, L4 vs L7, health checks, the things that go wrong with sticky sessions.</p>
  </a>

  <a class="topic-card" href="04-rest-grpc-graphql/">
    <span class="topic-card__num">04</span>
    <h3>REST / gRPC / GraphQL</h3>
    <p>The three default API shapes — what each is good at, and the one each is bad at.</p>
  </a>

  <a class="topic-card" href="05-back-of-envelope-math/">
    <span class="topic-card__num">05</span>
    <h3>Back-of-envelope math</h3>
    <p>Latency numbers every engineer should know, QPS estimation, when to multiply by peak factor.</p>
  </a>

  <a class="topic-card" href="06-os-concurrency/">
    <span class="topic-card__num">06</span>
    <h3>OS &amp; concurrency</h3>
    <p>Threads vs processes, async I/O, the memory hierarchy, what `context-switch` actually costs.</p>
  </a>

  <a class="topic-card" href="07-storage-fundamentals/">
    <span class="topic-card__num">07</span>
    <h3>Storage fundamentals</h3>
    <p>Block vs file vs object, durability, IOPS vs throughput, the difference between fsync and flush.</p>
  </a>

</div>
