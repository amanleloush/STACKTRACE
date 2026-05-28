# 43 — HLD: Payment System (Idempotent Transfer)

> Phase 7 • HLD Problems • Topic 43/74

## Problem statement

Design a payment system that processes money movement (debit A, credit B) with strict correctness — no double charges, no lost transfers, full auditability, even under retries and partial failures.

## Requirements

### Functional
- Authorize, capture, refund, void.
- Multiple payment methods (cards, wallets, bank transfers).
- Idempotent — safe to retry.
- Multi-currency.
- Settlement & reconciliation with providers.

### Non-functional
- **Correctness above all** — never double-charge, never lose a transfer.
- High availability — payment is the business.
- Strong consistency where money is moved.
- Auditability — every state change persisted, immutable.
- Latency: p99 < 500 ms for synchronous flows.

## Scale estimation

- 10M txns/day = ~120 txns/sec average, ~500 peak.
- Plus: webhook callbacks from providers, reconciliation events.

## High-level architecture

```
                ┌──────────────┐
   Merchant ──► │   API GW     │ ──► AuthN + rate limit + idem key
                └──────┬───────┘
                       ▼
                ┌──────────────┐
                │ Payment Svc  │ ── saga orchestrator
                └──┬─────┬─────┘
                   ▼     ▼
            ┌──────────┐ ┌──────────┐
            │ Ledger   │ │ Vault    │ (PCI-scoped)
            │  Service │ │ (card    │
            └──────────┘ │ tokens)  │
                         └──────────┘
                   │
                   ▼
            ┌──────────────┐
            │ Provider     │ (Stripe / Adyen / banks)
            │  Adapters    │
            └──────────────┘
```

## Detailed design

### Idempotency

Every mutation API takes an `Idempotency-Key`:
1. Lookup in idempotency store (Redis or Postgres with unique constraint).
2. If exists: return the previous response — no new action.
3. If not: execute, store the response keyed by the idempotency key, return.

Window: 24h+. Forwarded to upstream providers as their idempotency key too (Stripe, Adyen support this).

### Ledger (double-entry bookkeeping)

Every money movement = two entries (debit one account, credit another), atomic.

```sql
CREATE TABLE ledger_entries (
  id            BIGSERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL,
  account_id    UUID NOT NULL,
  amount        BIGINT NOT NULL,    -- positive=credit, negative=debit
  currency      CHAR(3) NOT NULL,
  created_at    TIMESTAMP NOT NULL,
  meta          JSONB
);
CREATE INDEX ON ledger_entries (transaction_id);
CREATE INDEX ON ledger_entries (account_id, created_at);
```

For each transfer:
```
BEGIN;
  INSERT INTO ledger_entries (transaction_id, account=user_42, amount=-1000, ...);
  INSERT INTO ledger_entries (transaction_id, account=merchant_99, amount=+1000, ...);
COMMIT;
```

Account balance = sum of entries. Materialized in a `balances` table for fast reads.

**Invariant**: per transaction, sum of entries = 0. Easily checked.

### Saga for end-to-end transfer

```
1. Authorize: call provider to put a hold on the card.
2. Capture: capture authorized amount (deducts).
3. Settle: provider transfers money over days.

Compensations:
- If capture fails → release authorization (void).
- If post-capture refund needed → refund flow.
```

State machine in a saga orchestrator (Temporal). Each step is idempotent.

### State machine

```
NEW → AUTHORIZED → CAPTURED → SETTLED
   ↓
   FAILED  →  (terminal)
   ↓
   VOIDED  →  (terminal)
   ↓
   REFUNDED
```

Persisted with every state change.

### Provider integration

- Adapter per provider (Stripe, Adyen, local banks).
- Common interface; adapter handles provider quirks.
- Idempotency keys passed through.
- Webhooks consumed for async status updates.

### Webhooks

Providers send async events: "payment_succeeded," "payment_failed," "chargeback."

- Verify signature (HMAC, JWS).
- Idempotency: provider event IDs deduped.
- Apply state change in ledger / payment state.
- Acknowledge — provider retries until acked.

### Reconciliation

