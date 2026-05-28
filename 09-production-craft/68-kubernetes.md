# 68 — Kubernetes: Pods, Deployments, Services, Ingress

> Phase 9 • Production Craft • Topic 68/74

## Definition (interview-ready)

**Kubernetes (k8s)** is a container orchestration system. Apps run in **Pods** (one or more containers); **Deployments** manage rollout/rollback; **Services** give stable virtual IPs and load balancing across pod replicas; **Ingress** routes external HTTP traffic to Services with rules (host, path, TLS).

## Why it matters

K8s is the de facto standard for running containerized workloads at scale. Whether you love or hate it, large-scale deployments converge on k8s patterns (or work around its complexity). Knowing the primitives lets you reason about modern infra without getting lost in YAML.

## Core concepts

### Pod

- Smallest deployable unit: 1+ containers sharing network/storage.
- Has its own IP (within cluster).
- Ephemeral: pods come and go.
- Typically 1 main container + 0-2 sidecars (logging, mesh proxy).

### Deployment

- Manages a **ReplicaSet** which manages **Pods**.
- Declarative: "I want 5 replicas of nginx:1.21."
- Rolling updates: gradually replace old pods with new.
- Rollback by tracking history.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: api }
spec:
  replicas: 3
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      containers:
      - name: api
        image: myrepo/api:v2.3
        ports: [{ containerPort: 8080 }]
        livenessProbe: { ... }
        readinessProbe: { ... }
```

### Service

- Stable virtual IP (ClusterIP) + DNS for a set of pods (selected by labels).
- Load-balances across selected pods.
- Pod IPs come and go; service IP is stable.
- Types:
  - **ClusterIP**: internal only. Default.
  - **NodePort**: opens a port on every node; basic external access.
  - **LoadBalancer**: cloud LB provisioned (e.g., AWS ELB).
  - **ExternalName**: CNAME alias.

### Ingress

- L7 routing in front of Services.
- Rules: host, path → Service.
- TLS termination.
- Implementations: nginx-ingress, AWS ALB Ingress, GCP GCLB, Traefik, Istio Gateway.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata: { name: web }
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service: { name: api, port: { number: 80 } }
```

### Other workload types

- **StatefulSet**: pods with stable identity + persistent storage. For DBs, queues, anything stateful.
- **DaemonSet**: one pod per node (log collector, monitoring agent).
- **Job / CronJob**: batch / scheduled.

### Storage

- **Volume**: ephemeral, lifecycle tied to pod.
- **PersistentVolume (PV)**: backed by EBS, GCE PD, etc.
- **PersistentVolumeClaim (PVC)**: pod's request for storage; bound to a PV.
- **StorageClass**: how to provision new PVs (e.g., gp3 SSD on AWS).

### Config and secrets

- **ConfigMap**: non-sensitive config (env vars, files).
- **Secret**: sensitive — base64-encoded; with KMS-encrypted etcd, encrypted at rest. (See Topic 65 for better practices.)

### Networking model

- Every pod gets a unique IP.
- Pods can reach each other directly (CNI plugin handles routing — Calico, Cilium, Flannel).
- Services use kube-proxy (iptables or IPVS) to route to pod IPs.
- Network policies (Calico, Cilium) restrict pod-to-pod traffic — zero trust.

### Health checks

