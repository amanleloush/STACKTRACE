# 64 — mTLS + Certificate Management

> Phase 9 • Production Craft • Topic 64/74

## Definition (interview-ready)

**mTLS (mutual TLS)** is TLS where **both** sides present certificates: the server proves its identity to the client (regular TLS) AND the client proves its identity to the server. **Certificate management** is the lifecycle of issuing, deploying, rotating, and revoking certs at scale — often automated via PKI infrastructure (Vault, AWS PCM, smallstep, cert-manager).

## Why it matters

Service-to-service identity at scale demands stronger auth than shared secrets or bearer tokens. mTLS gives you encryption + cryptographic identity in one step, with no central token issuer to fail. The hard part isn't TLS itself — it's the lifecycle: rotation, revocation, expiry monitoring.

## Core concepts

### Regular TLS recap

- Server has a certificate signed by a CA.
- Client verifies cert chains to a trusted CA.
- They negotiate a session key via ECDHE.
- Encryption + integrity + server identity.

(See Topic 1 for TLS handshake.)

### mTLS

Adds: client also presents a certificate (signed by a CA trusted by the server).

```
Client → Hello
Server → Hello + cert + key-exchange + cert-request
Client → cert + key-exchange + cert-verify
Both → derive session key
encrypted data ...
```

Now both sides are cryptographically identified.

### When mTLS shines

- **Service-to-service** inside a mesh (Istio, Linkerd auto-do this).
- **B2B APIs** with mutual identification.
- **IoT devices** authenticating to backend.
- **Database connections** (Postgres, etcd support mTLS).
- Zero-trust internal networks.

### vs bearer tokens

- Bearer token: anyone with the token is "authenticated" — token can be stolen, replayed (until rotation).
- mTLS: requires the private key, which never leaves the device. Stronger.
- Bearer is simpler to issue/revoke; mTLS requires PKI.

Modern systems often combine: mTLS for service identity + JWT for user identity carried in headers.

### PKI (Public Key Infrastructure)

- **Root CA**: trusted base; offline, rarely used directly.
- **Intermediate CA**: signs end-entity certs; rotated more often.
- **End-entity (leaf)** cert: actual cert for a service.
- **Chain of trust**: leaf → intermediate(s) → root.

Internal PKI: usually a private root CA, intermediates for each environment / region.

### Issuance

For services:
- **Manual**: openssl, hand-deploy. Doesn't scale.
- **Vault PKI**: HashiCorp Vault issues certs on demand.
- **AWS PCA**: Private Certificate Authority service.
- **cert-manager** (Kubernetes): issues certs via ACME or internal CA.
- **smallstep**: standalone PKI tool.
- **SPIFFE / SPIRE**: identity framework; SVIDs (SPIFFE Verifiable Identity Documents) as cert form.

### Rotation

Certificates expire. At scale:
- Short-lived certs (24h-7d) reduce risk if leaked.
- Automated rotation via cert-manager / Vault auto-renewal / SPIRE.
- Service must reload cert without restart (graceful).

### Revocation

If a cert is compromised before expiry:
- **CRL** (Certificate Revocation List): downloaded periodically, lists revoked serial numbers.
- **OCSP** (Online Certificate Status Protocol): real-time lookup per validation.
- **OCSP Stapling**: server stapled OCSP response to the handshake; client doesn't have to call.
- **Short cert lifetimes**: arguably the best revocation — just don't renew the compromised cert.

For internal PKI: prefer short lifetimes over CRL/OCSP. CRL/OCSP are operationally painful.

### Service mesh + mTLS

Istio / Linkerd inject sidecars that:
- Auto-issue identity via SPIFFE.
- Establish mTLS between sidecars transparently.
- Apps speak plain HTTP/gRPC to the local sidecar.
- Mesh control plane manages certs end-to-end.

This makes mTLS adoption painless for app developers.

### Trust bootstrapping

How does a service get its first cert?
- **Manual**: pre-shared root + private key.
- **Token-based**: short-lived token from an orchestrator (k8s service account, EC2 instance metadata).
- **Attestation**: TPM / Nitro Enclave attestation proves hardware identity.

In k8s: service account token → exchange for cert via SPIRE / cert-manager.

### Common cert formats

- **PEM**: text, `-----BEGIN CERTIFICATE-----`. Most common.
- **DER**: binary, raw.
- **PKCS#12 (.p12 / .pfx)**: cert + private key + chain in one file (often password-protected).

### TLS termination strategies

- **At LB only** (most common): client → LB (TLS) → backend (plaintext within VPC).
- **End-to-end**: client → LB (TLS) → backend (TLS). mTLS between LB and backend possible.
- **At sidecar**: app talks plain to sidecar; sidecar handles TLS externally.

Zero-trust: prefer end-to-end mTLS even inside the VPC.

## How it works (Istio auto-mTLS)

```
Pod A app → localhost (Envoy sidecar)
              Envoy A has SPIFFE identity cert auto-issued.
              Envoy A initiates mTLS to Envoy B.
              Both verify identities (SPIFFE IDs match expected).
              Encrypted tunnel established.
Envoy B → localhost (pod B app, plain)

App code: no changes. Mesh handles all crypto.
```

