# 67 — AWS / GCP Core Services Overview

> Phase 9 • Production Craft • Topic 67/74

## Definition (interview-ready)

A working mental map of the most-used cloud services from AWS and GCP, grouped by category: compute, storage, networking, databases, messaging, IAM, observability, ML. You don't need every service — knowing the canonical 25-30 is enough for design and operations.

## Why it matters

Cloud is the default deployment target. Knowing what services exist (and their tradeoffs) lets you design correctly without inventing what already exists. Interviews often ask "what AWS service would you use for X?" — you need the map.

## Core mapping (AWS ↔ GCP)

### Compute

| | AWS | GCP |
|---|---|---|
| Virtual machines | EC2 | Compute Engine |
| Container orchestration | EKS (k8s), ECS (proprietary), Fargate (serverless) | GKE, Cloud Run |
| Serverless functions | Lambda | Cloud Functions |
| Container registry | ECR | Artifact Registry |
| Batch jobs | Batch | Batch / Dataflow |

### Storage

| | AWS | GCP |
|---|---|---|
| Object storage | S3 | Cloud Storage (GCS) |
| Block storage | EBS | Persistent Disk |
| File storage | EFS | Filestore |
| Archive | S3 Glacier | Coldline / Archive |

### Networking

| | AWS | GCP |
|---|---|---|
| VPC | VPC | VPC |
| Load balancer | ALB (L7), NLB (L4), CloudFront (CDN) | Cloud Load Balancing (unified global), Cloud CDN |
| DNS | Route 53 | Cloud DNS |
| Private link | PrivateLink | Private Service Connect |

### Databases

| | AWS | GCP |
|---|---|---|
| Managed SQL | RDS (Postgres/MySQL), Aurora | Cloud SQL, AlloyDB (Postgres) |
| Global SQL | Aurora Global, DynamoDB Global Tables | Spanner |
| KV / wide-column | DynamoDB | Bigtable, Firestore |
| Cache | ElastiCache (Redis/Memcached), MemoryDB | Memorystore |
| Data warehouse | Redshift | BigQuery |
| Search | OpenSearch (managed ES) | (third-party) |

### Messaging / streaming

| | AWS | GCP |
|---|---|---|
| Queue | SQS | Pub/Sub (queue mode) |
| Pub/sub | SNS | Pub/Sub |
| Streaming | Kinesis, MSK (Kafka) | Pub/Sub, Confluent |
| Workflow | Step Functions | Workflows |
| ETL streaming | Kinesis Data Firehose | Dataflow |

### IAM / security

| | AWS | GCP |
|---|---|---|
| Identity | IAM | IAM |
| Secrets | Secrets Manager, Systems Manager Parameter Store | Secret Manager |
| KMS | KMS | Cloud KMS |
| Single sign-on | IAM Identity Center | Cloud Identity |
| WAF | WAF | Cloud Armor |

### Observability

| | AWS | GCP |
|---|---|---|
| Metrics / logs / traces | CloudWatch | Cloud Logging / Monitoring / Trace |
| Distributed trace | X-Ray | Cloud Trace |

### Data + ML

| | AWS | GCP |
|---|---|---|
| Data pipeline | Glue, EMR (Spark) | Dataflow, Dataproc |
| Notebook | SageMaker | Vertex AI Workbench |
| ML serving | SageMaker Endpoints | Vertex AI Endpoints |
| AutoML | SageMaker Autopilot | Vertex AI AutoML |

### Misc

- **API Gateway**: AWS API Gateway / GCP API Gateway.
- **CDN**: CloudFront / Cloud CDN.
- **CI/CD**: CodeBuild, CodeDeploy, CodePipeline / Cloud Build.
- **Event Bus**: EventBridge / Eventarc.
- **AI services**: Bedrock (LLM), Comprehend, Rekognition / Vertex AI, Document AI.

## Key services in depth

### S3 / GCS
- Object storage, 11 nines durability, infinite scale.
- Pricing: storage + requests + egress. Egress is the silent budget killer.
- Versioning, lifecycle (move to cold), encryption (SSE-S3, SSE-KMS).
- Static site hosting + CloudFront/CDN.

### DynamoDB / Bigtable
- Massive scale, NoSQL.
- DynamoDB: KV + simple secondary indexes. Pay per RCU/WCU or on-demand.
- Bigtable: wide-column (Cassandra-like). HBase-compatible. Pay per node hour.

### Lambda / Cloud Functions
- Event-driven, run on demand.
- Cold start latency (mitigated with provisioned concurrency).
- Per-invocation pricing.
- Best for: glue code, low-traffic endpoints, async event processing.

### Aurora / Spanner
- Aurora: AWS's distributed Postgres/MySQL with replicated storage (6 copies across 3 AZs). Up to 64TB.
- Spanner: Google's globally distributed strongly consistent SQL DB. TrueTime-based. Strict serializable.

### Kafka equivalents
- **MSK (AWS)**: managed Kafka.
- **GCP Pub/Sub**: not Kafka — different model (push, ack windows), but similar use cases.
- **Confluent Cloud**: third-party managed Kafka on AWS/GCP/Azure.

### CDN
- **CloudFront**: 400+ PoPs globally. Tight S3/Lambda integration.
- **Cloud CDN**: global anycast, fewer PoPs but Google's network.
- **Cloudflare** (third-party): largest PoP footprint.

## Cost optimization (cloud lessons)

