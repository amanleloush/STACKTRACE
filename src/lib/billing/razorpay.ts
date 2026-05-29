import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

let client: Razorpay | null = null;

/** Memoized Razorpay client. Reads RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET on
 *  first call; throws at request time if either is missing (mirrors the
 *  Google OAuth setup — misconfig surfaces fast, not silently). */
export function getRazorpayClient(): Razorpay {
  if (client) return client;
  const keyId = readEnv('RAZORPAY_KEY_ID');
  const keySecret = readEnv('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay not configured. Set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in .env.local. ' +
        'For local iteration without a Razorpay account, use the admin dev endpoint ' +
        '/api/admin/dev/fake-razorpay-event to simulate the lifecycle.',
    );
  }
  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

export function getPlanId(): string {
  const planId = readEnv('RAZORPAY_PLAN_ID');
  if (!planId) {
    throw new Error(
      'RAZORPAY_PLAN_ID missing. Create a plan in the Razorpay dashboard (test mode → Subscriptions → Plans) and paste the plan_xxx id into .env.local.',
    );
  }
  return planId;
}

export function getWebhookSecret(): string | undefined {
  return readEnv('RAZORPAY_WEBHOOK_SECRET');
}

/** HMAC-SHA256 signature verification per Razorpay's webhook spec.
 *  Returns true if the signature matches; false on any mismatch or
 *  missing input. timingSafeEqual is used so we don't leak via response
 *  timing. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

function readEnv(key: string): string | undefined {
  // import.meta.env first (Vite-substituted at build time), then process.env
  // for runtime overrides (e.g. wrangler secrets in prod, .env.local in dev).
  const meta = (import.meta.env as Record<string, string | undefined>)[key];
  if (meta && meta.length > 0) return meta;
  if (typeof process !== 'undefined' && process.env[key]) return process.env[key];
  return undefined;
}
