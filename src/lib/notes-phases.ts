// Single source of truth for the system-design phase metadata.
// Consumed by `/notes/index.astro`, `/notes/[phase].astro`, and
// `index.astro`'s landing journey grid. The `slug` matches
// `entry.data.phase` in the `notes` content collection.

export interface NotesPhase {
  slug: string;
  num: string;
  title: string;
  blurb: string;
}

export const NOTES_PHASES: NotesPhase[] = [
  {
    slug: '01-foundations',
    num: '01',
    title: 'Foundations',
    blurb:
      'Networking, HTTP, DNS, load balancing, REST / gRPC / GraphQL, OS concurrency, storage, and what happens when you type a URL. The vocabulary every system design uses.',
  },
  {
    slug: '02-databases',
    num: '02',
    title: 'Databases',
    blurb:
      'MySQL InnoDB and Postgres deep dives, transactions and isolation, replication & sharding, Mongo, Cassandra / Scylla, Elasticsearch, time-series DBs, choosing a database.',
  },
  {
    slug: '03-caching-redis',
    num: '03',
    title: 'Caching',
    blurb:
      'Cache patterns, Redis end to end (data structures, persistence, scripting, HA and cluster, operations, use cases), stampede / penetration / avalanche, CDNs.',
  },
  {
    slug: '04-messaging-kafka',
    num: '04',
    title: 'Messaging',
    blurb:
      'Async fundamentals, Kafka end to end (internals, producer, consumer, transactions, ecosystem, operations, patterns, scenarios), delivery semantics, CDC, RabbitMQ, SQS / SNS, comparisons.',
  },
  {
    slug: '05-distributed-systems',
    num: '05',
    title: 'Distributed Systems',
    blurb:
      'CAP / PACELC, Raft & Paxos, distributed transactions, rate limiting, circuit breakers, service discovery, time & clocks, distributed ID generation.',
  },
  {
    slug: '06-hld-patterns',
    num: '06',
    title: 'HLD Patterns',
    blurb:
      'Microservices vs monolith, sync / async / event-driven, sharding, multi-region, schema evolution, API gateway / BFF.',
  },
  {
    slug: '07-hld-problems',
    num: '07',
    title: 'HLD Problems',
    blurb:
      'The interview framework, failure drills, and 27 marquee designs — URL shortener, news feed, chat, notifications, payments, flash sale, hotel booking, video, ride-sharing, food delivery, Google Docs, nearby places, leaderboards, search, photo sharing, live comments, a stock exchange, a message queue, a distributed KV store and more.',
  },
  {
    slug: '08-data-engineering',
    num: '08',
    title: 'Data Engineering',
    blurb:
      'Batch vs streaming, Spark, Trino / Presto, real-time OLAP (ClickHouse / Druid / Pinot), file formats, lakehouse, Airflow, dimensional modeling, data quality, PII.',
  },
  {
    slug: '09-production-craft',
    num: '09',
    title: 'Production Craft',
    blurb:
      'Observability, RED / USE, SLOs, alerting, debugging production, AuthN / Z, web auth security, API design, mTLS, secrets, OWASP, cloud, Docker, k8s, Terraform, CI / CD, testing, flags, DDD.',
  },
  {
    slug: '10-modern-additions',
    num: '10',
    title: 'Modern Additions',
    blurb:
      'Real-time push (WS / SSE / long-poll / FCM / APNs), probabilistic data structures (Bloom / HLL / Count-Min), stream processing (Flink, Kafka Streams), GenAI (embeddings, RAG, agents).',
  },
  {
    slug: '11-sql-dbms',
    num: '11',
    title: 'SQL & DBMS Theory',
    blurb:
      'SQL execution order, joins, window functions, CTEs, keys and ER modeling, normalization, concurrency control, recovery, query processing.',
  },
  {
    slug: '12-runtimes-os',
    num: '12',
    title: 'Runtimes & OS',
    blurb:
      'Compilers, JIT and bytecode, memory and garbage collection, Go and Python runtimes, processes, threads, virtual memory, synchronization.',
  },
  {
    slug: '13-java-spring',
    num: '13',
    title: 'Java & Spring Boot',
    blurb:
      'Collections and HashMap internals, core language, JVM memory, concurrency, executors and virtual threads, Spring IoC, JPA, Security.',
  },
  {
    slug: '14-lld',
    num: '14',
    title: 'Low-Level Design',
    blurb:
      'SOLID, design patterns, a machine-coding strategy, a Python-to-Java ramp-up, 17 solved machine-coding problems (parking lot, LRU + rate limiter, Splitwise, elevator, BookMyShow, vending machine + logger, pub-sub, KV cache, meeting rooms, tic-tac-toe, chess, library, ATM, file system, task scheduler, car rental, food ordering) and two timed mocks.',
  },
  {
    slug: '15-interview-readiness',
    num: '15',
    title: 'Interview Readiness',
    blurb:
      'STAR behavioral stories, the 2-minute intro and why-switch answer, project deep-dive pitch, and salary negotiation.',
  },
];
