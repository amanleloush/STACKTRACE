# 70 — CI/CD Pipeline Design

> Phase 9 • Production Craft • Topic 70/74

## Definition (interview-ready)

**Continuous Integration (CI)**: every code change triggers automated build + tests. **Continuous Delivery**: every commit could be released; releases are routine and low-risk. **Continuous Deployment**: every passing commit goes to production automatically. Modern CI/CD pipelines combine: lint → test → build → security scans → deploy → verify.

## Why it matters

The deployment pipeline is where engineering velocity and operational quality intersect. Slow, manual, or unreliable CI/CD = slow shipping, late discovery of issues, dangerous rollbacks. Fast, automated, observable CI/CD = teams that ship 10× a day with confidence.

## Core concepts

### CI vs CD

- **CI**: build + test every commit. Goal: catch breakage fast.
- **Continuous Delivery**: every commit is releasable; deployment is a button-press.
- **Continuous Deployment**: every commit auto-deploys to prod (with quality gates).

Many teams say "CI/CD" meaning continuous delivery.

### A canonical pipeline

```
Push → CI (build + test + scan) → Artifact stored → Deploy to staging → Smoke tests → Deploy to prod (canary) → Verify → Promote / Roll back
```

### Stages

1. **Pre-commit**: linters, formatters, secret scanning (locally + as GitHub Action).
2. **PR build**: unit + integration tests, type check, security scans (SAST, SCA), code coverage.
3. **Merge to main**: full integration, build artifact (container image), push to registry.
4. **Staging deploy**: deploy artifact, smoke tests.
5. **Production deploy**: gradual rollout (canary, blue-green).
6. **Verify**: monitor SLO, error rates, latency post-deploy.
7. **Auto-rollback** on SLO breach.

### Build artifacts

- **Immutable**: same artifact deployed in staging and prod — eliminates "works in staging but not prod."
- **Tagged with commit SHA + semver**.
- **Stored** in artifact registry (ECR, GAR, Artifactory).
- **Image scanning** before deploy.

### Strategies for deployment

- **Recreate**: stop old, start new. Downtime.
- **Rolling**: gradually replace old with new. Standard for k8s Deployments.
- **Blue-green**: two complete environments; switch traffic on cutover.
- **Canary**: small % traffic to new version; monitor; expand.
- **Shadow**: send copy of traffic to new without affecting users.

(See Topic 72 for canary / feature flag detail.)

### Testing in the pipeline

- **Unit**: fast, isolated. Most numerous.
- **Integration**: real DB, real services.
- **Contract**: producer/consumer schemas match. (Topic 71.)
- **E2E**: full system, slowest. Run before deploys.
- **Performance**: gated thresholds.
- **Security**: SAST, SCA, container scan.

### Trunk-based development

Most teams: short-lived feature branches → merge to main daily. Avoid long-lived feature branches (merge hell).

For risky changes: **feature flags** (Topic 72) ship behind a flag, enable gradually.

### Secrets in CI

- Never echo secrets in build logs.
- Use environment scoped secrets (GitHub Actions secrets, etc.).
- Mask in logs automatically.
- Short-lived tokens (OIDC for cloud access, no long-lived AWS keys).

### Quality gates

Auto-reject merges if:
- Tests fail.
- Code coverage drops > X%.
- Security scan finds high/critical CVE.
- Linting / formatting issues.
- Bundle size grows > X%.
- Performance benchmark regression.

### Pull-request CI

- Every PR runs the pipeline.
- Fast feedback (< 10 min) — slow CI demoralizes.
- Required checks before merge.
- Use caching (deps, build outputs) aggressively.

### Tooling

- **GitHub Actions**: most popular for open-source + many teams.
- **GitLab CI**: integrated with GitLab.
- **CircleCI, Travis** (legacy), **Buildkite**, **TeamCity, Jenkins**.
- **Argo CD, Flux**: GitOps for k8s (deploy via git push).
- **Spinnaker**: complex multi-cloud deployments at scale.

### GitOps

Deploy by committing to a git repo; controller reconciles cluster to match.

```
Engineer: pushes change to manifests repo.
Argo CD watches repo, detects diff.
Argo CD applies change to cluster.
```

Benefits: full audit trail (git history = deploy history), easy rollback (revert commit), pull-based (no creds pushed to cluster).

### Pipeline observability

- **Build time** trends (slow CI = slow shipping).
- **Test flakiness** rate.
- **Deploy success rate**.
- **Mean time to recover** (rollback speed).
- **Deploy frequency** (DORA metric).
- **Lead time** (commit to prod).

### DORA metrics

Elite teams measure:
1. **Deployment frequency**: multiple per day.
2. **Lead time for changes**: < 1 day.
3. **Change failure rate**: < 15%.
4. **Time to restore service**: < 1 hour.

## How it works (a typical pipeline)

