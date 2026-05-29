import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDevDb } from '~/lib/db.dev';
import { runMigrations } from '~/lib/migrate';
import {
  applyEvent,
  getSubscription,
  nextState,
  type SubStatus,
  type SubEventType,
} from '~/lib/billing/subscriptions';
import { getEntitlement } from '~/lib/billing/entitlement';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS = path.join(REPO, 'migrations');

async function freshDb() {
  const db = makeDevDb(':memory:');
  await runMigrations(db, MIGRATIONS);
  await db.run(
    `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    ['u1', 'g-1', 'user@test.com', 'user', 1],
  );
  return db;
}

describe('subscription state machine — pure transitions', () => {
  type Case = [SubStatus, SubEventType, SubStatus, 'free' | 'pro'];
  const matrix: Case[] = [
    ['cancelled', 'subscription.activated', 'active', 'pro'],
    ['active', 'subscription.charged', 'active', 'pro'],
    ['past_due', 'subscription.charged', 'active', 'pro'],
    ['active', 'payment.failed', 'past_due', 'pro'],
    ['past_due', 'subscription.halted', 'cancelled', 'free'],
    ['active', 'subscription.paused', 'paused', 'free'],
    ['active', 'subscription.completed', 'cancelled', 'free'],
  ];
  for (const [from, event, toStatus, toTier] of matrix) {
    it(`${from} + ${event} → ${toStatus}/${toTier}`, () => {
      const r = nextState(from, { type: event });
      expect(r.status).toBe(toStatus);
      expect(r.tier).toBe(toTier);
    });
  }

  it('subscription.cancelled (immediate) → cancelled/free', () => {
    expect(nextState('active', { type: 'subscription.cancelled' })).toEqual({
      status: 'cancelled',
      tier: 'free',
    });
  });

  it('subscription.cancelled (atCycleEnd) → cancelled_at_period_end/pro', () => {
    expect(nextState('active', { type: 'subscription.cancelled', atCycleEnd: true })).toEqual({
      status: 'cancelled_at_period_end',
      tier: 'pro',
    });
  });
});

describe('applyEvent integration', () => {
  it('upserts a subscription row on first event', async () => {
    const db = await freshDb();
    const r = await applyEvent(db, 'u1', { type: 'subscription.activated', currentPeriodEnd: 9_000_000_000 });
    expect(r?.status).toBe('active');
    expect(r?.tier).toBe('pro');
    expect(r?.currentPeriodEnd).toBe(9_000_000_000);
  });

  it('idempotent — duplicate razorpayEventId is a no-op', async () => {
    const db = await freshDb();
    const a = await applyEvent(db, 'u1', { type: 'subscription.activated', razorpayEventId: 'evt-1' });
    expect(a).not.toBeNull();
    const b = await applyEvent(db, 'u1', { type: 'subscription.cancelled', razorpayEventId: 'evt-1' });
    expect(b).toBeNull(); // deduped — second event of same id ignored
    const sub = await getSubscription(db, 'u1');
    expect(sub?.status).toBe('active'); // unchanged
  });

  it('audit log captures every transition', async () => {
    const db = await freshDb();
    await applyEvent(db, 'u1', { type: 'subscription.activated', razorpayEventId: 'evt-1' });
    await applyEvent(db, 'u1', { type: 'payment.failed', razorpayEventId: 'evt-2' });
    await applyEvent(db, 'u1', { type: 'subscription.halted', razorpayEventId: 'evt-3' });
    const events = await db.query<{ event_type: string; old_status: string; new_status: string }>(
      'SELECT event_type, old_status, new_status FROM subscription_events ORDER BY id',
    );
    expect(events.map((e) => `${e.old_status}→${e.new_status}`)).toEqual([
      'cancelled→active',
      'active→past_due',
      'past_due→cancelled',
    ]);
  });

  it('user-cancel atCycleEnd leaves user on pro until period_end', async () => {
    const db = await freshDb();
    const future = Math.floor(Date.now() / 1000) + 86400;
    await applyEvent(db, 'u1', { type: 'subscription.activated', currentPeriodEnd: future });
    await applyEvent(db, 'u1', { type: 'subscription.cancelled', atCycleEnd: true });
    const tier = await getEntitlement(db, 'u1');
    expect(tier).toBe('pro');
  });

  it('user-cancel atCycleEnd flips to free once period_end is in the past', async () => {
    const db = await freshDb();
    const past = Math.floor(Date.now() / 1000) - 86400;
    // Manually set the row in cancelled_at_period_end with past current_period_end
    await db.run(
      `INSERT INTO subscriptions (user_id, tier, status, current_period_end)
       VALUES ('u1', 'pro', 'cancelled_at_period_end', ?)`,
      [past],
    );
    const tier = await getEntitlement(db, 'u1');
    expect(tier).toBe('free');
  });
});
