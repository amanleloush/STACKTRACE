import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { applyEvent, type SubEventType } from '~/lib/billing/subscriptions';

export const prerender = false;

const VALID_EVENTS: SubEventType[] = [
  'subscription.activated',
  'subscription.charged',
  'payment.failed',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.paused',
  'subscription.completed',
];

/**
 * Dev-only Razorpay event simulator. Drives the full subscription
 * lifecycle locally without provisioning a Razorpay account.
 *
 * Gated three ways:
 *  1. import.meta.env.PROD must be false
 *  2. middleware already 404'd non-admins
 *  3. defense-in-depth: re-check role here
 *
 * Form params:
 *   userId   — target user (defaults to caller)
 *   type     — one of VALID_EVENTS
 *   atCycleEnd — '1' to flag a cancel as at-period-end (default immediate)
 *   periodDaysFromNow — for activated/charged, sets current_period_end (default 30)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (import.meta.env.PROD) return new Response('Not found', { status: 404 });
  const user = locals.user;
  if (user?.role !== 'admin') return new Response('Not found', { status: 404 });

  const form = await request.formData();
  const targetUserId = String(form.get('userId') ?? user.id);
  const type = String(form.get('type') ?? '') as SubEventType;
  const atCycleEnd = form.get('atCycleEnd') === '1';
  const periodDays = Number(form.get('periodDaysFromNow') ?? '30');

  if (!VALID_EVENTS.includes(type)) {
    return new Response(`invalid event type: ${type}`, { status: 400 });
  }

  const env = locals.runtime?.env;
  const db = await getDb({ env });

  const now = Math.floor(Date.now() / 1000);
  const currentPeriodEnd =
    type === 'subscription.activated' || type === 'subscription.charged'
      ? now + Math.max(1, periodDays) * 86400
      : undefined;

  const eventId = `dev_${type}_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const result = await applyEvent(db, targetUserId, {
    type,
    razorpayEventId: eventId,
    razorpaySubscriptionId: `dev_sub_${targetUserId}`,
    atCycleEnd,
    currentPeriodEnd,
    payload: { source: 'dev-fake-event', actor: user.email, type },
  });

  return new Response(
    JSON.stringify({
      ok: true,
      eventId,
      applied: result !== null,
      subscription: result,
    }, null, 2),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};

// GET responds with a tiny diagnostic form so admins can poke the
// lifecycle without firing curl by hand.
export const GET: APIRoute = async ({ locals }) => {
  if (import.meta.env.PROD) return new Response('Not found', { status: 404 });
  if (locals.user?.role !== 'admin') return new Response('Not found', { status: 404 });

  const body = `<!doctype html><html><head><title>Dev Razorpay event simulator</title>
<style>body{font:14px/1.5 system-ui;max-width:42rem;margin:3rem auto;padding:0 1rem}
form{display:grid;gap:0.5rem;padding:1rem;border:1px solid #ccc;border-radius:8px}
label{display:flex;flex-direction:column;gap:0.2rem;font-size:0.85rem}
input,select{padding:0.4rem;border:1px solid #ccc;border-radius:4px}
button{padding:0.5rem 1rem;background:#4f46e5;color:white;border:none;border-radius:4px;cursor:pointer}</style>
</head><body>
<h1>Dev Razorpay event simulator</h1>
<p>Signed in as <strong>${locals.user.email}</strong> (admin). This endpoint refuses in production.</p>
<form action="/api/admin/dev/fake-razorpay-event" method="post">
  <label>Target user id<input name="userId" placeholder="usr_…  (default: yourself)"/></label>
  <label>Event type
    <select name="type">${VALID_EVENTS.map((e) => `<option>${e}</option>`).join('')}</select>
  </label>
  <label><input type="checkbox" name="atCycleEnd" value="1"/> cancel at cycle end (only meaningful for subscription.cancelled)</label>
  <label>Period days from now (for activated/charged)<input name="periodDaysFromNow" type="number" value="30"/></label>
  <button type="submit">Fire event</button>
</form>
<p style="margin-top:1rem;color:#666">After firing, check <a href="/api/whoami">/api/whoami</a>, <a href="/account/">/account/</a>, or the audit log: <code>SELECT * FROM subscription_events ORDER BY created_at DESC LIMIT 5</code>.</p>
</body></html>`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
