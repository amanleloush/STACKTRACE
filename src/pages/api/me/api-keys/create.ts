import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { mintApiKey } from '~/lib/api/keys';

export const prerender = false;

/**
 * POST /api/me/api-keys/create — mint a new API key for the signed-in user.
 * Reads `name` (required, max 64 chars) and `daily_quota` (1..100000, default
 * 1000) from FormData. Redirects with 303 back to /account/api-keys/ with the
 * freshly-minted full bearer token as `just_minted` so the page can display
 * the one-time copy panel.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return new Response('Sign in required', { status: 401 });

  const form = await request.formData();
  const rawName = form.get('name');
  const name = typeof rawName === 'string' ? rawName.trim().slice(0, 64) : '';
  if (!name) return new Response('Name is required', { status: 400 });

  const rawQuota = form.get('daily_quota');
  let dailyQuota = 1000;
  if (typeof rawQuota === 'string' && rawQuota.length > 0) {
    const n = Number.parseInt(rawQuota, 10);
    if (Number.isFinite(n)) {
      dailyQuota = Math.max(1, Math.min(100000, n));
    }
  }

  const env = locals.runtime?.env;
  const db = await getDb({ env });
  const { full } = await mintApiKey(db, user.id, name, dailyQuota);

  const location = `/account/api-keys/?just_minted=${encodeURIComponent(full)}`;
  return new Response(null, { status: 303, headers: { Location: location } });
};
