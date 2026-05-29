---
title: Production craft — cheatsheet
---

# Production craft · Cheatsheet

> One-page recall for production craft. Print, paste in Notion, glance before the system design interview.

## What this section covers
The "how it actually runs in prod" half of system design: observability (RED/USE), SLO + error budgets, alerting, AuthN/Z (OAuth/OIDC/JWT), mTLS, secrets, OWASP, AWS↔GCP mapping, Kubernetes, Terraform, CI/CD, testing pyramid + contracts, feature flags, DDD, and refactoring patterns.

## Key topics (the 5-minute recall)

### Observability — metrics, logs, traces
- **Three pillars**: metrics (numeric, aggregated, cheap), logs (text, high-cardinality, expensive), traces (request-scoped spans across services).
- **Metric types** (Prometheus): counter (monotonic), gauge (up/down), histogram (buckets for P50/P99), summary (quantiles client-side).
- **RED** (request-driven services): **R**ate, **E**rrors, **D**uration.
- **USE** (resources): **U**tilization, **S**aturation, **E**rrors.
- **Four golden signals** (Google SRE): latency, traffic, errors, saturation.
- Trace: OpenTelemetry → collector → Jaeger/Tempo/X-Ray. Propagate `traceparent` header.
- **In 10 seconds:** RED for services, USE for resources; metrics for alerts, logs for forensics, traces for chains.

### SLI / SLO / SLA + error budget
- **SLI** = measurable indicator (e.g., "fraction of requests < 200 ms").
- **SLO** = internal target (e.g., 99.9% < 200 ms over 30 d).
- **SLA** = external contract with refund penalty.
- **Error budget** = `(1 − SLO) × time_window`. Spend it on releases.
- 99.9% = 43.2 min/month down. 99.99% = 4.32 min/month. 99.999% = 25.9 s/month.
- Burn rate alert: 14.4× burn over 1 h consumes 2% of monthly budget — page now.
- **In 10 seconds:** 99.9% buys you 43 min/month — that's your release risk budget.

### Alerting design
- **Symptom-based** (user-visible: latency, errors) > **cause-based** (CPU, disk).
- **Page vs ticket**: page = needs human < 15 min; ticket = next business day.
- Alerts should be: actionable, urgent, ownable. If not all three, demote to ticket.
- Multi-window burn-rate: alert when budget burns 14× over 1 h **and** 6× over 6 h (Google SRE pattern).
- Avoid alert storms: dedupe by service + symptom; aggregate at the alert source, not the human.
- **In 10 seconds:** page on user-visible symptoms; everything else is a ticket.

### AuthN / AuthZ — OAuth / OIDC / JWT
- **OAuth 2.0** = delegated **authorization**. **OIDC** = layer on OAuth adding **authentication** via `id_token`.
- **Flows**: Authorization Code + PKCE (SPA/mobile, default), Client Credentials (service-to-service), Device Code (TVs/CLIs). Implicit + Password are deprecated.
- **JWT** = `header.payload.signature` (base64url). Standard claims: `iss`, `sub`, `aud`, `exp`, `iat`, `jti`.
- **Revocation problem**: JWT is stateless. Mitigate with short access expiry (5–15 min) + refresh tokens + jti denylist.
- **In 10 seconds:** OAuth = authz, OIDC = authn, JWT short-lived + refresh + jti denylist.

### mTLS
- Both sides present X.509 certs; mutual verification against trusted CA. Used in service mesh (Istio, Linkerd), zero-trust networking, internal RPC.
- Rotate short-lived (24 h) via SPIFFE / cert-manager; long-lived (1 yr) certs are outages waiting to happen. ~5–10% CPU overhead vs plain TLS.
- **In 10 seconds:** zero-trust east-west; rotate certs daily, not yearly.

### Secrets management
- Never in env files, source, configmaps. Use: AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, Sealed Secrets (k8s).
- Rotate ≤ 90 d (automated); DB creds via dynamic secrets (Vault per-pod). Inject at runtime via init container / SDK / projected volume.
- **In 10 seconds:** Vault or cloud-native; rotate ≤ 90 d; never in git.

### OWASP Top 10 (2021, still current 2026)
1. Broken Access Control (most common). 2. Cryptographic Failures. 3. Injection (SQL/NoSQL/OS/LDAP). 4. Insecure Design. 5. Security Misconfiguration. 6. Vulnerable/Outdated Components. 7. AuthN Failures. 8. Software/Data Integrity (supply chain). 9. Logging/Monitoring Failures. 10. SSRF.

### AWS ↔ GCP mapping

| Concept | AWS | GCP |
|---|---|---|
| Compute / Serverless | EC2 / Lambda | Compute Engine / Cloud Run |
| K8s | EKS | GKE |
| Object / OLTP / OLAP | S3 / RDS+Aurora / Redshift | GCS / Cloud SQL+AlloyDB / BigQuery |
| Kafka / Queue / KV | MSK / SQS / DynamoDB | Pub/Sub / Tasks / Bigtable+Firestore |
| Cache / Identity / Secrets | ElastiCache / IAM / Secrets Manager | Memorystore / IAM / Secret Manager |
| CDN / Lake | CloudFront / S3+Glue+Athena | Cloud CDN / GCS+Dataproc+BigQuery |

