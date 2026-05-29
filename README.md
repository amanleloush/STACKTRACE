# Brain Detox Arc

> From *writes code* to *designs systems people trust.*

74 interview-ready notes on systems, distributed computing, and production craft — with **11 interactive animations** (consistent hashing, Raft, Kafka, rate limiters, CAP, vector clocks, sharding, and more) and **50+ Mermaid diagrams** built in.

This repo is both:
1. **A set of plain markdown notes** you can read in any editor (`01-foundations/`, `02-databases/`, … `09-production-craft/`).
2. **A static site** rendered with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) — aurora theme, dark + light mode, full-text search, interactive demos.

---

## Quick start (5 minutes)

### Prerequisites

- **Python 3.10+** (`python3 --version`)
- **git**
- A modern browser (Mermaid + the interactive SVG animations rely on standard ES6)

### Clone & run

```bash
# 1. Clone
git clone <your-fork-or-this-repo-url> brain-detox-arc
cd brain-detox-arc

# 2. Create an isolated Python env (PEP 668-safe on macOS)
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate

# 3. Install the docs stack
pip install --upgrade pip
pip install mkdocs-material mkdocs-glightbox pymdown-extensions mkdocs-minify-plugin

# 4. Serve locally (live-reload)
mkdocs serve
```

Open **http://127.0.0.1:8000** in your browser.

> Hot-reload is on: edit any `.md` file, save, and the page refreshes automatically. Edit `docs/stylesheets/extra.css` or `docs/javascripts/animations.js` and the same.

### Build a static site

```bash
mkdocs build
# Output: ./site/  — ship this folder to any static host.
```

### Deploy

| Target | How |
|---|---|
| **GitHub Pages** | `mkdocs gh-deploy` (one command, deploys the `gh-pages` branch) |
| **Cloudflare Pages / Vercel / Netlify** | Build cmd `mkdocs build`, output dir `site` |
| **Local only** | Just `mkdocs serve` and bookmark `http://127.0.0.1:8000` |

---

## What's in here

```
brain-detox-arc/
├── 01-foundations/            # 7 topics — networking, HTTP, DNS, REST/gRPC, math, OS, storage
├── 02-databases/              # 6 topics — Postgres/MySQL internals, transactions, replication, Mongo, Cassandra, ES
├── 03-caching-redis/          # 4 topics — patterns, Redis, stampedes, CDNs
├── 04-messaging-kafka/        # 4 topics — Kafka, delivery semantics, CDC, Pulsar/Rabbit/SQS
├── 05-distributed-systems/    # 7 topics — CAP/PACELC, Raft, distributed tx, rate limiting, breakers, discovery, clocks
├── 06-hld-patterns/           # 6 topics — micro vs mono, sync/async, sharding, multi-region, schema evo, gateway/BFF
├── 07-hld-problems/           # 15 topics — URL shortener, feed, chat, notifications, cache, payments, flash sale, …
├── 08-data-engineering/       # 9 topics — batch/streaming, Spark, Trino, file formats, lakehouse, Airflow, SCD, quality, PII
├── 09-production-craft/       # 16 topics — observability, RED/USE, SLOs, alerting, AuthN/Z, mTLS, secrets, k8s, IaC, CI/CD, …
├── docs/
│   ├── index.md               # site landing page
│   ├── assets/                # logo, wordmark, favicon (all custom SVG)
│   ├── stylesheets/           # extra.css (Aurora theme) + animations.css
│   ├── javascripts/           # animations.js (11 interactive SVG demos)
│   └── <symlinks to phase folders>
├── mkdocs.yml                 # site config, nav, palette, plugins
├── overrides/                 # MkDocs Material theme overrides (currently empty)
└── README.md                  # this file
```

---

## Each topic follows the same shape

So you can scan or deep-dive consistently:

