import type { APIRoute } from 'astro';
import { getRazorpayClient, getPlanId } from '~/lib/billing/razorpay';

export const prerender = false;

interface RazorpaySubscriptionsAPI {
  create(opts: {
    plan_id: string;
    total_count?: number;
    customer_notify?: 0 | 1;
    notes?: Record<string, string>;
  }): Promise<{ id: string; status: string }>;
}

/**
 * Creates a Razorpay subscription for the signed-in user and returns
 * the id back to the /pricing/ page so the JS Checkout modal can open
 * it. Real activation comes via the webhook
 * (/api/razorpay/webhook → applyEvent).
 *
 * notes.user_id is the bridge — the webhook reads it back to find
 * who this subscription belongs to. plan_id comes from
 * RAZORPAY_PLAN_ID (set once in the Razorpay dashboard).
 */
export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return new Response('Sign in required', { status: 401 });

  let planId: string;
  let client: ReturnType<typeof getRazorpayClient>;
  try {
    client = getRazorpayClient();
    planId = getPlanId();
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }

  const subs = (client as unknown as { subscriptions: RazorpaySubscriptionsAPI }).subscriptions;
  let created: { id: string; status: string };
  try {
    created = await subs.create({
      plan_id: planId,
      total_count: 12,           // 12 billing cycles, then auto-completes
      customer_notify: 1,
      notes: { user_id: user.id, email: user.email },
    });
  } catch (e) {
    console.error('[razorpay-checkout] subscription create failed:', e);
    return new Response('Razorpay rejected the subscription create call', { status: 502 });
  }

  return new Response(
    JSON.stringify({
      subscription_id: created.id,
      key_id:
        import.meta.env.RAZORPAY_KEY_ID ??
        (typeof process !== 'undefined' ? process.env.RAZORPAY_KEY_ID : undefined),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
