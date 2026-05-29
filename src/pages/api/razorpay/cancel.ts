import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { getRazorpayClient } from '~/lib/billing/razorpay';
import { applyEvent, getSubscription } from '~/lib/billing/subscriptions';

export const prerender = false;

interface RazorpaySubsAPI {
  cancel(
    subscriptionId: string,
    opts?: { cancel_at_cycle_end?: 0 | 1 },
  ): Promise<{ id: string; status: string; end_at?: number }>;
}

/**
 * POST /api/razorpay/cancel — user-initiated cancel. Defaults to
 * cancel_at_cycle_end=1 so access continues through the current period.
 * We optimistically apply the local state transition; the webhook
 * (subscription.cancelled with end_at > now) will reconcile.
 */
export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return new Response('Sign in required', { status: 401 });

  const env = locals.runtime?.env;
  const db = await getDb({ env });
  const sub = await getSubscription(db, user.id);
  if (!sub?.razorpaySubscriptionId) {
    return new Response('No subscription to cancel', { status: 400 });
  }

  try {
    const subs = (getRazorpayClient() as unknown as { subscriptions: RazorpaySubsAPI }).subscriptions;
    await subs.cancel(sub.razorpaySubscriptionId, { cancel_at_cycle_end: 1 });
  } catch (e) {
    // If Razorpay isn't configured (dev), still apply the local transition —
    // matches the dev fake-event flow.
    console.warn('[razorpay-cancel] Razorpay call failed, applying local transition only:', e);
  }

  await applyEvent(db, user.id, {
    type: 'subscription.cancelled',
    atCycleEnd: true,
    payload: { source: 'user-cancel', actor: user.email },
  });

  return new Response(null, { status: 303, headers: { Location: '/account/' } });
};
