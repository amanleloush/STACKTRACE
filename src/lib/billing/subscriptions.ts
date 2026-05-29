import type { Db } from '~/lib/db';

/* ---------------------------------------------------------------- */
/* Types                                                            */
/* ---------------------------------------------------------------- */

export type Tier = 'free' | 'pro';

/**
 * Subscription lifecycle states (plan §14d).
 * - trialing               : pre-paid trial window before the first charge
 * - active                 : current and paid up
 * - past_due               : last renewal failed; Razorpay is retrying
 *                            during its internal grace window. tier stays
 *                            'pro' here — user retains access during grace.
 * - paused                 : user manually paused (rare; mirrors RZP)
 * - cancelled_at_period_end: user cancelled; access until current_period_end
 * - cancelled              : terminal. tier='free'.
 */
export type SubStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled_at_period_end'
  | 'cancelled';

/**
 * High-level event types our state machine accepts. The webhook handler
 * maps Razorpay's raw event names onto these; the dev fake-event endpoint
 * issues them directly so we can drive the lifecycle locally.
 */
export type SubEventType =
  | 'subscription.activated'   // initial signup or reactivation after pause
  | 'subscription.charged'     // successful renewal payment
  | 'payment.failed'           // a charge attempt failed (→ past_due, grace)
  | 'subscription.halted'      // Razorpay gave up after grace → cancelled/free
  | 'subscription.cancelled'   // user/admin cancel. atCycleEnd controls timing.
  | 'subscription.paused'      // user paused
  | 'subscription.completed';  // ran out of total_count → natural end

export interface ApplyEventOpts {
  type: SubEventType;
  /** Razorpay's unique event id. Used for idempotency. Optional for dev/internal events. */
  razorpayEventId?: string;
  /** For subscription.cancelled — true means "at period end", false means immediate. */
  atCycleEnd?: boolean;
  /** When subscription.activated / charged sets a new period end. Unix seconds. */
  currentPeriodEnd?: number | null;
  /** When the subscription gets a Razorpay id (first activation). */
  razorpaySubscriptionId?: string | null;
  /** Raw event payload for audit. JSON-stringified into subscription_events.payload. */
  payload?: unknown;
}

export interface SubscriptionRow {
  userId: string;
  razorpaySubscriptionId: string | null;
  tier: Tier;
  status: SubStatus;
  currentPeriodEnd: number | null;
}

/* ---------------------------------------------------------------- */
/* DB row helpers                                                   */
/* ---------------------------------------------------------------- */

interface DbRow {
  user_id: string;
  razorpay_subscription_id: string | null;
  tier: string;
  status: string;
  current_period_end: number | null;
}

function hydrate(row: DbRow): SubscriptionRow {
  return {
    userId: row.user_id,
    razorpaySubscriptionId: row.razorpay_subscription_id,
    tier: row.tier === 'pro' ? 'pro' : 'free',
    status: row.status as SubStatus,
    currentPeriodEnd: row.current_period_end,
  };
}

export async function getSubscription(db: Db, userId: string): Promise<SubscriptionRow | null> {
  const row = await db.first<DbRow>('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
  return row ? hydrate(row) : null;
}

export async function setSubscription(
  db: Db,
  userId: string,
  patch: Partial<Omit<SubscriptionRow, 'userId'>>,
): Promise<void> {
  const existing = await getSubscription(db, userId);
  if (!existing) {
    await db.run(
      `INSERT INTO subscriptions
         (user_id, razorpay_subscription_id, tier, status, current_period_end)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        patch.razorpaySubscriptionId ?? null,
        patch.tier ?? 'free',
        patch.status ?? 'active',
        patch.currentPeriodEnd ?? null,
      ],
    );
    return;
  }
  const merged: SubscriptionRow = { ...existing, ...patch, userId };
  await db.run(
    `UPDATE subscriptions SET
       razorpay_subscription_id = ?,
       tier = ?,
       status = ?,
       current_period_end = ?
     WHERE user_id = ?`,
    [
      merged.razorpaySubscriptionId,
      merged.tier,
      merged.status,
      merged.currentPeriodEnd,
      userId,
    ],
  );
}

/* ---------------------------------------------------------------- */
/* State machine                                                    */
/* ---------------------------------------------------------------- */

interface Transition {
  status: SubStatus;
  tier: Tier;
}

/**
 * Apply an event to the user's subscription row.
 * Idempotent: razorpayEventId is recorded in webhook_events; a second
 * delivery of the same id is a no-op.
 *
 * Returns the new row, or `null` if the event was a duplicate.
 */
export async function applyEvent(
  db: Db,
  userId: string,
  event: ApplyEventOpts,
): Promise<SubscriptionRow | null> {
  // Idempotency check — Razorpay re-delivers on uncertain ack.
  if (event.razorpayEventId) {
    const dup = await db.first<{ event_id: string }>(
      'SELECT event_id FROM webhook_events WHERE event_id = ?',
      [event.razorpayEventId],
    );
    if (dup) return null;
  }

  const before = (await getSubscription(db, userId)) ?? {
    userId,
    razorpaySubscriptionId: null,
    tier: 'free' as Tier,
    status: 'cancelled' as SubStatus, // synthetic — never been subscribed
    currentPeriodEnd: null,
  };

  const next = nextState(before.status, event);
  const patch: Partial<SubscriptionRow> = {
    status: next.status,
    tier: next.tier,
  };
  if (event.currentPeriodEnd !== undefined) patch.currentPeriodEnd = event.currentPeriodEnd;
  if (event.razorpaySubscriptionId !== undefined) {
    patch.razorpaySubscriptionId = event.razorpaySubscriptionId;
  }
  await setSubscription(db, userId, patch);

  const now = Math.floor(Date.now() / 1000);
  if (event.razorpayEventId) {
    await db.run(
      'INSERT INTO webhook_events (event_id, source, received_at) VALUES (?, ?, ?)',
      [event.razorpayEventId, 'razorpay', now],
    );
  }
  await db.run(
    `INSERT INTO subscription_events
       (user_id, razorpay_event_id, event_type, old_status, new_status, old_tier, new_tier, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      event.razorpayEventId ?? null,
      event.type,
      before.status,
      next.status,
      before.tier,
      next.tier,
      event.payload === undefined ? null : JSON.stringify(event.payload),
      now,
    ],
  );

  return (await getSubscription(db, userId))!;
}

/**
 * Pure state-machine transition. Encodes plan §14d so the test matrix
 * can verify each (current state × event type) → (next state, tier)
 * combination without touching the DB.
 */
export function nextState(current: SubStatus, event: ApplyEventOpts): Transition {
  switch (event.type) {
    case 'subscription.activated':
    case 'subscription.charged':
      return { status: 'active', tier: 'pro' };

    case 'payment.failed':
      // First failed renewal moves to past_due (grace) but tier stays pro
      // — Razorpay retries internally. We only flip to free on .halted.
      return { status: 'past_due', tier: 'pro' };

    case 'subscription.halted':
      return { status: 'cancelled', tier: 'free' };

    case 'subscription.cancelled':
      // Two flavors: cancel-at-cycle-end keeps access until period end;
      // immediate-cancel drops access right away.
      if (event.atCycleEnd) {
        return { status: 'cancelled_at_period_end', tier: 'pro' };
      }
      return { status: 'cancelled', tier: 'free' };

    case 'subscription.paused':
      return { status: 'paused', tier: 'free' };

    case 'subscription.completed':
      // total_count exhausted — natural end. tier drops.
      return { status: 'cancelled', tier: 'free' };

    default:
      return { status: current, tier: 'free' };
  }
}
