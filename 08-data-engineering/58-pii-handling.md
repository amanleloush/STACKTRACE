# 58 — PII Handling: Masking, Tokenization, GDPR/DPDP

> Phase 8 • Data Engineering • Topic 58/74

## Definition (interview-ready)

**PII (Personally Identifiable Information)** is data identifying an individual (name, email, phone, address, government ID, IP, device ID). **Masking** hides parts of the value (`****@gmail.com`); **encryption** scrambles it reversibly with a key; **tokenization** replaces it with a non-reversible token mapped in a vault. **GDPR** (EU), **DPDP** (India), **CCPA** (California) impose legal obligations on collection, processing, retention, and deletion.

## Why it matters

PII handling is the most common compliance pitfall and a major legal risk. Fines: GDPR up to 4% of global revenue; DPDP up to ₹250 crore. Beyond legal, it's a trust issue — leaks make front pages. Engineers who can design with privacy in mind are unusually valuable.

## Core concepts

### Categories of personal data

- **Identifiers**: name, email, phone, government ID.
- **Quasi-identifiers**: birth date, ZIP code, gender — alone harmless, combined can re-identify.
- **Sensitive PII**: health, financial, biometric, political views, religion, sexual orientation. Higher protection under GDPR Article 9.
- **Pseudonyms**: hashed/tokenized identifiers still considered personal under GDPR if reversal possible.

### Data minimization principle

Collect only what's needed for the stated purpose. Don't hoard data "in case it's useful later." Reduces blast radius of any breach and aligns with GDPR.

### Masking

**Static masking** (applied at rest): replace values, e.g., `john.doe@gmail.com` → `j***.d**@gmail.com`. Useful for non-prod environments.

**Dynamic masking** (at query time): based on user's role, the warehouse returns masked values to most users, full values to authorized roles.

Snowflake / BigQuery / Redshift support dynamic data masking via policy tags or column-level masking policies.

### Encryption

- **At rest**: database/object store encrypts data with a key. Standard now (S3 SSE, DB TDE).
- **In transit**: TLS everywhere.
- **Application-level encryption**: app encrypts specific fields before storage. Strongest; defends against DB breach.
- **Key management**: KMS (AWS KMS, GCP KMS, HashiCorp Vault); rotate keys; separation of duty.

### Tokenization

Replace sensitive value with a **token** (random ID); store the mapping in a **vault**.

```
Source:   credit_card = 4111111111111111
Token:    credit_card = tok_8a7b3c2d
Vault:    tok_8a7b3c2d → 4111111111111111  (heavy access controls)
```

- App tier sees only tokens.
- Vault is PCI-scoped, audited, network-isolated.
- Replaces "if you have the encrypted blob, you can decrypt with the key" with "you must call the vault to detokenize," with full audit trail.

Used by: Stripe, payment processors, anyone with PCI scope.

### Hashing

- One-way function: same input → same output.
- Useful for deduplication, joining, lookups without retaining original.
- **Salted hashes** prevent rainbow-table attacks.
- Beware: small input spaces (phone numbers, emails) are brute-forceable from hash + dictionary. Use **HMAC** with a secret key when joining sensitive fields.

### Anonymization vs pseudonymization

- **Anonymization**: irreversibly removes identifiers. The data is no longer personal under GDPR. Hard to achieve in practice (combined quasi-identifiers can re-identify).
- **Pseudonymization**: replace identifiers with pseudonyms (e.g., tokens). Still personal data under GDPR — re-identifiable with the key/vault.

### Right to erasure (GDPR / DPDP)

Users can request deletion. Engineers must:
- Identify all systems holding the user's data (CRM, DB, warehouse, backups, logs, embeddings).
- Delete or anonymize within statutory deadline (GDPR: ~30 days).
- Maintain audit trail of the deletion.
- Handle replicated/cached data.

Implementation patterns:
- **Soft delete + retention**: mark deleted, hard-delete after retention.
- **Tombstones in lakehouse**: DELETE in Iceberg/Delta + VACUUM after retention.
- **Cascade through CDC**: deletion event propagates to downstream stores.
- **Backups**: out of legal scope or include in deletion (varies by jurisdiction; usually exempt for short retention).

### Right to access / portability

Users can request a copy of their data. Maintain a process (often automated) to export structured data per user.

### Consent management

- Explicit consent for processing (especially sensitive data).
- Consent records audited.
- Withdrawal must be as easy as granting.
- Purpose limitation: data collected for X can't be used for Y without new consent.

### Data Subject Rights endpoints

Standard tooling for handling rights requests: data export, deletion, access, correction. Modern compliance tools (OneTrust, Transcend) automate.

### Data residency

GDPR: EU data can't leave EU without safeguards (SCCs, adequacy decisions).
DPDP: India is moving toward stricter residency.
China PIPL: strict data localization.

Architecture: regional data lakes, sharded by user residency, replication strategies bounded by jurisdiction.

### Data warehouse PII practices

- **Tag columns** with sensitivity labels (e.g., `pii.email`, `pii.phone`).
- **Mask policies** apply based on tags + user role.
- **Access logging**: every query on PII-tagged columns logged.
- **Approval workflow** for analyst queries on raw PII.

### Logging and PII

Common bug: PII leaks into logs (e.g., logging the full request body that contains an email).

