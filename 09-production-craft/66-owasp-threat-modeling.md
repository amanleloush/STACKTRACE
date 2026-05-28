# 66 — OWASP Top 10 + Threat Modeling (STRIDE)

> Phase 9 • Production Craft • Topic 66/74

## Definition (interview-ready)

**OWASP Top 10** is a periodically updated list of the most critical web application security risks (broken access control, injection, broken auth, insecure design, etc.). **Threat modeling** is the structured practice of identifying and mitigating threats to a system; **STRIDE** is a popular taxonomy: **S**poofing, **T**ampering, **R**epudiation, **I**nformation disclosure, **D**enial of service, **E**levation of privilege.

## Why it matters

Almost every production breach maps to an OWASP Top 10 category. Threat modeling early in design surfaces vulnerabilities cheaply — before code, before users, before compliance audits. Engineers who internalize OWASP + STRIDE write meaningfully more secure code by default.

## Core concepts

### OWASP Top 10 (2021 edition; current as of 2026)

1. **Broken Access Control** — failure to enforce that the user can only do what they're permitted. Pattern: IDOR (insecure direct object reference) — user fetches `/orders/123` belonging to someone else. Fix: server-side authorization on every operation, never just URL-based.

2. **Cryptographic Failures** — sensitive data exposed due to weak crypto or no crypto. Examples: no TLS, weak hashes (MD5/SHA1 for passwords — use bcrypt/Argon2), hardcoded keys.

3. **Injection** — untrusted input executed as code. SQL injection, command injection, NoSQL injection, LDAP injection. Fix: parameterized queries; never string-concatenate user input.

4. **Insecure Design** — flaws in the design itself, not implementation. e.g., no rate limiting on password reset. Fix: threat-model before building.

5. **Security Misconfiguration** — defaults left on, debug enabled in prod, verbose error pages, S3 buckets public. Fix: secure defaults, hardening, CI scanning.

6. **Vulnerable & Outdated Components** — using a library with a CVE. Fix: dependency scanning (Dependabot, Snyk), SBOM, prompt patching.

7. **Identification & Authentication Failures** — weak auth: brute-forceable, no MFA, predictable session IDs, no lockout. Fix: standardize on well-tested libraries; force MFA for sensitive accounts.

8. **Software & Data Integrity Failures** — supply chain compromises, untrusted updates. Fix: signed packages, integrity checks, lockfiles.

9. **Security Logging & Monitoring Failures** — no logs of security events; detection delayed. Fix: log authn / authz / sensitive ops; alert on anomalies.

10. **Server-Side Request Forgery (SSRF)** — server fetches a URL controlled by attacker, hits internal services. Fix: allowlist of outbound destinations, never let user URL be fetched server-side directly.

### Common attack patterns

- **SQL injection**: `'; DROP TABLE users; --` → fix: parameterized queries.
- **XSS** (cross-site scripting): inject JS into a page rendered to others → fix: contextual escaping; CSP header.
- **CSRF** (cross-site request forgery): trick logged-in user's browser into making a request → fix: CSRF tokens, SameSite cookies.
- **IDOR**: `/orders/123` → access someone else's → fix: per-request authorization.
- **SSRF**: pass `http://169.254.169.254/` (AWS metadata) to a server URL fetcher → fix: deny internal IPs.
- **XXE** (XML external entities): inject `<!ENTITY xxe SYSTEM "file:///etc/passwd">` → fix: disable XXE in XML parser.

### Threat modeling — when

- Before building a new feature.
- When designing a new service or system.
- After significant architectural changes.
- During pen-test prep.

Cheap upfront; expensive after deployment.

### STRIDE

For each component, ask:
- **Spoofing**: can someone impersonate a user/service?
- **Tampering**: can data be modified in transit/storage?
- **Repudiation**: can someone deny having done something?
- **Information disclosure**: can data leak to unauthorized parties?
- **Denial of service**: can someone overload / break availability?
- **Elevation of privilege**: can someone gain rights they shouldn't have?

For each: list threats, severity, mitigations.

### Other frameworks

- **DREAD**: Damage, Reproducibility, Exploitability, Affected users, Discoverability — risk scoring.
- **PASTA**: Process for Attack Simulation and Threat Analysis.
- **OCTAVE**: enterprise-focused.

STRIDE is the most commonly taught.

### Data flow diagrams (DFD)

The standard artifact for threat modeling:
- **Entities** (external users, attackers).
- **Processes** (your services).
- **Data stores** (DBs, queues).
- **Data flows** (arrows with what crosses).
- **Trust boundaries** (where trust changes — usually where most threats hide).

For each flow crossing a trust boundary, apply STRIDE.

### Secure-by-design principles

- **Least privilege**: minimum perms needed.
- **Defense in depth**: multiple layers; one failure doesn't = breach.
- **Fail securely**: errors don't reveal info or grant access.
- **Don't trust input**: validate at every boundary.
- **Separate duties**: no one identity does everything.
- **Audit everything sensitive**.

### Security in CI/CD

- **SAST** (static analysis): scan code for issues (CodeQL, Semgrep).
- **DAST** (dynamic): run app, attack it (OWASP ZAP).
- **SCA** (software composition): scan dependencies (Snyk, Dependabot).
- **Secret scanning**: gitleaks, GitHub.
- **IaC scanning**: Checkov, tfsec for Terraform.
- **Container scanning**: Trivy, Clair for image CVEs.

Pre-merge: SAST + secret scanning. Pre-deploy: SCA + IaC + container scan. Periodic: DAST.

