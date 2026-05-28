# 33 — Schema Evolution + Backward Compatibility

> Phase 6 • HLD Patterns • Topic 33/74

## Definition (interview-ready)

**Schema evolution** is the discipline of changing data formats (DB schemas, event/message schemas, API contracts) over time without breaking existing producers and consumers. **Backward compatibility** = newer consumers can read older data. **Forward compatibility** = older consumers can read newer data. **Full compatibility** = both.

## Why it matters

In a system with N services, M deploys per day, and a Kafka topic carrying 6 months of history, every schema change is a potential outage if you don't manage compatibility. Schema evolution discipline is what separates teams that can deploy 100 times a day from those that can deploy weekly.

## Core concepts

### Why schema changes are hard in distributed systems

- Producers and consumers deploy at different times.
- Stored data (DB, topics, S3) outlives any single deploy.
- Rolling deploys mean both old and new versions run simultaneously.
- A schema-incompatible change breaks the older or the newer side.

### Compatibility types

| Mode | Producer | Consumer | Reads old data | Reads new data |
|---|---|---|---|---|
| Backward | new | old | ✓ | ✘ |
| Forward | old | new | ✘ | ✓ |
| Full | new ↔ old | ✓ | ✓ |

Most systems require **backward** compatibility (new consumers must read old data). Forward compatibility is desirable when older consumers may receive newer data (e.g., rolling deploy where producers ship before consumers).

### Avro, Protobuf, JSON Schema

#### Protobuf (Protocol Buffers)

- Each field has a **field number** (the wire identity).
- Rules: never reuse a field number; never change field's type; new fields must be **optional**; deletions: mark `reserved`.
- Result: additive evolution is easy. Breaking change = bump version (new message type).

```protobuf
message User {
  reserved 4;  // do not reuse
  int64 id = 1;
  string name = 2;
  string email = 3;
  // 4 was 'phone', removed
  string country = 5;  // added
}
```

#### Avro

- Schema travels with data (or referenced via schema ID).
- **Schema Resolution**: at read time, reader uses its schema and the writer's schema to map fields. Default values in the reader schema let it handle missing fields from older writers.
- Strong support for evolution if you follow rules: default values for added fields, no type changes for existing fields, no required fields removed.

#### JSON Schema

- Less rigorous than Avro/Protobuf; depends on convention.
- Tools (Ajv) validate against versioned schemas.
- For events: add optional fields freely, never repurpose names, document.

### Schema registry

A centralized service (Confluent Schema Registry, Apicurio, AWS Glue Schema Registry) that:
- Stores schemas per topic/subject.
- Validates compatibility on register (rejects breaking changes by default).
- Provides schema IDs for serialization — the message wire format is `<schema_id><payload>`.

