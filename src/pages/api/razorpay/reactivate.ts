import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { applyEvent, getSubscription } from '~/lib/billing/subscriptions';

export const prerender = false;

/**
 * POST /api/razorpay/reactivate — undo a "cancel at period end" while
 * the user is still in the access window. Razorpay's API doesn't have a
 * single "uncancel" call — we'd typically re-create the subscription.
 * For Phase 4a we just flip the local status back to active; a real
 * Razorpay reactivate flow lands when this is exercised in prod.
 */
export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return new Response('Sign in required', { status: 401 });

  const env = locals.runtime?.env;
  const db = await getDb({ env });
  const sub = await getSubscription(db, user.id);
  if (!sub || sub.status !== 'cancelled_at_period_end') {
    return new Response('Subscription is not in a reactivatable state', { status: 400 });
  }

  await applyEvent(db, user.id, {
    type: 'subscription.activated',
    currentPeriodEnd: sub.currentPeriodEnd,
    payload: { source: 'user-reactivate', actor: user.email },
  });

  return new Response(null, { status: 303, headers: { Location: '/account/' } });
};