## Real-world examples

- **Istio + SPIRE**: enterprise zero-trust mesh.
- **Linkerd**: simpler service mesh with auto-mTLS.
- **Cloudflare Access**: mTLS for B2B portals.
- **AWS App Mesh**: managed service mesh with mTLS.
- **Google's BeyondCorp**: zero-trust architecture; identity-aware proxy.

## Common pitfalls

- **Forgotten cert expiry**: a cert expires at 3 AM Sunday → outage. Monitor + alert weeks ahead.
- **Manual cert deployment** at scale: 100 services × certs = chaos. Automate.
- **No chain on the server**: clients without intermediate trust fail. Always serve full chain.
- **Bypassing verification** during dev (`InsecureSkipVerify`): leaks into prod.
- **Same cert across regions/services**: blast radius huge if leaked.
- **No revocation strategy**: compromise = wait for expiry.
- **CRL/OCSP unavailable on cert validation paths**: hard fail vs soft fail tradeoff (soft fail = security gap; hard fail = availability issue).

## Interview questions

### Q1: Difference between TLS and mTLS?
TLS: server presents cert, client verifies. mTLS: client also presents cert; server verifies. Both sides cryptographically identified, not just the server. Used for service-to-service auth and B2B.

### Q2: Why use mTLS over bearer tokens for service-to-service auth?
Tokens are bearer credentials — anyone holding them can authenticate. They can be stolen (logs, memory dumps, MITM). mTLS requires the **private key**, which never leaves the host. Stronger identity binding, less leakable, and provides encryption in the same step.

### Q3: How would you handle cert rotation at scale?
Short-lived certs (1-7 days), auto-issued by cert-manager / Vault / SPIRE. Services reload certs without restart (graceful reload). Monitor expiry; alert weeks ahead. Use service mesh to abstract from apps. Test rotation regularly (chaos engineering).

### Q4: What is SPIFFE/SPIRE?
SPIFFE = standard for verifiable identity in distributed systems. SPIRE = implementation. Each workload gets a **SVID** (an X.509 cert or JWT) representing its SPIFFE ID (like `spiffe://example.com/ns/prod/sa/payment-service`). Solves "how do services know who they're talking to" with short-lived auto-rotated certs.

### Q5: Pros and cons of CRL vs OCSP vs short-lived certs.
CRL: downloaded periodically; large; stale. OCSP: real-time but adds RTT; OCSP servers can be unavailable. Short-lived certs: skip revocation entirely; compromised cert just expires soon. Modern internal PKI prefers short-lived certs — easier and more reliable than CRL/OCSP.

### Q6: How does a service mesh handle mTLS without app changes?
Each pod has a sidecar (Envoy). Apps talk plain HTTP to localhost (sidecar). Sidecars handle mTLS to other sidecars: cert issuance, rotation, verification. Mesh control plane provisions identities (e.g., via SPIRE). App code is unchanged; team gets zero-trust networking.

### Q7: A cert is leaked. What do you do?
- Revoke (if you have CRL/OCSP) or wait for expiry if short-lived.
- Rotate the underlying key.
- Issue new cert from current intermediate.
- Audit logs for misuse during window.
- If service identity affected: rotate dependent secrets too.
- If short-lived certs (~24h): the issue largely self-resolves; the bigger work is detecting the compromise.

### Q8: A handshake fails with "x509: certificate signed by unknown authority." Diagnose.
- Client doesn't have the issuer's root/intermediate CA in trust store.
- Server is serving cert without intermediates → client can't build chain.
- Cert is for a different domain (SAN mismatch).
- Cert expired.
- Cert was rotated but old cert still presented (stale config).
- Misconfigured trust store (using prod store in dev or vice versa).

## TL;DR cheat sheet

- **TLS** = server identity. **mTLS** = both sides identified.
- Use mTLS for service-to-service, B2B, IoT, internal zero-trust.
- Stronger than bearer tokens (key never leaks).
- **PKI**: root CA → intermediate → leaf. Internal PKI for service certs.
- **Cert lifecycle**: issue → deploy → rotate → expire. Automate everything.
- **Short-lived certs** > CRL/OCSP for internal PKI.
- **Service mesh** (Istio, Linkerd) auto-handles mTLS.
- **SPIFFE/SPIRE** for workload identity.
- Monitor cert expiry. Always serve full chain.

## Go deeper

- **Cloudflare**: ["What is mutual TLS?"](https://www.cloudflare.com/learning/access-management/what-is-mutual-tls/).
- **smallstep blog**: [smallstep.com/blog](https://smallstep.com/blog/) — excellent PKI content.
- **SPIFFE docs**: [spiffe.io](https://spiffe.io/docs/).
- **Istio docs**: [security](https://istio.io/latest/docs/concepts/security/).
- **HashiCorp Vault PKI**: [developer.hashicorp.com/vault/tutorials/secrets-management/pki-engine](https://developer.hashicorp.com/vault/tutorials/secrets-management/pki-engine).
- **cert-manager docs**: [cert-manager.io](https://cert-manager.io/).
- **Book**: *Bulletproof TLS and PKI* (Ivan Ristic).
