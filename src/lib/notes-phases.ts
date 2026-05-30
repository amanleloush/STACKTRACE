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
      'Networking, HTTP, DNS, load balancing, REST / gRPC / GraphQL, OS concurrency, storage. The vocabulary every system design uses.',
  },
  {
    slug: '02-databases',
    num: '02',
    title: 'Databases',
    blurb:
      'MySQL / Postgres internals, transactions and isolation, replication & sharding, Mongo, Cassandra / Scylla, Elasticsearch.',
  },
  {
    slug: '03-caching-redis',
    num: '03',
    title: 'Caching',
    blurb:
      'Cache patterns, Redis internals, stampede & TTL strategy, CDNs.',
  },
  {
    slug: '04-messaging-kafka',
    num: '04',
    title: 'Messaging',
    blurb:
      'Kafka deep dive, delivery semantics, CDC, comparison with Pulsar / RabbitMQ / SQS.',
  },
  {
    slug: '05-distributed-systems',
    num: '05',
    title: 'Distributed Systems',
    blurb:
      'CAP / PACELC, Raft & Paxos, distributed transactions, rate limiting, circuit breakers, service discovery, time & clocks.',
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
      'Fifteen marquee designs — URL shortener, news feed, chat, notifications, distributed cache, payments, flash sale, video, ride-sharing.',
  },
  {
    slug: '08-data-engineering',
    num: '08',
    title: 'Data Engineering',
    blurb:
      'Batch vs streaming, Spark, Trino / Presto, file formats, lakehouse, Airflow, dimensional modeling, data quality, PII.',
  },
  {
    slug: '09-production-craft',
    num: '09',
    title: 'Production Craft',
    blurb:
      'Observability, RED / USE, SLOs, alerting, AuthN / Z, mTLS, secrets, OWASP, cloud, k8s, Terraform, CI / CD, testing, flags, DDD.',
  },
  {
    slug: '10-modern-additions',
    num: '10',
    title: 'Modern Additions',
    blurb:
      'Real-time push (WS / SSE / long-poll), probabilistic data structures (Bloom / HLL / Count-Min), stream processing (Flink, Kafka Streams).',
  },
];
