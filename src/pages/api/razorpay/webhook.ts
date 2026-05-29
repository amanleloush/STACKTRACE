import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { applyEvent, type SubEventType } from '~/lib/billing/subscriptions';
import { getWebhookSecret, verifyWebhookSignature } from '~/lib/billing/razorpay';

export const prerender = false;

/**
 * Razorpay webhook receiver. Maps the raw event names onto our
 * SubEventType vocabulary, finds the user via the `notes.user_id`
 * we attach at subscription-create time, and runs applyEvent.
 *
 * Idempotency lives in applyEvent (webhook_events table).
 * Signature verify per Razorpay's spec: HMAC-SHA256(rawBody, secret)
 * compared to the X-Razorpay-Signature header.
 */
const EVENT_MAP: Record<string, SubEventType> = {
  'subscription.activated': 'subscription.activated',
  'subscription.charged': 'subscription.charged',
  'subscription.completed': 'subscription.completed',
  'subscription.cancelled': 'subscription.cancelled',
  'subscription.halted': 'subscription.halted',
  'subscription.paused': 'subscription.paused',
  'subscription.resumed': 'subscription.activated',
  'payment.failed': 'payment.failed',
};

interface RazorpayEntity {
  id?: string;
  notes?: Record<string, string>;
  current_end?: number;
  end_at?: number;
  status?: string;
  // For 'cancelled' events, RZP may not include a flag — we infer from
  // the entity's `status` (cancelled_at_period_end has its own value).
}

interface RazorpayEnvelope {
  id?: string;
  event?: string;
  payload?: {
    subscription?: { entity?: RazorpayEntity };
    payment?: { entity?: RazorpayEntity & { subscription_id?: string } };
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  const secret = getWebhookSecret();

  if (!secret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET missing — refusing event');
    return new Response('webhook not configured', { status: 500 });
  }
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return new Response('invalid signature', { status: 400 });
  }

  let body: RazorpayEnvelope;
  try {
    body = JSON.parse(rawBody) as RazorpayEnvelope;
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const rzpEventName = body.event ?? '';
  const mappedType = EVENT_MAP[rzpEventName];
  if (!mappedType) {
    // Ack unknown event types so RZP doesn't redeliver forever.
    return new Response('ack (unknown event)', { status: 200 });
  }

  const subEntity = body.payload?.subscription?.entity;
  const payEntity = body.payload?.payment?.entity;
  const userId = subEntity?.notes?.user_id ?? payEntity?.notes?.user_id;
  if (!userId) {
    console.error('[razorpay-webhook] no user_id in notes — dropping event', rzpEventName);
    return new Response('ack (no user_id)', { status: 200 });
  }

  const env = locals.runtime?.env;
  const db = await getDb({ env });

  const atCycleEnd =
    mappedType === 'subscription.cancelled' &&
    subEntity?.status === 'cancelled' &&
    subEntity?.end_at != null &&
    subEntity.end_at > Math.floor(Date.now() / 1000);

  const result = await applyEvent(db, userId, {
    type: mappedType,
    razorpayEventId: body.id,
    razorpaySubscriptionId: subEntity?.id ?? payEntity?.subscription_id,
    currentPeriodEnd: subEntity?.current_end ?? subEntity?.end_at ?? null,
    atCycleEnd,
    payload: body,
  });

  return new Response(
    JSON.stringify({ ok: true, dedup: result === null }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