Compatibility modes (Confluent SR):
- BACKWARD (default): new schema can be used to read data written with prev schema.
- FORWARD: old schema can read data written with new schema.
- FULL: both.
- NONE: no compatibility enforcement (don't).

### Database schema migrations

Different from event schema, similar principles:

#### Online schema change

For zero-downtime:
1. **Add new column** (nullable / with default).
2. **Backfill** in batches (don't lock-update millions of rows at once).
3. **Dual-write** if writers exist that don't know the new column.
4. **Switch reads** to use the new column.
5. **Remove the old column** in a later release.

For renames, type changes, anything destructive — always do the **expand-migrate-contract** dance.

#### Expand-migrate-contract

1. **Expand**: add new schema element (column, field, table).
2. **Migrate**: deploy code that writes to both; backfill historical data.
3. **Contract**: remove the old element when all code uses the new.

Each phase is a deploy. Never combine.

#### Tools

- **gh-ost** (GitHub), **pt-online-schema-change** (Percona): online MySQL schema changes.
- **pg_repack** (Postgres): rebuild tables online.
- **Liquibase / Flyway**: migration tooling.
- **Atlas**: declarative schema management.

### API versioning

- **URL versioning**: `/v1/orders`, `/v2/orders`. Explicit, easy to debug.
- **Header versioning**: `Accept: application/vnd.example.v2+json`. Clean URLs.
- **Query parameter**: `/orders?version=2`. Less common.

For gRPC: new service or new package (`mypackage.v2`).

For GraphQL: schema is additive — deprecate fields, never remove. Clients pick the fields they want.

### Strategies for breaking changes

When you genuinely have to break:
- **Dual-publish**: producer writes both old and new schema during transition.
- **Adapter / translation layer**: at the edge, translate between versions.
- **Versioned consumer groups**: old consumers on a deprecated topic, new on the new topic.
- **Sunset timeline**: announce, deprecate, monitor usage, remove.

### Data formats and evolution

| Format | Schema | Evolution support |
|---|---|---|
| JSON | implicit | flexible but no enforcement |
| JSON Schema | explicit | manual evolution |
| Avro | embedded or referenced | strong (default values, aliases) |
| Protobuf | external `.proto` | strong (field numbers) |
| Parquet | embedded | column-add OK; renames hard |
| ORC | embedded | similar |

For analytics: Avro / Parquet with **schema-on-read** is common — old files keep their schema, new files have new schema, query engines (Trino, Spark) handle the merge.

## How it works (adding a field with Protobuf + schema registry)

```
1. Update .proto: add `optional string referrer = 6;` — new field number.
2. Submit to schema registry: SR validates "BACKWARD compatible" (new optional field
   is backward compatible). Approved.
3. Deploy producer: emits events with optional new field. Old consumers ignore the
   unknown field number.
4. Deploy consumer: reads new field (with default if absent).
5. Historical data: pre-update events don't have the field; consumer sees default.
```

## Real-world examples

- **Confluent Schema Registry**: Industry standard for Kafka.
- **LinkedIn's Pegasus**: their own schema evolution system.
- **Stripe API**: rare breaking changes; versioning via date headers (`Stripe-Version: 2024-04-10`).
- **GitHub API**: versions via `Accept: application/vnd.github.v3+json`.
- **Google APIs**: gRPC + Protobuf evolution discipline.
- **Shopify Storefront API**: GraphQL — never removes, only deprecates.

## Common pitfalls

- **Reusing a removed field number** in Protobuf → silent corruption.
- **Changing a field's type** (string → int) → silent corruption.
- **Adding a required field** to an Avro schema without default → breaks old data.
- **Combining expand + contract** in one deploy → break-glass.
- **Dropping a database column with `ALTER TABLE DROP`** while old code still writes to it → 500 errors.
- **Migrating data in a giant single `UPDATE`** → long locks, blocking, replica lag.
- **Schema "drift" without registry** → producers and consumers disagree silently.
- **GraphQL: removing a field while clients depend on it** → broken clients. Deprecate, monitor, remove later.
- **JSON evolution by convention** → eventually a field rename slips through.

## Interview questions

### Q1 — Easy: What's the difference between backward and forward compatibility?
Backward = newer consumer can read older data (new fields have defaults, no removed required fields). Forward = older consumer can read newer data (ignores unknown fields). Full = both. Default goal in most systems: backward compatibility.

### Q2 — Easy: Why can you never reuse a field number in Protobuf?
The field number is the wire identifier. Old binaries reading new data with the recycled number will decode bytes as the old field's type — silent data corruption. Always `reserved` removed field numbers in the `.proto`.

### Q3 — Medium: How would you safely add a NOT NULL column to a 50M-row table?
- **Expand**: `ALTER TABLE t ADD COLUMN c TYPE DEFAULT default_value`. Postgres 11+ does this without rewriting the table for fixed-size defaults.
- **Backfill** in chunks: `UPDATE t SET c = computed WHERE id BETWEEN X AND Y;` — small batches, commit between.
- **Migrate**: deploy code that writes the column.
- **Contract** (optional): enforce NOT NULL constraint once backfill done. Drop the default if it shouldn't be permanent.
- Use online schema-change tools for MySQL if blocking is a concern.

### Q4 — Medium: A team adds a required field to a Kafka event schema. What breaks?
Old data without the field → newer consumers using strict validation reject it (or crash). Older producers don't emit it → newer consumers receive incomplete data. Schema registry should reject the change at register time if BACKWARD compatibility is set. Fix: make the field optional, or define a default.

### Q5 — Medium: Walk through expand-migrate-contract.
- **Expand**: add the new schema element (column, field). Old code doesn't use it.
- **Migrate**: deploy new code that reads + writes the new element. Backfill historical data. Run side-by-side.
- **Contract**: remove the old element after all code is migrated and old data is no longer needed.

Each phase is a separate deploy. Avoids breaking any version of any service.

### Q6 — Hard: Design schema evolution for a multi-team Kafka topic.
- **Producer + consumer use a schema registry** (Confluent SR or equivalent).
- **Topic config**: BACKWARD compatibility mode (most common).
- **Contract for changes**:
  - Adding optional fields: free.
  - Removing fields: deprecate, monitor consumer usage, remove only when zero usage.
  - Renaming: deprecate old, add new, dual-publish during transition.
  - Breaking: new topic / version-suffix `.v2`.
- **Migrations**: documented in a registry of "topic evolution" PRs.
- **Monitoring**: alert when a consumer hits unknown-schema-id errors.

### Q7 — Hard: You discover the production schema diverged from `schemas/` repo. How?
- **No CI gate**: schema PRs don't validate against the running schema registry.
- **Direct prod changes**: someone bypassed the workflow via SR API.
- **Multi-tool sprawl**: some services use different SRs or no SR.
- **Branch-time-of-check vs deploy**: dev did `kafka-avro-console-producer` with an updated local schema, ad-hoc registered it.

Fix: schema-only PRs, CI verifies against SR, lock down direct SR access, single source of truth (`schemas/` repo with codeowners).

### Q8 — Hard: Compare schema evolution in Avro, Protobuf, and JSON.
- **Avro**: schema-on-read; default values + aliases support evolution well; strong typing; tools require registry to discover writer schema.
- **Protobuf**: field-number-based wire format; strong evolution rules; widely tooled (gRPC); good for service contracts.
- **JSON**: implicit schema; flexible at runtime but error-prone; needs explicit JSON Schema + tooling to enforce.

Choose: Protobuf for service contracts (gRPC), Avro for streaming and analytics (Kafka + Schema Registry, Hadoop), JSON for browser APIs and human debugging.

## TL;DR cheat sheet

- **Backward** = new code reads old data. **Forward** = old code reads new data. **Full** = both.
- Adding optional/defaulted fields = safe.
- Removing fields = deprecate first; only contract when usage = 0.
- Never reuse Protobuf field numbers; mark them `reserved`.
- Type changes = breaking; never silent.
- Database migrations: **expand → migrate → contract** across deploys.
- Use a **schema registry** for streaming/Kafka. Enforce compatibility in CI.
- API versions: URL or header; GraphQL is additive (deprecate, don't remove).
- Online schema change tools (gh-ost, pt-osc) for big tables.

## Go deeper

- **DDIA Chapter 4** — encoding and evolution. The canonical chapter.
- **Confluent**: [Schema Registry docs](https://docs.confluent.io/platform/current/schema-registry/index.html).
- **Google Protocol Buffers**: [proto best practices](https://protobuf.dev/programming-guides/proto/).
- **Apache Avro docs**: [Schema Resolution](https://avro.apache.org/docs/1.11.1/specification/_print/).
- **GitHub Engineering**: [gh-ost: online MySQL schema migrations](https://github.blog/2016-08-01-gh-ost-github-s-online-migration-tool-for-mysql/).
- **Stripe API versioning**: [stripe.com/blog/api-versioning](https://stripe.com/blog/api-versioning).
- **Martin Fowler**: [PublishedInterface](https://martinfowler.com/bliki/PublishedInterface.html).
