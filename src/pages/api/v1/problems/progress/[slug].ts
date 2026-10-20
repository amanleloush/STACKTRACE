import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { isValidSlug, parseProgressBody } from '~/lib/problem-progress';
import { upsertProgress, MAX_ROWS_PER_USER } from '~/lib/problem-progress-db';
import { json } from '~/lib/api/json';

export const prerender = false;

/** Upper bound on the raw body — 20k chars of notes can be ~80 KB as UTF-8. */
const MAX_BODY_BYTES = 128 * 1024;

/**
 * PUT /api/v1/problems/progress/:slug — upsert `{ solved, notes, updatedAt }`
 * for the signed-in user, last-write-wins on `updatedAt`.
 *
 * 200 `{ status: 'applied' | 'stale', entry }` — on `stale` the server copy
 *     was newer and `entry` is what's stored, so the client can adopt it.
 * 400 bad slug / body · 401 anon · 413 body too large / row cap · 415 non-JSON.
 *
 * Requiring `Content-Type: application/json` forces a CORS preflight for
 * cross-origin callers, which is what keeps this cookie-auth write CSRF-safe.
 */
export const PUT: APIRoute = async ({ locals, params, request }) => {
  const user = locals.user;
  if (!user) return json(401, { error: 'unauthenticated', message: 'Sign in required' });

  const slug = params.slug;
  if (!isValidSlug(slug)) {
    return json(400, { error: 'invalid_slug', message: 'slug must match ^[a-z0-9-]{1,120}$' });
  }
  const ctype = request.headers.get('Content-Type') ?? '';
  if (!ctype.toLowerCase().startsWith('application/json')) {
    return json(415, { error: 'unsupported_media_type', message: 'Content-Type must be application/json' });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { error: 'too_large', message: 'Request body too large' });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid_json', message: 'Body is not valid JSON' });
  }
  const parsed = parseProgressBody(body);
  if (!parsed.ok) return json(400, { error: 'invalid_body', message: parsed.error });

  const db = await getDb({ env: locals.runtime?.env });
  try {
    const result = await upsertProgress(db, user.id, slug, parsed.value);
    if (result.status === 'quota') {
      return json(413, {
        error: 'row_limit',
        message: `At most ${MAX_ROWS_PER_USER} tracked problems per account`,
      });
    }
    return json(200, { slug, status: result.status, entry: result.entry });
  } catch (e) {
    // Never log the body — notes are user-private.
    console.error('[problems/progress] upsert failed:', (e as Error).message);
    return json(500, { error: 'internal', message: 'Could not save progress' });
  }
};
