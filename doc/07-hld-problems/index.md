---
title: HLD Problems
---

# Phase 07 · HLD Problems

> Fifteen end-to-end designs. Each one is a full vertical slice — APIs, data model, capacity numbers, sharding, caching, queueing, edge cases. Pick the three closest to the job you're interviewing for and drill them.

<div class="topic-grid topic-grid--dense">

  <a class="topic-card" href="35-hld-url-shortener/">
    <span class="topic-card__num">35</span>
    <h3>URL shortener</h3>
    <p>The classic starter problem. Base62, caching, write-through.</p>
  </a>

  <a class="topic-card topic-card--featured" href="36-hld-rate-limiter/">
    <span class="topic-card__num">36</span>
    <span class="topic-card__pill">interactive</span>
    <h3>Distributed rate limiter</h3>
    <p>Global vs per-IP, Redis token bucket, leaky bucket, sliding window.</p>
  </a>

  <a class="topic-card" href="37-hld-news-feed/">
    <span class="topic-card__num">37</span>
    <h3>News feed</h3>
    <p>Fan-out on write vs on read, hot user problem, ranking pipeline.</p>
  </a>

  <a class="topic-card" href="38-hld-chat-system/">
    <span class="topic-card__num">38</span>
    <h3>Chat system</h3>
    <p>WebSocket fan-out, message ordering, read receipts, presence.</p>
  </a>

  <a class="topic-card" href="39-hld-notification-system/">
    <span class="topic-card__num">39</span>
    <h3>Notification system</h3>
    <p>Multi-channel, dedup, batching, the priority/retry queue.</p>
  </a>

  <a class="topic-card" href="40-hld-autocomplete/">
    <span class="topic-card__num">40</span>
    <h3>Autocomplete / typeahead</h3>
    <p>Trie, ranking, debounce, log-derived freshness.</p>
  </a>

  <a class="topic-card topic-card--featured" href="41-hld-distributed-cache/">
    <span class="topic-card__num">41</span>
    <span class="topic-card__pill">interactive</span>
    <h3>Distributed cache</h3>
    <p>Memcached-style. Consistent hashing, replication, eviction.</p>
  </a>

  <a class="topic-card" href="42-hld-distributed-file-storage/">
    <span class="topic-card__num">42</span>
    <h3>Distributed file storage</h3>
    <p>Dropbox/Drive-shape. Chunking, dedup, sync.</p>
  </a>

  <a class="topic-card" href="43-hld-payment-system/">
    <span class="topic-card__num">43</span>
    <h3>Payment system</h3>
    <p>Idempotency, double-entry ledger, reconciliation, Saga vs 2PC.</p>
  </a>

  <a class="topic-card" href="44-hld-flash-sale-inventory/">
    <span class="topic-card__num">44</span>
    <h3>Flash sale &amp; inventory</h3>
    <p>10x burst, hot key, Redis Lua, oversell prevention.</p>
  </a>

  <a class="topic-card" href="45-hld-video-streaming/">
    <span class="topic-card__num">45</span>
    <h3>Video streaming</h3>
    <p>HLS/DASH, ABR, CDN strategy, transcode pipeline.</p>
  </a>

  <a class="topic-card" href="46-hld-ride-sharing/">
    <span class="topic-card__num">46</span>
    <h3>Ride-sharing</h3>
    <p>Geo-indexing, dispatch, surge pricing, driver state machine.</p>
  </a>

  <a class="topic-card" href="47-hld-web-crawler/">
    <span class="topic-card__num">47</span>
    <h3>Web crawler</h3>
    <p>Frontier, politeness, dedup, the politeness budget.</p>
  </a>

  <a class="topic-card" href="48-hld-ad-click-tracking/">
    <span class="topic-card__num">48</span>
    <h3>Ad click tracking</h3>
    <p>Lambda architecture, fraud filtering, real-time + batch agg.</p>
  </a>

  <a class="topic-card" href="49-hld-job-scheduler/">
    <span class="topic-card__num">49</span>
    <h3>Job scheduler</h3>
    <p>Cron at scale. Leader-based scheduling, exactly-once execution.</p>
  </a>

</div>