Mitigations:
- **Structured logging** with explicit fields, no full-payload dumps.
- **Log scrubbing**: regex-based redaction at the log shipper.
- **Audit log access**: who reads logs.

## How it works (a sample architecture)

```
Source (App writes) ──► tokenize PII at API ingest
                                │
                                ▼
                          App DB (only tokens)
                                │
                                ▼
                          CDC to Warehouse
                                │
                                ▼
                      Warehouse: tokens + tags
                                │
                  Dynamic masking by role
                                │
                                ▼
                          BI / analysts (see masked / non-PII)
                                
Authorized roles ──► detokenize via vault (audited)
```

## Real-world examples

- **Stripe**: tokenization for cards; PCI-scoped vault.
- **Apple**: privacy-by-design — differential privacy, on-device processing.
- **Google BigQuery**: column-level encryption + policy tags.
- **Snowflake**: dynamic data masking, row access policies.
- **Meta**: extensive privacy infrastructure post-Cambridge Analytica.

## Common pitfalls

- **Hashing emails for "anonymization"**: trivially reversible via dictionary. Use HMAC with secret + rotate.
- **PII in logs**: easy to leak via full request/response dumps.
- **No deletion in backups**: GDPR considerations.
- **Embedding PII in URLs**: ends up in proxy logs, browser history.
- **Sharing prod data with non-prod**: copies PII into less-protected environments. Use masked replicas.
- **Forgetting about derived data**: aggregations, ML feature stores, embeddings can leak PII.
- **Soft-delete forever**: defeats deletion intent.

## Interview questions

### Q1: What's the difference between masking, encryption, and tokenization?
Masking: hides parts (`****@gmail.com`), often static for non-prod. Encryption: reversible scramble with a key; access controlled by key management. Tokenization: replace value with a random token; mapping stored in a separate vault — best for reducing PII scope across systems.

### Q2: How would you implement GDPR right to erasure?
- Identify all systems storing the user's data (data inventory + lineage).
- Submit deletion to all: app DB, warehouse, search, cache, ML embeddings, logs.
- Use lakehouse DELETE for warehouses (then vacuum).
- Cascade through CDC.
- Maintain audit trail.
- Handle backups per jurisdiction.

### Q3: Why is hashing alone not enough for PII?
For small/predictable input spaces (emails, phone numbers), an attacker can brute-force the hash with a dictionary. Use HMAC with a secret key (kept in vault), or full tokenization with a vault.

### Q4: Design PII handling for a new analytics warehouse.
- Tag columns with sensitivity labels.
- Dynamic data masking by user role.
- Row-level access policies for tenant data.
- Strong audit logs on PII-tagged columns.
- Tokenize sensitive fields at ingest (so warehouse only has tokens).
- Detokenization service with vault + audit (rare access).

### Q5: A team's logs contain user emails. How do you fix and prevent?
- Immediate: scrub logs (rotate, mask retroactively if possible).
- Update logging code: never log full request/response bodies; only IDs and structured fields.
- Add log-shipper regex scrubbing as defense in depth.
- Pre-commit hooks / linters that catch direct PII logging.
- Educate the team; add to code review checklist.

### Q6: How does dynamic data masking work?
Warehouse engine applies a masking policy at query time based on user role. e.g., analysts see `****@gmail.com`, security engineers see `j**@gmail.com`, the data owner sees full email. Implemented via column-level policy attached to the column.

### Q7: What is data residency and how to design for it?
Legal requirement that data of users from certain jurisdictions stays in that region (GDPR for EU, PIPL for China). Architecture: regional data lakes + regional services + cross-border restrictions enforced in routing. Replication bounded by jurisdiction. Cross-region needs legal basis (SCCs, etc.).

### Q8: A new feature requires collecting user's exact location. Privacy considerations.
- Is exact location necessary, or is approximate (city, country) enough? **Data minimization.**
- Explicit consent — opt-in, clear purpose statement.
- Retention: minimize duration.
- Access control: who in your company can see it?
- Aggregation: store aggregated where possible, raw only if essential.
- Right-to-deletion handled.
- Document the legal basis (GDPR Article 6).

## TL;DR cheat sheet

- PII = identifies a person (direct or via combination).
- Sensitive PII (health, finance, biometric) = stricter rules.
- **Data minimization**: collect less, retain less.
- Masking, encryption, tokenization — different roles, often combined.
- Hashing alone is weak for low-entropy data; use HMAC or tokenize.
- GDPR/DPDP: right to access, erasure, portability, consent management.
- Dynamic data masking + column tags + access logging in warehouse.
- Don't log PII; scrub at the source and at log shipper.
- Data residency: regional architecture.
- Tokenization vault (Stripe-style) for PCI scope.

## Go deeper

- **GDPR official text**: [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2016/679/oj).
- **DPDP** (India): [meity.gov.in](https://www.meity.gov.in/) — official text.
- **AWS Macie**: [docs.aws.amazon.com/macie](https://aws.amazon.com/macie/) — PII discovery.
- **Stripe blog**: tokenization architecture posts.
- **Snowflake docs**: dynamic data masking, row access policies.
- **Apple differential privacy** — academic but illustrative.
- **Book**: *Practical Privacy* by Katharine Jarmul.
- **OneTrust / Transcend** docs: compliance tooling.