- **Liveness**: is the process alive? Failure → restart.
- **Readiness**: ready to serve? Failure → remove from Service endpoints (don't restart).
- **Startup**: for slow-starting apps; defers liveness.

### Autoscaling

- **HPA** (Horizontal Pod Autoscaler): scale replicas based on CPU/memory/custom metrics.
- **VPA** (Vertical Pod Autoscaler): adjust resource requests/limits.
- **Cluster Autoscaler**: add/remove nodes based on pending pods.
- **KEDA**: event-driven scaling (from Kafka lag, queue depth, etc.).

### RBAC

- **Roles**: define permissions (verbs × resources).
- **RoleBinding / ClusterRoleBinding**: bind role to user/service account.
- Service accounts for in-cluster identity.

### Deployments and rollouts

- **Rolling update** (default): incremental, one pod at a time (configurable).
- **Recreate**: delete all old, then create new. Brief downtime.
- **Blue-green / canary**: requires custom logic or Argo Rollouts / Flagger.

### Resource requests and limits

- **Requests**: minimum the pod needs. Scheduler uses for placement.
- **Limits**: maximum. CPU above = throttled. Memory above = OOMKilled.

Tune both: too high wastes; too low gets pods killed.

## How it works (a request)

```
External user → Cloud LB → Ingress controller (nginx pod)
  → Service (ClusterIP virtual IP)
  → kube-proxy DNATs to a healthy pod IP
  → Pod processes request
  → Response back via reverse path
```

## Common pitfalls

- **No resource requests/limits**: pods OOM each other; scheduler can't pack right.
- **Liveness too aggressive**: pods restart-loop during startup.
- **Readiness == liveness**: failing readiness should not trigger restart.
- **No PodDisruptionBudget**: cluster updates kill all replicas at once.
- **Anti-affinity missing**: all replicas land on one node; node fails = full outage.
- **Latest tag**: image:latest → can't track which version is deployed. Always use immutable tags or digests.
- **No Network Policies**: any pod can hit any pod.
- **Secrets as plain ConfigMaps**: no.
- **etcd not backed up**: cluster state lost.
- **Single ingress without HA**.

## Interview questions

### Q1: What's a Pod and why isn't a container the smallest unit?
A Pod is one or more containers sharing network (same IP, port space) and storage volumes. Useful for sidecars (logging, mesh, init containers) that must co-locate with the main container. K8s primitives reason about pods because the unit of scheduling/networking is the pod, not the container.

### Q2: How does a Service load-balance traffic?
Service is a virtual IP + selector matching pod labels. kube-proxy on each node (via iptables or IPVS) maintains rules that DNAT requests to one of the matching pod IPs. The set of pod IPs (Endpoints) is updated by the control plane as pods come and go.

### Q3: Difference between Ingress and Service of type LoadBalancer?
Service LoadBalancer: provisions a cloud LB (e.g., AWS NLB) per service. Costly (one LB per service). Ingress: one shared HTTP/HTTPS LB + routing rules to many services by host/path. Cheaper and richer for HTTP traffic. Use LoadBalancer for non-HTTP or single-service exposure; Ingress for typical web stacks.

### Q4: Why do we need liveness AND readiness probes?
Liveness: process alive? Failure → restart. Readiness: ready to serve? Failure → remove from Service endpoints (but don't restart). A pod can be alive but warming up, draining, or briefly losing downstream. Readiness avoids unnecessary restarts.

### Q5: Walk through a rolling update.
Deployment manifest updated with new image. Control plane creates a new ReplicaSet with new image. Gradually: create N new pods, wait until ready, terminate N old pods. Continue until all replicas are new. Configurable: `maxSurge`, `maxUnavailable`. Rollback: switch back to previous ReplicaSet.

### Q6: How would you do a canary deployment?
Native k8s: split Service across two Deployments (e.g., 90/10 by replica count). More controllable: **Argo Rollouts** or **Flagger** integrate with metrics + service mesh to auto-progress canary based on success criteria.

### Q7: A pod is restarting in a loop. Diagnose.
- Liveness probe failing: tune timeouts / start delay, or there's a bug.
- OOMKilled: memory limit too low.
- Crash on startup: bad config, missing env var, network dependency missing.
- Image pull error: image doesn't exist or no permissions.
- Init container failing.
Check: `kubectl describe pod`, `kubectl logs --previous`, events, exit code.

### Q8: How would you secure a k8s cluster?
- **RBAC**: least-privilege roles for users and service accounts.
- **Network Policies**: pod-to-pod restrictions.
- **Pod Security Standards** (replaces deprecated PodSecurityPolicy): restrict capabilities, privileged, hostPath, etc.
- **Image scanning**: Trivy, Snyk.
- **Secrets** via Vault / external secrets, not raw k8s Secrets.
- **etcd encryption at rest** (KMS).
- **mTLS** between services (service mesh).
- **Audit logging** to detect anomalies.
- **Patch promptly**; node OS hardened.

## TL;DR cheat sheet

- **Pod**: 1+ containers sharing network/storage. Smallest unit.
- **Deployment** → ReplicaSet → Pods. Rolling updates.
- **Service**: stable virtual IP + load-balance to pods by labels.
- **Ingress**: L7 HTTP routing in front of Services.
- **StatefulSet**: pods with stable identity + storage.
- **DaemonSet**: one pod per node.
- **HPA / VPA / Cluster Autoscaler**: scale.
- **Liveness vs readiness**: restart vs remove from endpoints.
- **Resource requests/limits**: tune carefully.
- **PodDisruptionBudget + anti-affinity**: HA across nodes/AZs.
- **Network Policies + RBAC**: zero trust.

## Go deeper

- **Kubernetes docs**: [kubernetes.io/docs](https://kubernetes.io/docs/) — tutorials are excellent.
- **KodeKloud**: [kodekloud.com](https://kodekloud.com/) — hands-on courses.
- **Kubernetes Up & Running** (Burns, Beda, Hightower).
- **CKA / CKAD certification** prep — solid hands-on practice.
- **Argo CD / Argo Rollouts** docs.
- **Istio / Linkerd** docs (service mesh).
