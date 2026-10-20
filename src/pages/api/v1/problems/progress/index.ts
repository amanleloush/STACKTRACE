import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { listProgress } from '~/lib/problem-progress-db';
import { json } from '~/lib/api/json';

export const prerender = false;

/**
 * GET /api/v1/problems/progress — every company-tracker row for the
 * signed-in user: `{ progress: { [slug]: { solved, notes, updatedAt } } }`.
 *
 * Cookie-session auth (not bearer keys like the rest of /api/v1): this is
 * the site's own sync channel for /dsa/companies/. Anon → 401.
 */
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return json(401, { error: 'unauthenticated', message: 'Sign in required' });

  const db = await getDb({ env: locals.runtime?.env });
  try {
    return json(200, { progress: await listProgress(db, user.id) });
  } catch (e) {
    // Never log row contents — notes are user-private.
    console.error('[problems/progress] list failed:', (e as Error).message);
    return json(500, { error: 'internal', message: 'Could not load progress' });
  }
};