### Kubernetes core objects
- **Pod** (smallest unit, ephemeral) → **ReplicaSet** (N replicas) → **Deployment** (declarative rollout of stateless).
- **StatefulSet**: stable IDs + PVCs for DBs. **DaemonSet**: one pod per node (log shippers, CNI). **Job / CronJob**: run-to-completion.
- **Service** types: ClusterIP / NodePort / LoadBalancer / ExternalName. **Ingress** for L7 (Gateway API in 2025+).
- **ConfigMap / Secret**: config / sensitive data. **HPA / VPA / KEDA**: autoscaling on CPU / mem / custom metrics.
- Pod startup typically 2–10 s (image pull dominates if not cached).
- **In 10 seconds:** Deployment for stateless, StatefulSet for stateful, HPA for autoscaling.

### Terraform basics
- Declarative IaC: `.tf` describes desired state; `plan` shows diff; `apply` reconciles.
- **State** in S3 / GCS / Terraform Cloud with locking (DynamoDB / GCS object lock). Modules = reusable; workspace = env isolation.
- Drift: console change → `terraform plan` shows it; `import` to adopt. Avoid: hand-editing state, committing `.tfstate`, monolithic root.
- **In 10 seconds:** desired state, locked remote state, modularize.

### CI/CD pipeline shape
- Stages: lint → unit test → build artifact → integration test → deploy stg → smoke → canary → prod.
- Trunk-based + feature flags > long-lived branches. Build once, promote across envs.
- Strategies: rolling (default), blue/green (instant switch, 2× resources), canary (% shift).
- Pipeline budget: PR → prod in < 30 min for healthy teams.

### Testing pyramid + contract tests
- Unit (lots, ms): pure logic. Integration (some, sec): with DB/cache/queue. E2E (few, min): real-browser / cross-service.
- **Contract tests** (Pact, Spring Cloud Contract): consumer-driven; replaces flaky E2E for service-to-service.
- Coverage 70–85% is a healthy floor; 100% drives test-the-mock antipatterns.

### Feature flags + canary
- Flag types: release (kill switch), experiment (A/B), ops, permission (per-tenant). Tools: LaunchDarkly, Flagsmith, Unleash, Statsig.
- **Canary**: 1% → 5% → 25% → 50% → 100% with guardrails at each step; auto-rollback on N σ regression.
- Kill old flags within 1–2 sprints — flag rot is real.

### DDD + refactoring
- **Bounded context**: model boundary + ubiquitous language. Maps to a microservice.
- **Aggregate**: entity cluster with a root = transactional boundary. **Entity** (ID, mutable) vs **Value object** (immutable). **Domain event**: past tense (`OrderPlaced`).
- **Strangler fig**: route new requests to new code, shrink old over time. **Branch by abstraction**: introduce interface, dual-implement, swap. **Extract service**: dual-write → cut → drop. **Parallel run**: compare outputs, retire when matched.

## Cheat numbers / formulas

- Error budget: `(1 − SLO) × window`. 99.9%/30d = 43.2 min.
- 99.99% = 4.32 min/month, 99.999% = 25.9 s/month.
- Burn rate alert: 14.4× over 1 h = 2% budget.
- mTLS CPU overhead: ~5–10% vs plain TLS.
- Secrets rotation: ≤ 90 d (compliance); DB creds dynamic (5–60 min).
- K8s pod startup: 2–10 s typical (image pull dominates).
- Canary stages: 1% → 5% → 25% → 50% → 100% with bake time per stage.
- JWT lifetime: access 5–15 min, refresh 1–30 d.
- Test pyramid ratio: ~70% unit / 20% integration / 10% E2E.
- CI/CD pipeline budget: PR → prod < 30 min healthy.

## Decision tree

- **Service slowing down?** Check RED (rate / error / duration).
- **Resource exhaustion?** Check USE (util / sat / errors).
- **Need traceability across N services?** OpenTelemetry + Jaeger.
- **Page-worthy?** User-visible symptom + actionable + urgent. Else ticket.
- **External user login?** OIDC (auth code + PKCE).
- **Service-to-service?** OAuth client credentials or mTLS.
- **Stateless workload?** K8s Deployment + HPA.
- **Stateful DB on K8s?** StatefulSet + PVC (or just use managed DB).
- **Cutting over a legacy service?** Strangler fig.
- **Releasing risky change?** Feature flag + canary 1% → ramp.

## Common pitfalls / "gotchas"

- Cause-based alerts (high CPU) page humans who can't act.
- JWTs valid for 24 h with no revocation path — leaked token = 24 h of impersonation.
- Storing secrets in env files committed to git.
- 100% line coverage as a target — drives test-the-mock antipatterns.
- Long-lived cert (1 yr) with no rotation drill — outage day 365.
- Canary without auto-rollback — congrats, you've deployed broken to 100%.
- Terraform state in git — concurrent applies destroy each other.
- One huge SLO instead of per-journey SLOs — masks broken critical flows.
- Logging PII / tokens / passwords. Scrub at the SDK level.

## Related: see also
- [05 · Distributed cheatsheet](../05-distributed-systems/cheatsheet.md) — circuit breakers, retries.
- [06 · HLD patterns cheatsheet](../06-hld-patterns/cheatsheet.md) — gateway, sharding.
- [08 · Data engineering cheatsheet](../08-data-engineering/cheatsheet.md) — pipeline observability, PII.
- [10 · Modern additions cheatsheet](../10-modern-additions/cheatsheet.md) — modern push, probabilistic DS.