```
Developer pushes feature branch.
GitHub Actions:
  - Lint, format check
  - Unit tests
  - Build container
  - Image scan
  - Integration tests against ephemeral DB
  - Coverage report
Merge to main:
  - Above + push image to ECR with SHA tag
  - Deploy to staging
  - Smoke tests
  - Auto-deploy to prod (canary 5%, then 50%, then 100% with SLO checks at each step)
  - Notify Slack
  - Tag git release
On SLO breach:
  - Auto-rollback to previous version
  - Page on-call
```

## Real-world examples

- **Amazon**: deploys 1 per second across all services.
- **Google**: famously: trunk-based, monorepo, automated testing.
- **Etsy**: pioneered Continuous Deployment.
- **GitHub**: 100s of deploys per day.
- **Stripe**: rigorous canary + SLO gating.

## Common pitfalls

- **Slow CI** (>30 min): demoralizes engineers, encourages skipping.
- **Flaky tests**: people learn to ignore failures → real bugs ship.
- **No staging or different from prod**: bugs surface late.
- **Manual deploys**: error-prone, slow.
- **No rollback path**: stuck with broken deploys.
- **Single shared environment**: contention.
- **Secrets in pipeline logs**.
- **Deploying on Friday afternoon**: cultural anti-pattern (though "deploy any day" with good CI/CD is the goal).
- **No deployment lock during incidents**.

## Interview questions

### Q1: CI vs CD?
CI = build + test on every commit (catch breakage). Continuous Delivery = every commit is releasable, deploys are routine. Continuous Deployment = every passing commit auto-deploys to prod with quality gates.

### Q2: What stages does a typical pipeline have?
Lint/format → unit tests → integration tests → build artifact → security scans → deploy to staging → smoke tests → production canary → full deploy → post-deploy verification → rollback on SLO breach.

### Q3: Why immutable artifacts?
The same exact artifact (container image) deployed in dev, staging, prod. Eliminates "works in dev but not prod" debugging. Reproducible: any prod incident can be debugged on a copy of the artifact.

### Q4: How does GitOps work?
Deploy by committing to a git repo. A controller (Argo CD, Flux) watches the repo and reconciles the cluster to match. Benefits: full audit (git history = deploy history), easy rollback (revert commit), pull-based (no creds pushed to cluster).

### Q5: A team has 45-minute CI. Improvements?
- Profile: where's the time spent?
- Cache: dependencies, Docker layers, intermediate builds.
- Parallelize: split tests into shards.
- Test pyramid: more unit, less integration.
- Reduce flakiness: each retry doubles total time.
- Run only relevant tests on PRs (changed-code awareness).
- Smaller monorepo modules.

### Q6: How to deploy safely to production?
- Canary: 1-5% traffic to new version.
- Monitor SLOs and error rates.
- Auto-rollback on regression.
- Gradually expand: 5% → 25% → 50% → 100%.
- Feature flags for risky behavior; flag off → safe code path.
- Database changes: backward-compatible only; expand-migrate-contract (Topic 33).

### Q7: A canary deploy succeeds but full rollout fails. How?
Things scale at full rollout that didn't at 5%:
- Hot keys or cache stampede.
- Capacity: full traffic exceeds new code's tuning.
- Latent integration with downstream limits.
- Time-of-day effects.
- New code path that 5% didn't exercise.

Fix: slower rollout, automated rollback, more canary observability.

### Q8: Design a CI/CD pipeline for a microservice.
- **Pre-commit**: gitleaks, formatter, linter.
- **PR CI**: lint, unit (1-3 min), integration (5 min), SAST, SCA, container scan, type check, coverage gate.
- **Merge to main**: full integration, build container with SHA tag, push to registry.
- **CD pipeline**: deploy to staging (auto), smoke tests, manual approval (or auto for low-risk services), canary to prod, monitor SLO, expand.
- **Auto-rollback** on SLO breach.
- **DORA metrics dashboard**.

## TL;DR cheat sheet

- CI = build/test per commit. CD = deploy frequently and safely.
- Pipeline: lint → unit → integration → scan → build → deploy → verify.
- Immutable artifacts (container image with SHA).
- Canary + auto-rollback for safer prod deploys.
- Trunk-based + feature flags > long-lived branches.
- Tests: pyramid (lots of unit, fewer integration, smallest E2E).
- GitOps: deploy by committing to git.
- DORA metrics: frequency, lead time, failure rate, recovery time.
- Fast CI (< 10 min PR feedback) is key for velocity.

## Go deeper

- **Fowler**: ["Continuous Integration"](https://martinfowler.com/articles/continuousIntegration.html), ["Continuous Delivery"](https://martinfowler.com/bliki/ContinuousDelivery.html).
- **Book**: *Continuous Delivery* (Humble, Farley) — the canonical text.
- **Book**: *Accelerate* (Forsgren, Humble, Kim) — DORA research.
- **GitHub Actions docs**.
- **Argo CD / Flux** docs.
- **Google Cloud Build** + **Spinnaker** docs.
- **Atlassian DevOps content**: high quality intros.
