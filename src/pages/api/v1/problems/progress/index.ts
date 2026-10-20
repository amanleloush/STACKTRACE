import type { APIRoute } from 'astro';
import { json } from '~/lib/api/json';
import {
  MAX_BATCH_BODY_BYTES,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  parseBatchBody,
} from '~/lib/problem-progress';
import {
  byteLength,
  CorruptDocError,
  getProgressKv,
  KvUnavailableError,
  loadProgress,
  saveBatch,
} from '~/lib/problem-progress-kv';

export const prerender = false;

// Company-tracker sync for /dsa/companies/, stored in Workers KV (one doc
// per user — see src/lib/problem-progress-kv.ts).
//
// Cookie-session auth (not bearer keys like the rest of /api/v1): this is
// the site's own sync channel. Anon → 401.
//
// Errors: 503 `{ retryable: true }` whenever KV is missing or a KV call
// fails (incl. KV's ~1 write/sec/key limit) — the client keeps its local
// copy and retries. Logs carry the op + platform message only, never notes.

function unavailable(message: string): Response {
  const res = json(503, { error: 'sync_unavailable', message, retryable: true });
  res.headers.set('Retry-After', '5');
  return res;
}

function serverError(e: unknown, op: string): Response {
  if (e instanceof KvUnavailableError) {
    console.error(`[problems/progress] ${op}:`, e.message);
    return unavailable('Progress sync is temporarily unavailable');
  }
  if (e instanceof CorruptDocError) {
    console.error(`[problems/progress] ${op}: stored doc unreadable`);
    return json(500, { error: 'internal', message: 'Stored progress is unreadable' });
  }
  console.error(`[problems/progress] ${op} failed:`, (e as Error)?.name ?? 'Error');
  return json(500, { error: 'internal', message: 'Could not sync progress' });
}

/**
 * GET /api/v1/problems/progress →
 *   200 `{ progress: { [slug]: { solved, notes, updatedAt } } }`
 */
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return json(401, { error: 'unauthenticated', message: 'Sign in required' });

  const kv = getProgressKv(locals);
  if (!kv) return unavailable('Progress sync is not configured');
  try {
    return json(200, { progress: await loadProgress(kv, user.id) });
  } catch (e) {
    return serverError(e, 'get');
  }
};

/**
 * PUT /api/v1/problems/progress — batch upsert.
 *   body `{ entries: { [slug]: { solved, notes, updatedAt } } }` (1..200)
 *   200  `{ applied: string[], stale: { [slug]: entry } }` — `stale` holds
 *        server copies that were at least as new; the client adopts them.
 *   400 bad JSON / slug / entry · 401 anon · 413 body too large, entry cap
 *   (5000) or doc size cap (2 MiB) · 415 non-JSON · 503 KV unavailable.
 *
 * Requiring `Content-Type: application/json` forces a CORS preflight for
 * cross-origin callers, which is what keeps this cookie-auth write CSRF-safe.
 */
export const PUT: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return json(401, { error: 'unauthenticated', message: 'Sign in required' });

  const ctype = request.headers.get('Content-Type') ?? '';
  if (!ctype.toLowerCase().startsWith('application/json')) {
    return json(415, { error: 'unsupported_media_type', message: 'Content-Type must be application/json' });
  }
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BATCH_BODY_BYTES) {
    return json(413, { error: 'too_large', message: 'Request body too large' });
  }
  const raw = await request.text();
  if (byteLength(raw) > MAX_BATCH_BODY_BYTES) {
    return json(413, { error: 'too_large', message: 'Request body too large' });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid_json', message: 'Body is not valid JSON' });
  }
  const parsed = parseBatchBody(body);
  if (!parsed.ok) return json(400, { error: 'invalid_body', message: parsed.error });

  const kv = getProgressKv(locals);
  if (!kv) return unavailable('Progress sync is not configured');
  try {
    const r = await saveBatch(kv, user.id, parsed.value);
    if (r.status === 'entry_limit') {
      return json(413, {
        error: 'entry_limit',
        message: `At most ${MAX_ENTRIES_PER_USER} tracked problems per account`,
      });
    }
    if (r.status === 'size_limit') {
      return json(413, {
        error: 'storage_limit',
        message: `Saved progress would exceed ${MAX_DOC_BYTES / (1024 * 1024)} MiB`,
      });
    }
    return json(200, { applied: r.applied, stale: r.stale });
  } catch (e) {
    return serverError(e, 'put');
  }
};