- Daily: pull provider's report, compare with our ledger.
- Discrepancies (we say settled, they don't, or vice versa) → reconciliation queue.
- Manual or automated fixes.
- Critical: missing money is a P0.

### Compliance: PCI DSS

- Card data NEVER stored in plaintext.
- Tokenized via provider (Stripe Token) or in our own vault (separate strict env).
- App tier sees only tokens (`tok_xxx`).
- Vault is isolated network, audited, encrypted.

### Multi-currency

- Store amounts as integer minor units (cents) + ISO currency code.
- FX done by provider; we record both source and converted amounts.

## Bottlenecks & optimizations

- **Hot account** (a popular merchant): high write concurrency on their balance row. Use:
  - Atomic increments (not read-then-write).
  - Sharded counter (split balance into N partitions, sum on read).
- **Synchronous provider calls**: typical 200-500 ms. Don't block user-facing requests longer than needed; capture sync, settle async.
- **Saga orchestrator load**: Temporal/Cadence scale horizontally.
- **Ledger size**: append-only grows fast. Partition by date; archive cold months.

## Trade-offs

- **Sync vs async to provider**: sync for user-facing auth (need answer); async for settlement.
- **Strong vs eventual consistency**: ledger needs strong consistency (transactions); balance materialized view can be eventually consistent.
- **In-house ledger vs SaaS**: many startups use Stripe/Adyen end-to-end; bigger companies build their own ledger for control + cost.

## Interview questions

### Q1: How do you guarantee no double charges?
Idempotency keys on every mutation. Stored in a dedupe table with the response. Retries return cached response. Forward the same key to the upstream provider so they dedupe too.

### Q2: Why double-entry bookkeeping?
Every money movement is two entries: debit + credit. Sum per transaction = 0 (invariant). Account balance = sum of its entries. Auditable, balances are derivable, errors are detectable.

### Q3: Walk through a payment saga.
Authorize (provider hold) → Capture (provider takes money) → Settle (provider deposits). State persisted between steps. Compensations: void (if capture fails) or refund (if needed post-capture). All steps idempotent.

### Q4: How do you handle a provider webhook arriving twice?
Dedupe by provider's event ID. Idempotent state machine — applying "captured" twice is a no-op if already captured. Acknowledge after applying.

### Q5: Reconciliation strategy?
Daily pull of provider's transaction report. Diff against our ledger. Discrepancies → reconciliation queue; ops team investigates. Common cases: webhook lost, state out of sync, fraud-related reversal we didn't process.

### Q6: How would you store sensitive card data?
Don't, if you can avoid it. Use provider tokenization (Stripe, Adyen). If you must, build a separate PCI-scoped vault: encrypted-at-rest, encrypted-in-transit, separate network, narrow API, audit logs. App tier sees only tokens.

### Q7: A bug double-credits an account. How do you recover?
- **Investigate**: find the entries; verify it's a double credit (not legitimate).
- **Reverse**: insert a compensating entry (debit) with a clear `reason` field linking to the bug ticket.
- **Audit log**: every change traceable.
- **Communicate**: inform user / merchant.
- **Prevent**: fix the bug; add idempotency at the source; add a balance invariant check.

### Q8: How to handle a sudden 10× spike in payments?
- Async provider calls where possible (defer settlement).
- Horizontal scale of payment service + orchestrator.
- Database read replicas for read-heavy operations (balances, history).
- Rate-limit at the API edge to protect downstream provider quotas.
- Pre-warm caches.

## TL;DR cheat sheet

- **Idempotency keys** everywhere: dedupe table with cached responses.
- **Double-entry ledger**: every transfer = debit + credit, atomic.
- **Saga state machine**: authorize → capture → settle, with compensations.
- **Idempotent webhooks**: dedupe by provider event ID.
- **PCI-scoped vault** for sensitive data; use tokens elsewhere.
- **Reconciliation**: daily diff with provider.
- **Hot account sharding** for high-volume merchants.
- Audit log every state change.

## Go deeper

- **Stripe Engineering**: [idempotency](https://stripe.com/blog/idempotency), [reconciliation](https://stripe.com/blog), payment-system architecture posts.
- **Square engineering**: payment flow + saga posts.
- **Adyen engineering blog**: payment architecture.
- **DDIA Chapter 11** — stream processing + correctness.
- **Book**: *Building Event-Driven Microservices* — saga and event patterns for finance.
- **PCI DSS** standards: brief read for scope and impact.