- **Egress**: 1 GB out = ~$0.09 (AWS). At scale this dominates. Cache, CDN, multi-region planning.
- **Reserved/Committed use**: 30-70% discount for 1-3 year commitments.
- **Spot/Preemptible**: 70-90% off, eviction risk.
- **Right-sizing**: most workloads over-provisioned.
- **S3 lifecycle**: move cold data to Glacier (10x cheaper).
- **DynamoDB on-demand vs provisioned**: traffic spikes vs steady.

## How it works (a typical 3-tier on AWS)

```
Users
  ↓
Route 53 (DNS)
  ↓
CloudFront (CDN)
  ↓
ALB
  ↓
EC2/ECS (in 2+ AZs)
  ↓
RDS Multi-AZ (primary + standby) + ElastiCache (Redis)
  ↓
S3 (assets) + CloudWatch (observability)
  ↓
Lambda (async jobs) + SQS (queues)

Security: IAM roles, KMS, Secrets Manager.
```

## Real-world examples

- **Netflix on AWS**: famously cloud-native; very heavy EC2/S3.
- **Spotify on GCP**: BigQuery, Pub/Sub, Spanner.
- **Shopify on GCP**: scaled out of GCP commitments.
- **Snowflake**: cross-cloud (AWS/GCP/Azure) data warehouse.

## Common pitfalls

- **Over-engineering with too many services**: pick fewer well-understood ones.
- **Vendor lock-in**: hard to migrate. Use open standards where possible (k8s, Postgres, Kafka).
- **Egress costs**: huge for multi-region or data movement.
- **No cost monitoring**: surprise bills.
- **IAM misconfigurations**: public S3 buckets, over-permissive roles. Use least privilege.
- **Single region**: outage = down. Plan multi-region for serious workloads.
- **Forgetting backup**: managed doesn't mean backed up; configure point-in-time recovery.

## Interview questions

### Q1: AWS service for a static website?
S3 static website hosting + CloudFront for global CDN + Route 53 for DNS + ACM for cert. Cheap, scales infinitely.

### Q2: AWS service for an async background job?
Lambda triggered by SQS (or EventBridge for cron). Reserved concurrency for predictable load. Long-running: ECS Fargate task. Workflow orchestration: Step Functions.

### Q3: Difference between SQS and SNS?
SQS: queue (one consumer per message). SNS: pub/sub (one publish, many subscribers). Common pattern: SNS topic with multiple SQS queues subscribed = fanout with per-consumer queues.

### Q4: When to use DynamoDB vs Aurora?
DynamoDB: massive scale, simple access patterns, KV/document. Single-digit ms reads. Aurora: relational data, complex queries, transactions. Choose based on access patterns and data model.

### Q5: Design a multi-region failover on AWS.
- Aurora Global / RDS cross-region read replica.
- Route 53 health check + failover routing.
- DynamoDB Global Tables (active-active).
- S3 cross-region replication for assets.
- Lambdas + ECS deployed in both regions.
- Cross-region tests with Chaos Monkey.

### Q6: How to cut a $50K/month AWS bill?
- **Right-size**: 60% of EC2 typically over-provisioned.
- **Reserved instances / Savings Plans**: 30-50% off on steady workloads.
- **Spot**: 70-90% off for non-critical.
- **Lifecycle policies**: cold storage to Glacier.
- **Egress audit**: CDN cache hit ratio, avoid cross-region transfer.
- **Unused resources**: orphaned EBS, idle ELBs, unattached EIPs.
- **Cost Explorer + Trusted Advisor** to find inefficiencies.

### Q7: GCP equivalent of an AWS three-tier stack?
- Cloud DNS → Cloud LB (global) → GKE / Cloud Run → Cloud SQL → Memorystore (Redis) → GCS.
- Observability: Cloud Logging + Monitoring + Trace.
- Identity: Workload Identity for k8s; Secret Manager for secrets.

### Q8: When to choose Bigtable over DynamoDB?
- Bigtable: huge throughput, large datasets (PB+), heavy time-series or analytics workloads. Excellent integration with BigQuery and Dataflow. Linear scaling per node.
- DynamoDB: predictable single-digit ms latency, on-demand scaling, AWS ecosystem (Lambda triggers, etc.).
- Choose by data model and ecosystem fit.

## TL;DR cheat sheet

- **Compute**: EC2 / Compute Engine; ECS / Cloud Run; Lambda / Functions.
- **Storage**: S3 / GCS; EBS / PD; EFS / Filestore.
- **DB**: RDS / Cloud SQL; DynamoDB / Bigtable; Aurora / Spanner; Redshift / BigQuery.
- **Messaging**: SQS / Pub/Sub; SNS / Pub/Sub; MSK / Confluent.
- **CDN**: CloudFront / Cloud CDN.
- **Networking**: VPC + ALB/NLB.
- **Security**: IAM, KMS, Secrets Manager.
- **Observability**: CloudWatch / Cloud Logging+Monitoring+Trace.
- Watch egress costs. Multi-AZ baseline. IAM least-privilege.

## Go deeper

- **AWS Skill Builder**: [skillbuilder.aws](https://skillbuilder.aws/) — free.
- **GCP Skills Boost**: [cloudskillsboost.google](https://www.cloudskillsboost.google/).
- **AWS Well-Architected Framework**: [aws.amazon.com/architecture/well-architected](https://aws.amazon.com/architecture/well-architected/).
- **GCP Architecture Center**: [cloud.google.com/architecture](https://cloud.google.com/architecture).
- **AWS Builders Library**: free best-practice articles.
- **A Cloud Guru / Linux Academy / Udemy** for certification prep.
