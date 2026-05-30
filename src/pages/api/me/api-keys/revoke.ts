import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { revokeApiKey } from '~/lib/api/keys';

export const prerender = false;

/**
 * POST /api/me/api-keys/revoke — revoke one of the signed-in user's API keys.
 * Reads `id` from FormData. Redirects with 303 back to /account/api-keys/.
 * Idempotent — `revokeApiKey` no-ops if the key is already revoked or owned
 * by a different user.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return new Response('Sign in required', { status: 401 });

  const form = await request.formData();
  const rawId = form.get('id');
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!id) return new Response('id is required', { status: 400 });

  const env = locals.runtime?.env;
  const db = await getDb({ env });
  await revokeApiKey(db, user.id, id);

  return new Response(null, {
    status: 303,
    headers: { Location: '/account/api-keys/?flash=Revoked' },
  });
};
