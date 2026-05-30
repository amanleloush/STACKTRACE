---
title: System Design Interview Framework
---

# System Design Interview Framework

> Drive a 60-minute open-ended discussion without freezing. Functional → non-functional → high-level → deep-dive → trade-offs.

A system design round has no test cases. There's a whiteboard, a vague prompt ("Design Twitter"), and 60 minutes. The candidates who do well aren't the ones who memorized reference architectures — they're the ones who can drive a structured conversation that goes from ambiguous problem to defensible design in five well-paced phases.

This folder gives you that structure. The framework keeps you moving forward when the interviewer says "OK, what about consistency?" or "what if we 10x scale tomorrow?" — the moments where unprepared candidates freeze.

<div class="topic-grid">

  <a class="topic-card" href="01-framework/">
    <span class="topic-card__num">01</span>
    <h3>The 5-phase framework</h3>
    <p>Requirements → Capacity → HLD → Deep-dive → Trade-offs. With minute budgets.</p>
  </a>

  <a class="topic-card" href="02-back-of-envelope/">
    <span class="topic-card__num">02</span>
    <h3>Back-of-envelope math</h3>
    <p>DAU → QPS, storage, bandwidth — four worked examples you can adapt on the spot.</p>
  </a>

  <a class="topic-card" href="03-deep-dive-pivots/">
    <span class="topic-card__num">03</span>
    <h3>Deep-dive pivots</h3>
    <p>"What if 10× scale?", "what about consistency?", "what if a region fails?" — answer scripts.</p>
  </a>

</div>

## How to use this folder

Read all three pages before any system design loop. Then practice the framework on three or four problems out loud — alone, with a peer, or in a mock — until the phases come naturally. Memorize the BoE numbers (1 byte/char, 1KB/tweet, 1M seconds/day-ish) so you don't have to derive them mid-interview. Memorize the deep-dive answer scripts so an interviewer's "what about X?" triggers a structured response, not a freeze.

The companion section for *what* to put in the design — sharding, caching, replication, CDC, real architectures — is at [06 · HLD Patterns](../../06-hld-patterns/index.md) and [07 · HLD Problems](../../07-hld-problems/index.md). This folder is about *how* to drive the conversation; those are about the contents.

## What good looks like

A senior candidate in a system design round spends the first 8 minutes asking questions, drawing a usage diagram, and writing functional and non-functional requirements on the corner of the whiteboard. They do back-of-envelope math out loud and arrive at "so we need roughly 100k QPS at peak, with about 50TB of storage growing 30TB/year." Then they sketch a high-level diagram with 5-8 boxes. The interviewer picks one — "tell me more about your write path" — and they go deep with concrete data models, partition keys, replication, and failure modes. By minute 50 they've discussed three trade-offs they'd make differently if requirements changed. That's the conversation you're rehearsing.