1. **Definition** — the one-line answer
2. **Why it matters** — real-world motivation
3. **Core concepts** — the building blocks
4. **How it works** — the mechanism, step by step
5. **Real-world examples** — where it shows up in the wild
6. **Common pitfalls** — what trips people up
7. **Interview questions** — graded easy / medium / hard with answers
8. **TL;DR cheat sheet** — last-minute revision
9. **Go deeper** — best resources to follow up

**How to use:**
- *First pass:* read top-to-bottom for intuition.
- *Day before interview:* read only the **TL;DR cheat sheet** at the bottom of each topic.

---

## Interactive animations

Eleven topics ship with built-in interactive simulators (not screenshots):

| Animation | Where |
|---|---|
| Consistent hashing ring | `06-hld-patterns/31-sharding-strategies.md`, `07-hld-problems/41-hld-distributed-cache.md` |
| Raft (election + replication) | `05-distributed-systems/23-consensus-raft-paxos.md` |
| Token / leaky bucket | `05-distributed-systems/25-rate-limiting.md`, `07-hld-problems/36-hld-rate-limiter.md` |
| Kafka partitions + consumer rebalance | `04-messaging-kafka/18-kafka-deep.md` |
| LSM vs B+ tree | `02-databases/08-mysql-postgres-internals.md`, `02-databases/12-cassandra-scylla.md` |
| Cache patterns (aside/through/back/around) | `03-caching-redis/14-cache-patterns.md` |
| CAP partition simulator | `05-distributed-systems/22-cap-pacelc-consistency.md` |
| Fixed vs sliding window | `05-distributed-systems/25-rate-limiting.md` |
| Saga vs 2PC | `05-distributed-systems/24-distributed-transactions.md`, `07-hld-problems/43-hld-payment-system.md` |
| Vector clocks | `05-distributed-systems/28-clocks-vector-lamport-hlc.md` |
| Sharding (range/hash/geo) | `06-hld-patterns/31-sharding-strategies.md` |

To add a new animation:
1. Implement a function in `docs/javascripts/animations.js` following the existing pattern (`anim<Name>(host)`).
2. Register it in the `REG` object at the bottom of that file.
3. Embed in any markdown with `<div class="sde-anim" data-anim="<name>"></div>`.

---

## Troubleshooting

**`mkdocs: command not found`**  
Activate the venv first: `source .venv/bin/activate`.

**`error: externally-managed-environment` on `pip install`**  
You're on Python managed by Homebrew. Use the venv (step 2 above) — never use `--break-system-packages`.

**Animations don't render**  
Check the browser console. They depend on inline SVG + JS — no external CDN beyond Mermaid. If you load over `file://` they may not initialize because Material's `document$` observable is missing — always run via `mkdocs serve`.

**Mermaid diagrams show as raw code**  
Confirm `mkdocs.yml` has the `pymdownx.superfences` block with the Mermaid custom fence, and that `https://unpkg.com/mermaid@10/dist/mermaid.min.js` loads (network tab).

**Search bar feels off**  
Hard-refresh once after editing `extra.css` — the service worker caches old CSS.

---

## Editing & contributing

- Notes are plain markdown — edit in any editor, the site reflects changes on save.
- Mermaid diagrams: fenced blocks like ```` ```mermaid ... ``` ```` — see [Mermaid docs](https://mermaid.js.org/) for syntax.
- Custom animations: see `docs/javascripts/animations.js` — pattern is `frame() → mount svg → bind controls`.
- Theme: tweak `docs/stylesheets/extra.css`. The Aurora variables live in `:root` and `[data-md-color-scheme="..."]` blocks.

---

## License & attribution

The notes are written from scratch by the author. All Mermaid diagrams, the SVG logo/wordmark, the Aurora theme CSS, and the 11 interactive animations are original work. Mermaid runtime is MIT-licensed. MkDocs Material is MIT-licensed.

Use the content for your own learning and interview prep. If you fork, attribution is appreciated.
