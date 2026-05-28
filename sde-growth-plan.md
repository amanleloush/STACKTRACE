# Mid to Mythic — Backend / HLD / Data Growth Plan

> 74 topics. 9 phases. Foundations → DBs → Redis → Kafka → distributed systems → HLD patterns → HLD problems → data engineering → production craft.

## How to import to Notion

1. Notion → top-left `Settings & members` → **Settings → Import** → choose **Markdown & CSV**
2. Pick `sde-growth-plan.md`
3. Notion creates a page with the table. Click `•••` on the table → **Turn into database** to get sortable views, status colors, and the Calendar view from the `Day` column.
4. Hyperlinks inside cells stay clickable.

---

## The plan

| # | Topic | Phase | Status | Day | Resources | Notes |
|---|---|---|---|---|---|---|
| 1 | Networking: TCP/UDP, TLS handshake | 1. Foundations | Not started |  | [Hussein Nasser YT](https://www.youtube.com/@hnasr) • Book: Kurose *Top-Down Approach* Ch.3 |  |
| 2 | HTTP/1.1 vs HTTP/2 vs HTTP/3 | 1. Foundations | Not started |  | [Hussein Nasser: HTTP/2 limits → HTTP/3 & QUIC](https://www.youtube.com/watch?v=GriONb4EfPY) • [web.dev](https://web.dev/) |  |
| 3 | DNS + Load balancing (L4 vs L7, consistent hashing) | 1. Foundations | Not started |  | [ByteByteGo YT](https://www.youtube.com/@ByteByteGo) • [System Design Primer](https://github.com/donnemartin/system-design-primer) |  |
| 4 | REST vs gRPC vs GraphQL | 1. Foundations | Not started |  | [ByteByteGo YT](https://www.youtube.com/@ByteByteGo) • [gRPC docs](https://grpc.io/docs/) |  |
| 5 | Back-of-envelope math + latency numbers | 1. Foundations | Not started |  | [Jeff Dean latency numbers gist](https://gist.github.com/jboner/2841832) |  |
| 6 | OS concurrency: threads, mutex, deadlock, race conditions | 1. Foundations | Not started |  | [OSTEP free book](https://pages.cs.wisc.edu/~remzi/OSTEP/) — Ch.26–30 |  |
| 7 | Storage fundamentals: disk vs SSD, page cache, fsync | 1. Foundations | Not started |  | [Hussein Nasser: Database Engineering playlist](https://www.youtube.com/playlist?list=PLQnljOFTspQXjD0HOzN7P2tgzu7scWpl2) • DDIA Ch.3 |  |
| 8 | MySQL/Postgres internals: B+ tree, query planner, EXPLAIN | 2. Databases | Not started |  | [Use The Index Luke](https://use-the-index-luke.com/) • [Postgres docs](https://www.postgresql.org/docs/) • DDIA Ch.3 |  |
| 9 | Transactions + Isolation levels (MVCC, WAL) | 2. Databases | Not started |  | DDIA Ch.7 • [Jepsen consistency models](https://jepsen.io/consistency) |  |
| 10 | Replication + Sharding | 2. Databases | Not started |  | DDIA Ch.5–6 • [ByteByteGo YT](https://www.youtube.com/@ByteByteGo) |  |
| 11 | MongoDB: document model, aggregation, replica sets | 2. Databases | Not started |  | [MongoDB University M001 (free)](https://learn.mongodb.com/) • [docs](https://www.mongodb.com/docs/) |  |
| 12 | Cassandra / Scylla: wide-column, partition keys, gossip | 2. Databases | Not started |  | [DataStax learning](https://www.datastax.com/learn) • DDIA Ch.5 |  |
| 13 | Elasticsearch: inverted index, BM25, shards | 2. Databases | Not started |  | [Elastic docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html) |  |
| 14 | Cache patterns: aside / through / back / around | 3. Caching (Redis) | Not started |  | [ByteByteGo: Guide to Top Caching Strategies](https://blog.bytebytego.com/p/a-guide-to-top-caching-strategies) • [AWS caching](https://aws.amazon.com/caching/) |  |
| 15 | Redis: data structures, persistence, eviction, cluster | 3. Caching (Redis) | Not started |  | [ByteByteGo: What Is Redis?](https://www.youtube.com/watch?v=z_NbVtbgBJw) • [Redis docs](https://redis.io/docs/) • [ByteByteGo: Redis 101 guide](https://bytebytego.com/guides/the-ultimate-redis-101/) |  |
| 16 | Cache stampede, thundering herd, TTL strategies | 3. Caching (Redis) | Not started |  | [Mike Perham blog](https://www.mikeperham.com/) • search "instagram thundering herd engineering" |  |
| 17 | CDN basics | 3. Caching (Redis) | Not started |  | [Cloudflare: What is a CDN](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) |  |
| 18 | Kafka: topics, partitions, consumer groups, ISR | 4. Messaging (Kafka) | Not started |  | [ByteByteGo: Kafka deep dive](https://www.youtube.com/watch?v=UNUz1-msbOM) • [Hussein Nasser channel](https://www.youtube.com/@hnasr) • [ByteByteGo: Kafka 101](https://blog.bytebytego.com/p/ep126-the-ultimate-kafka-101-you) |  |
| 19 | Delivery semantics: at-least / at-most / exactly-once, idempotency, DLQ | 4. Messaging (Kafka) | Not started |  | [Confluent: Exactly-Once Semantics](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/) |  |
| 20 | Change Data Capture (Debezium / Maxwell) | 4. Messaging (Kafka) | Not started |  | [Debezium docs](https://debezium.io/documentation/) • [Kleppmann: Turning the DB Inside Out (Strange Loop)](https://www.youtube.com/watch?v=fU9hR3kiOK0) |  |
| 21 | Pulsar / RabbitMQ / SQS comparison | 4. Messaging (Kafka) | Not started |  | [ByteByteGo: RabbitMQ vs Kafka vs Pulsar](https://blog.bytebytego.com/p/ep203-rabbitmq-vs-kafka-vs-pulsar) |  |
| 22 | CAP + PACELC + consistency models | 5. Distributed Systems | Not started |  | DDIA Ch.9 • [Jepsen consistency](https://jepsen.io/consistency) |  |
| 23 | Consensus: Raft (deep), Paxos (overview) | 5. Distributed Systems | Not started |  | [Ousterhout: Designing for Understandability](https://www.youtube.com/watch?v=vYp4LYbnnW8) • [Animated Raft](https://thesecretlivesofdata.com/raft/) • [raft.github.io](https://raft.github.io/) |  |
| 24 | Distributed transactions: 2PC, sagas, outbox | 5. Distributed Systems | Not started |  | [microservices.io: Saga pattern](https://microservices.io/patterns/data/saga.html) • DDIA Ch.7 |  |
| 25 | Rate limiting: token/leaky bucket, sliding window | 5. Distributed Systems | Not started |  | [Stripe: Scaling rate limiters](https://stripe.com/blog/rate-limiters) • [ByteByteGo: Rate Limiting Fundamentals](https://blog.bytebytego.com/p/rate-limiting-fundamentals) |  |
| 26 | Circuit breakers, bulkheads, retries with backoff | 5. Distributed Systems | Not started |  | [Fowler: Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html) • [AWS Builders Library](https://aws.amazon.com/builders-library/) |  |
| 27 | Service discovery + health checks | 5. Distributed Systems | Not started |  | [Consul docs](https://developer.hashicorp.com/consul) • Sam Newman *Building Microservices* Ch.5 |  |
| 28 | Vector clocks, Lamport timestamps, HLC | 5. Distributed Systems | Not started |  | DDIA Ch.5 • [Martin Kleppmann blog](https://martin.kleppmann.com/) |  |
| 29 | Microservices vs monolith vs modular monolith | 6. HLD Patterns | Not started |  | [Fowler: microservices guide](https://martinfowler.com/microservices/) |  |
| 30 | Sync vs async communication, event-driven arch | 6. HLD Patterns | Not started |  | [Confluent: Event-driven architecture](https://www.confluent.io/learn/event-driven-architecture/) • Sam Newman Ch.4 |  |
| 31 | Sharding strategies (range / hash / geo / directory) | 6. HLD Patterns | Not started |  | DDIA Ch.6 • [System Design Primer](https://github.com/donnemartin/system-design-primer) |  |
| 32 | Multi-region, multi-AZ, RPO/RTO | 6. HLD Patterns | Not started |  | [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/) • [SRE Book](https://sre.google/sre-book/) |  |
| 33 | Schema evolution + backward compatibility | 6. HLD Patterns | Not started |  | DDIA Ch.4 • [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html) |  |
| 34 | API gateways + BFF pattern | 6. HLD Patterns | Not started |  | [Sam Newman: BFF pattern](https://samnewman.io/patterns/architectural/bff/) |  |
| 35 | HLD: URL shortener | 7. HLD Problems | Not started |  | [ByteByteGo: URL Shortener course](https://bytebytego.com/courses/system-design-interview/design-a-url-shortener) • [System Design Primer](https://github.com/donnemartin/system-design-primer) |  |
| 36 | HLD: Distributed rate limiter | 7. HLD Problems | Not started |  | [ByteByteGo: Rate Limiter video](https://www.youtube.com/watch?v=YXkOdWBwqaA) • [Stripe blog](https://stripe.com/blog/rate-limiters) |  |
| 37 | HLD: News feed (Twitter/Facebook) | 7. HLD Problems | Not started |  | [Gaurav Sen: System Design playlist](https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX) • [High Scalability](http://highscalability.com/) |  |
| 38 | HLD: Chat system (WhatsApp/Slack) | 7. HLD Problems | Not started |  | [ByteByteGo channel](https://www.youtube.com/@ByteByteGo) • [High Scalability: WhatsApp arch](http://highscalability.com/) |  |
| 39 | HLD: Notification system | 7. HLD Problems | Not started |  | [ByteByteGo channel](https://www.youtube.com/@ByteByteGo) • Alex Xu Vol.1 Ch.10 |  |
| 40 | HLD: Search autocomplete / typeahead | 7. HLD Problems | Not started |  | [Gaurav Sen: System Design playlist](https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX) • Alex Xu Vol.1 Ch.13 |  |
| 41 | HLD: Distributed cache (Redis cluster) | 7. HLD Problems | Not started |  | [Redis scaling docs](https://redis.io/docs/management/scaling/) • [ByteByteGo](https://www.youtube.com/@ByteByteGo) |  |
| 42 | HLD: Distributed file storage (S3/Dropbox) | 7. HLD Problems | Not started |  | [Google File System paper](https://research.google/pubs/the-google-file-system/) • [ByteByteGo](https://www.youtube.com/@ByteByteGo) |  |
| 43 | HLD: Payment system (idempotent transfer) | 7. HLD Problems | Not started |  | [Stripe Engineering Blog](https://stripe.com/blog) • [Uber Eng](https://www.uber.com/blog/engineering/) |  |
| 44 | HLD: Flash sale + inventory (over-sell problem) | 7. HLD Problems | Not started |  | [High Scalability](http://highscalability.com/) • search "alibaba flash sale architecture" |  |
| 45 | HLD: Video streaming (YouTube/Netflix) | 7. HLD Problems | Not started |  | [Netflix Tech Blog](https://netflixtechblog.com/) • [ByteByteGo](https://www.youtube.com/@ByteByteGo) |  |
| 46 | HLD: Ride-sharing (Uber) | 7. HLD Problems | Not started |  | [Uber Eng Blog](https://www.uber.com/blog/engineering/) • [ByteByteGo](https://www.youtube.com/@ByteByteGo) |  |
| 47 | HLD: Web crawler | 7. HLD Problems | Not started |  | [System Design Primer](https://github.com/donnemartin/system-design-primer) • Alex Xu Vol.1 Ch.9 |  |
| 48 | HLD: Ad-click tracking / real-time analytics | 7. HLD Problems | Not started |  | [ByteByteGo](https://www.youtube.com/@ByteByteGo) • Alex Xu Vol.2 |  |
| 49 | HLD: Distributed job scheduler (Airflow-shaped) | 7. HLD Problems | Not started |  | [Airflow architecture](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html) • [Temporal docs](https://docs.temporal.io/) |  |
| 50 | Batch vs streaming vs lambda vs kappa | 8. Data Engineering | Not started |  | [Tyler Akidau: Streaming 101](https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/) • Book: *Streaming Systems* |  |
| 51 | Spark internals: DAG, shuffle, partitioning, skew | 8. Data Engineering | Not started |  | [Sameer Farooqui: Advanced Spark Training](https://www.youtube.com/watch?v=7ooZ4S7Ay6Y) • [Learning Spark 2nd Ed (free)](https://www.databricks.com/resources/ebook/learning-spark-2nd-edition) |  |
| 52 | Trino / Presto: MPP query engine, connectors, query lifecycle | 8. Data Engineering | Not started |  | [Trino docs](https://trino.io/docs/current/) • [Starburst Academy](https://www.starburst.io/learn/) |  |
| 53 | File formats: Parquet, ORC, Avro | 8. Data Engineering | Not started |  | [Parquet docs](https://parquet.apache.org/docs/) • [Uber Eng blog](https://www.uber.com/blog/engineering/) |  |
| 54 | Lakehouse: Iceberg, Delta Lake, Hudi | 8. Data Engineering | Not started |  | [Iceberg](https://iceberg.apache.org/) • [Delta Lake](https://delta.io/) • [Hudi](https://hudi.apache.org/) |  |
| 55 | Airflow internals: DAG semantics, idempotency, backfills, deferrable operators | 8. Data Engineering | Not started |  | [Airflow core concepts](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/) • [Astronomer Academy](https://academy.astronomer.io/) |  |
| 56 | Slowly changing dimensions, star vs snowflake schema | 8. Data Engineering | Not started |  | [dbt snapshots](https://docs.getdbt.com/docs/build/snapshots) • Kimball *Data Warehouse Toolkit* Ch.5 |  |
| 57 | Data quality + lineage (Great Expectations / DataHub) | 8. Data Engineering | Not started |  | [Great Expectations](https://greatexpectations.io/) • [DataHub](https://datahubproject.io/) |  |
| 58 | PII handling: masking, tokenization, GDPR/DPDP | 8. Data Engineering | Not started |  | [AWS Macie docs](https://aws.amazon.com/macie/) |  |
| 59 | Metrics, logs, traces (Prom + ELK + Jaeger) | 9. Production Craft | Not started |  | [OpenTelemetry docs](https://opentelemetry.io/docs/) • Book: *Observability Engineering* (Honeycomb) |  |
| 60 | RED / USE methods + golden signals | 9. Production Craft | Not started |  | [Brendan Gregg: USE Method](https://www.brendangregg.com/usemethod.html) • [SRE Book Ch.6](https://sre.google/sre-book/monitoring-distributed-systems/) |  |
| 61 | SLI / SLO / SLA, error budgets | 9. Production Craft | Not started |  | [SRE Book Ch.4](https://sre.google/sre-book/service-level-objectives/) • [SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/) |  |
| 62 | Alerting design (symptom vs cause-based) | 9. Production Craft | Not started |  | [SRE Book Ch.6](https://sre.google/sre-book/monitoring-distributed-systems/) |  |
| 63 | AuthN vs AuthZ, OAuth2, OIDC, JWT | 9. Production Craft | Not started |  | [ByteByteGo: OAuth 2.0 explained](https://blog.bytebytego.com/p/ep72-oauth-20-explained-with-simple) • [ByteByteGo: Session/Cookie/JWT/SSO/OAuth](https://blog.bytebytego.com/p/ep34-session-cookie-jwt-token-sso) • [oauth.net](https://oauth.net/2/) |  |
| 64 | mTLS + certificate management | 9. Production Craft | Not started |  | [Cloudflare: mutual TLS](https://www.cloudflare.com/learning/access-management/what-is-mutual-tls/) • [smallstep blog](https://smallstep.com/blog/) |  |
| 65 | Secrets management (Vault, KMS) | 9. Production Craft | Not started |  | [HashiCorp Vault tutorials](https://developer.hashicorp.com/vault/tutorials) • [AWS Secrets Manager docs](https://docs.aws.amazon.com/secretsmanager/) |  |
| 66 | OWASP top 10 + threat modeling (STRIDE) | 9. Production Craft | Not started |  | [OWASP Top 10](https://owasp.org/www-project-top-ten/) |  |
| 67 | AWS/GCP core services overview | 9. Production Craft | Not started |  | [AWS Skill Builder (free)](https://skillbuilder.aws/) • [GCP Skills Boost](https://www.cloudskillsboost.google/) |  |
| 68 | Kubernetes: pods, deployments, services, ingress | 9. Production Craft | Not started |  | [K8s tutorials](https://kubernetes.io/docs/tutorials/) • [KodeKloud](https://kodekloud.com/) |  |
| 69 | Terraform / IaC basics | 9. Production Craft | Not started |  | [HashiCorp Learn: Terraform](https://developer.hashicorp.com/terraform/tutorials) |  |
| 70 | CI/CD pipeline design | 9. Production Craft | Not started |  | [Fowler: Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) • [GitHub Actions docs](https://docs.github.com/en/actions) |  |
| 71 | Testing pyramid + contract tests | 9. Production Craft | Not started |  | [Fowler: Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) • [Pact docs](https://docs.pact.io/) |  |
| 72 | Feature flags, canary deploys, dark launches | 9. Production Craft | Not started |  | [Fowler: Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) • [LaunchDarkly blog](https://launchdarkly.com/blog/) |  |
| 73 | DDD basics: bounded contexts, aggregates | 9. Production Craft | Not started |  | [Fowler: Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html) • Eric Evans *Blue Book* |  |
| 74 | Refactoring patterns + tech debt management | 9. Production Craft | Not started |  | [Refactoring Guru](https://refactoring.guru/refactoring) • Fowler *Refactoring 2nd Ed* |  |

---

## Anchor resources (worth bookmarking once)

- **Book** — [Designing Data-Intensive Applications](https://dataintensive.net/) (Kleppmann) — covers ~25 rows above
- **Free repo** — [System Design Primer](https://github.com/donnemartin/system-design-primer) — covers most HLD rows
- **Free book** — [Google SRE Book](https://sre.google/sre-book/) — covers observability/SLO/alerting rows
- **Free book** — [SRE Workbook](https://sre.google/workbook/) — practical companion to the above
- **YouTube** — [ByteByteGo](https://www.youtube.com/@ByteByteGo) • [Hussein Nasser](https://www.youtube.com/@hnasr) • [Gaurav Sen](https://www.youtube.com/@gkcs) • [Martin Kleppmann](https://www.youtube.com/@kleppmann)
- **Engineering blogs worth following** — [Netflix](https://netflixtechblog.com/) • [Uber](https://www.uber.com/blog/engineering/) • [Stripe](https://stripe.com/blog) • [Confluent](https://www.confluent.io/blog/) • [High Scalability](http://highscalability.com/)
