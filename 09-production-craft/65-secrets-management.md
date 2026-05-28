# 65 — Secrets Management (Vault, KMS)

> Phase 9 • Production Craft • Topic 65/74

## Definition (interview-ready)

**Secrets** are sensitive credentials (DB passwords, API keys, signing keys, OAuth client secrets). **Secrets management** is the discipline of storing, distributing, rotating, and auditing them — never in code, never in plain config files. Tools: **HashiCorp Vault**, **AWS Secrets Manager**, **AWS KMS**, **GCP Secret Manager**, **GCP KMS**, **Azure Key Vault**, **SOPS**.

## Why it matters

Leaked secrets are responsible for many of the largest production incidents (data breaches, crypto thefts, abused cloud accounts). Done right, secrets are short-lived, dynamically issued, audited per access, and never reach a developer's laptop in plaintext.

## Core concepts

### What's a secret?

- Database passwords, API keys.
- TLS private keys, SSH keys.
- OAuth client secrets, JWT signing keys.
- Encryption keys (KMS-managed).
- Tokens (cloud, GitHub, internal).

### Where they shouldn't be

- **In git** (even private repos — gitleaks scans find them).
- **In Dockerfile** ENV vars (visible in image layers).
- **In CI/CD logs** (echo them once and they're in your build history forever).
- **In environment variables passed in plain** (visible in `/proc/PID/environ`).

### Vault patterns

#### Static secret (KV store)

Store the credential; apps fetch on startup.

```
vault write secret/myapp/db username=admin password=...
vault read secret/myapp/db
```

Limitation: still a long-lived credential.

#### Dynamic secrets

Vault generates a unique short-lived credential per request, deletes when done.

E.g., `vault read database/creds/myapp-role` → returns a unique DB username + password valid for 1 hour, automatically dropped at expiry.

Benefits:
- No two services share a credential.
- Leaked credential expires in an hour.
- Per-request audit trail.

Supported: AWS IAM credentials, DB users (Postgres, MySQL), SSH OTPs, PKI certs, etc.

#### Transit (encryption as a service)

Vault encrypts on demand without giving you the key. Apps call `vault write transit/encrypt/mykey plaintext=...` and get ciphertext back; later call decrypt. Useful for encrypting data fields without managing keys.

### KMS (Key Management Service)

Centralized key store. AWS KMS, GCP KMS, Azure Key Vault.

- Keys never leave KMS.
- Apps call KMS to encrypt/decrypt data.
- Envelope encryption: KMS encrypts a **data key**, app uses the data key to encrypt large data. KMS only sees small data keys.

Use case: encrypting fields in DB, encrypting S3 objects with customer-managed keys.

### Envelope encryption

```
data → AES → encrypted_data
key generated locally; encrypted by KMS → encrypted_data_key

Store: encrypted_data + encrypted_data_key
Read: KMS decrypts data_key → use data_key to decrypt data.
```

Why: KMS calls are slow (~10ms) and rate-limited. Envelope = KMS used once per data key, not per encryption.

### Rotation

- Secrets must be rotatable.
- Dynamic secrets (Vault DB engine): rotation is automatic — every new lease has a new credential.
- Static secrets: scheduled rotation (Vault rotates root credentials, generates new dynamic creds).
- App must handle: receive new secret, gracefully switch.

### Secrets in Kubernetes

- **k8s Secrets**: base64-encoded, stored in etcd (encrypted at rest with KMS in modern setups). Not strong by themselves.
- **Vault Agent / CSI driver**: pulls real secrets from Vault and mounts as files.
- **External Secrets Operator (ESO)**: syncs from Vault / AWS Secrets Manager / GCP Secret Manager into k8s Secrets.
- **SOPS + age**: secrets encrypted in git, decrypted at deploy time.

### Workload identity

How does a service authenticate to Vault?
- **AppRole**: long-lived role ID + secret ID. Decent.
- **Kubernetes ServiceAccount**: Vault validates the SA token via k8s API.
- **Cloud workload identity**: AWS IAM role, GCP Workload Identity, Azure Managed Identity. Best — no secret to manage.

### Auditing

Every secret access logged: who, what secret, when, success/failure.

Critical for: incident response, compliance, forensics.

### Just-in-time access

For human access to production secrets:
- **Break-glass**: regular access denied; emergency access requires approval + audit.
- **Approval flow**: another engineer approves; logged.
- **Time-bound**: access expires automatically.

### Secret scanning

- **gitleaks, trufflehog**: scan repos for leaked secrets.
- **Pre-commit hooks**: catch before commit.
- **Provider scanning**: GitHub Secret Scanning detects exposed tokens and notifies issuer (AWS, GCP) which auto-revokes.

## How it works (a Vault DB credential flow)

```
1. App boots in k8s. Service Account = "payment-svc".
2. Vault Agent reads SA token, presents to Vault.
3. Vault validates token via k8s API; matches "payment-svc" → Vault role.
4. Vault role grants access to "database/creds/payment-role".
5. App requests DB credentials.
6. Vault DB engine connects to DB, CREATE USER xyz123 with password rnd, GRANT permissions.
7. Vault returns { username: xyz123, password: rnd, lease_id: ..., ttl: 1h } to app.
8. App connects to DB with these creds.
9. After 1h, Vault revokes the user (DROP USER) and app must request new ones.
10. All access logged in Vault audit.
```

## Real-world examples

- **HashiCorp Vault**: open-source standard, used by most large enterprises.
- **AWS Secrets Manager + KMS**: managed AWS ecosystem.
- **GCP Secret Manager + KMS**: GCP equivalent.
- **Doppler, Pulumi ESC**: modern SaaS secrets managers.
- **GitHub Advanced Security**: secret scanning + push protection.

## Common pitfalls

- **Secrets in code / git history**: clean git history is hard; assume permanently leaked.
- **Same secret across environments**: dev compromise = prod compromise.
- **No rotation**: long-lived credentials live for years.
- **Plain env vars**: visible via `/proc`, debugger, error pages.
- **Secrets in logs**: hard to remove from log archives; cleanse at source.
- **No audit**: can't tell who used what.
- **Hardcoded admin credentials** in scripts.
- **Vault as SPOF**: if Vault is down, services can't get secrets. HA + caching.
- **Trust in CI/CD logs**: print a secret once, it's archived.

## Interview questions

### Q1: What's a dynamic secret?
A credential generated on demand, unique per requester, with a short TTL. Vault creates it (e.g., DB user) and revokes after expiry. No two services share, no long-lived credential to leak. Replaces static stored credentials.

### Q2: What's envelope encryption and why use it?
A two-layer scheme: data is encrypted with a generated data key; the data key is encrypted by a master key (in KMS). Why: KMS calls are slow and rate-limited; encrypting data directly via KMS is expensive. Envelope = KMS used once per data key, not per byte.

### Q3: How would you handle secrets in Kubernetes?
Options ranked:
- **Workload identity + Vault dynamic secrets**: app fetches at runtime, short-lived. Best.
- **External Secrets Operator**: sync from Vault/AWS-SM/GCP-SM into k8s Secrets.
- **Vault CSI driver**: mount secrets as files.
- **k8s Secrets alone**: base64; weak unless etcd is KMS-encrypted.

Don't rely on raw k8s Secrets without external backing.

### Q4: A repo has a secret committed in history. What now?
- Treat it as compromised — rotate immediately, even after removal.
- Remove from history (`git filter-repo`) and force-push — but assume it's been scraped already.
- Audit logs for use during window.
- Move secret to Vault / Secrets Manager.
- Add secret scanning + pre-commit hooks to prevent recurrence.

### Q5: How do services authenticate to Vault?
- **AppRole**: long-lived role/secret IDs.
- **Cloud workload identity**: AWS IAM role, GCP Workload Identity, Azure Managed Identity. **Best** because no secret to manage on the client.
- **k8s SA token**: Vault validates via k8s API.
- Avoid: shared secret distributed manually.

### Q6: Design rotation for a long-lived API key shared across many services.
- Migrate to short-lived credentials if possible (dynamic secrets, OAuth tokens).
- If unavoidable: scheduled rotation (Vault root rotation), services receive new key via SDK, graceful handoff (accept old + new for a window).
- For external-provider keys (e.g., Stripe): use provider's rotation API; deploy new key gradually.

### Q7: How does KMS protect a key?
Keys are stored inside a hardware security module (HSM); they never leave. All cryptographic operations happen inside KMS. Even if your AWS account is compromised, the key bytes can't be exfiltrated — only the ability to *use* the key (which is auditable and revocable).

### Q8: A team logs "API key invalid: sk_xxxxxx" with the actual key. How to prevent?
- **Code review** + linters that flag logging of secret-suffixed variables.
- **Mask at logger level**: middleware that scrubs known secret patterns.
- **No secret-strings in error responses** ever.
- **Treat the key as compromised**: rotate immediately.
- **Educate team**: never log raw secrets even for debugging.

## TL;DR cheat sheet

- Secrets never in code/git/logs/plain env.
- **Dynamic secrets** (Vault): short-lived, unique-per-request, auto-revoke.
- **KMS**: keys never leave; envelope encryption for performance.
- **Workload identity** (cloud) > AppRole > shared secrets.
- **Rotation**: short TTLs + automated re-issue.
- **k8s Secrets** alone are weak — back with Vault/ESO/CSI.
- **Audit log** every access.
- **Secret scanning** in CI + GitHub.
- Assume any leaked secret is compromised — rotate.

## Go deeper

- **HashiCorp Vault docs**: [developer.hashicorp.com/vault](https://developer.hashicorp.com/vault).
- **AWS Secrets Manager + KMS docs**.
- **GCP Secret Manager docs**.
- **OWASP secrets management cheat sheet**: [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).
- **External Secrets Operator**: [external-secrets.io](https://external-secrets.io/).
- **gitleaks**: [github.com/gitleaks/gitleaks](https://github.com/gitleaks/gitleaks).
- **Doppler / Pulumi ESC** documentation.