### Bug bounty

External researchers paid to find vulnerabilities. Programs: HackerOne, Bugcrowd. Tier rewards by severity. Complements internal security.

## How it works (threat modeling a new feature)

```
Feature: "Allow users to upload a profile photo."

DFD: User → Web App → File store (S3) → CDN → other users.

STRIDE:
- Spoofing: can another user upload to victim's profile? → Auth on upload.
- Tampering: can someone modify a photo in transit? → TLS.
- Repudiation: do we log uploads? → Audit log.
- Info disclosure: can a public photo URL be guessed? → unguessable IDs (UUIDs).
- DoS: can someone upload 10K huge files? → rate limit, max size.
- EoP: can the upload code be tricked into RCE (e.g., via crafted JPEG, ImageMagick CVE)? → use safe image library, sandbox processing.

Mitigations: auth, TLS, audit, UUID, rate limit + size cap, safe processor.
```

## Real-world examples

- **Equifax breach (2017)**: outdated Struts library — OWASP #6 (vulnerable components).
- **Target breach**: stolen HVAC vendor credentials → lateral movement. OWASP #1 + #7 + lack of segmentation.
- **SolarWinds**: supply chain attack — OWASP #8 (integrity failures).
- **Many AWS S3 leaks**: misconfigured public buckets — OWASP #5.

## Common pitfalls

- **No threat modeling for new features**: vulnerabilities discovered after launch.
- **Authorization in URL filters only**: bypassed easily.
- **Server-side state validation skipped** because "client validates": never trust client.
- **Verbose error messages** in prod (stack traces, SQL errors).
- **DEBUG=true in production**.
- **Hardcoded admin credentials**.
- **No CSP / HSTS / SameSite cookies**.
- **Dependencies never updated**.
- **CI/CD without security scans**.

## Interview questions

### Q1: Walk through OWASP Top 10.
(Run through them — see core concepts above.) Focus on top 3: broken access control, cryptographic failures, injection.

### Q2: What's STRIDE?
A taxonomy for threat modeling: Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation of privilege. For each component of the system, ask what each category of threat looks like — generates a structured list of risks and mitigations.

### Q3: How do you prevent SQL injection?
- **Parameterized queries / prepared statements**. Never string-concatenate user input into SQL.
- ORMs do this by default; raw SQL needs explicit care.
- Defense in depth: input validation, least-privilege DB users, monitor for anomalies.

### Q4: A user can change `/orders/123` to `/orders/124` and see someone else's order. What kind of bug?
**IDOR** (Insecure Direct Object Reference) — Broken Access Control (OWASP #1). Fix: server-side authorization on every request, not just URL filters. Check `WHERE order.id = ? AND order.user_id = current_user.id`. Don't rely on opaque IDs alone for security.

### Q5: How do you prevent SSRF?
- Allowlist outbound destinations (only known external APIs).
- Block private IP ranges (10.x, 172.16.x, 192.168.x, 169.254.169.254 for cloud metadata, ::1/128).
- Validate URL strictly before fetching.
- Network-level: egress restrictions from the service's VPC.

### Q6: Walk through a threat model for a password reset flow.
DFD: User → web → email → user (clicks link) → web → password change.
STRIDE:
- Spoofing: can attacker initiate reset for another user? → rate limit per email; don't reveal existence.
- Tampering: can the token be guessed/modified? → random 128-bit token, HMAC signed.
- Repudiation: log reset attempts.
- Info disclosure: emails go to right address (don't echo email in response).
- DoS: rate limit; CAPTCHA on excessive requests.
- EoP: token single-use, short TTL; verify on use.

### Q7: How do you handle vulnerable dependencies?
- SCA tool (Snyk, Dependabot, Trivy) in CI alerts on CVEs.
- Auto-PRs for patch versions; review for minor/major.
- SLA: critical CVE patched within 24h, high within 7 days.
- SBOM (software bill of materials) per release for tracking.
- For unmaintained deps: fork or replace.

### Q8: Design security in a CI/CD pipeline.
- **Pre-commit**: pre-commit hooks for secret scanning (gitleaks).
- **PR**: SAST (CodeQL, Semgrep), SCA (Snyk), IaC scanning (Checkov), secret scanning (GitHub).
- **Build**: container vuln scan (Trivy).
- **Pre-deploy**: integration tests + security gates (block on critical findings).
- **Post-deploy**: DAST (ZAP) periodic; runtime monitoring.
- Bug bounty for external coverage.

## TL;DR cheat sheet

- Top OWASP threats: broken access control, crypto failures, injection.
- **STRIDE** for threat modeling.
- DFDs + trust boundaries to find threats.
- Parameterized queries; never trust client.
- Authorization per request, not just URL.
- Defense in depth.
- Security in CI/CD: SAST + SCA + secret scanning + IaC + container.
- Patch dependencies.
- Threat-model before building, not after breach.

## Go deeper

- **OWASP Top 10**: [owasp.org/www-project-top-ten](https://owasp.org/www-project-top-ten/).
- **OWASP Cheat Sheets**: [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/).
- **Microsoft STRIDE docs**: [learn.microsoft.com/threat-modeling](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool).
- **Adam Shostack**: *Threat Modeling: Designing for Security* — definitive book.
- **Book**: *The Web Application Hacker's Handbook* — for offensive perspective.
- **Snyk, Semgrep, Trivy**: tooling docs.
- **Bug bounty platforms**: HackerOne, Bugcrowd for real-world findings.
