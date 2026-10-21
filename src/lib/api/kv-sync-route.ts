// GET + batch-PUT handlers for a "localStorage first + KV sync" endpoint,
// backed by one KV doc per user (see ../kv-doc.ts). Used by
// /api/v1/problems/progress and /api/v1/quiz/mistakes so both keep the
// exact same auth, limits and error semantics.
//
// Cookie-session auth (not bearer keys like the rest of /api/v1): these are
// the site's own sync channels. Anon → 401.
//
// Errors: 503 `{ retryable: true }` whenever KV is missing or a KV call
// fails (incl. KV's ~1 write/sec/key limit) — the client keeps its local
// copy and retries. Logs carry the op + platform message only, never user
// data.
//
// Requiring `Content-Type: application/json` on PUT forces a CORS
// preflight for cross-origin callers, which is what keeps these cookie-auth
// writes CSRF-safe.

import type { APIRoute } from 'astro';
import { json } from './json';
import { byteLength, CorruptDocError, getKv, KvUnavailableError, type KvDoc } from '../kv-doc';
import type { Timestamped } from '../lww';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface KvSyncRouteConfig<E extends Timestamped> {
  /** Log prefix, e.g. `problems/progress`. */
  tag: string;
  /** Response field for GET, e.g. `progress` → `{ progress: {…} }`. */
  field: string;
  doc: KvDoc<E>;
  parseBatch: (body: unknown) => ParseResult<Record<string, E>>;
  maxBodyBytes: number;
  maxDocBytes: number;
  messages: {
    /** e.g. "Progress sync" */
    sync: string;
    /** e.g. "Stored progress is unreadable" */
    corrupt: string;
    /** e.g. "Could not sync progress" */
    failed: string;
    /** e.g. "At most 5000 tracked problems per account" */
    entryLimit: string;
    /** e.g. "Saved progress" (→ "… would exceed 2 MiB") */
    stored: string;
  };
}

export function kvSyncRoute<E extends Timestamped>(
  cfg: KvSyncRouteConfig<E>,
): { GET: APIRoute; PUT: APIRoute } {
  const unavailable = (message: string): Response => {
    const res = json(503, { error: 'sync_unavailable', message, retryable: true });
    res.headers.set('Retry-After', '5');
    return res;
  };

  const serverError = (e: unknown, op: string): Response => {
    if (e instanceof KvUnavailableError) {
      console.error(`[${cfg.tag}] ${op}:`, e.message);
      return unavailable(`${cfg.messages.sync} is temporarily unavailable`);
    }
    if (e instanceof CorruptDocError) {
      console.error(`[${cfg.tag}] ${op}: stored doc unreadable`);
      return json(500, { error: 'internal', message: cfg.messages.corrupt });
    }
    console.error(`[${cfg.tag}] ${op} failed:`, (e as Error)?.name ?? 'Error');
    return json(500, { error: 'internal', message: cfg.messages.failed });
  };

  const GET: APIRoute = async ({ locals }) => {
    const user = locals.user;
    if (!user) return json(401, { error: 'unauthenticated', message: 'Sign in required' });

    const kv = getKv(locals);
    if (!kv) return unavailable(`${cfg.messages.sync} is not configured`);
    try {
      return json(200, { [cfg.field]: await cfg.doc.load(kv, user.id) });
    } catch (e) {
      return serverError(e, 'get');
    }
  };

  const PUT: APIRoute = async ({ locals, request }) => {
    const user = locals.user;
    if (!user) return json(401, { error: 'unauthenticated', message: 'Sign in required' });

    const ctype = request.headers.get('Content-Type') ?? '';
    if (!ctype.toLowerCase().startsWith('application/json')) {
      return json(415, { error: 'unsupported_media_type', message: 'Content-Type must be application/json' });
    }
    const declared = Number(request.headers.get('Content-Length') ?? '0');
    if (declared > cfg.maxBodyBytes) {
      return json(413, { error: 'too_large', message: 'Request body too large' });
    }
    const raw = await request.text();
    if (byteLength(raw) > cfg.maxBodyBytes) {
      return json(413, { error: 'too_large', message: 'Request body too large' });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, { error: 'invalid_json', message: 'Body is not valid JSON' });
    }
    const parsed = cfg.parseBatch(body);
    if (!parsed.ok) return json(400, { error: 'invalid_body', message: parsed.error });

    const kv = getKv(locals);
    if (!kv) return unavailable(`${cfg.messages.sync} is not configured`);
    try {
      const r = await cfg.doc.saveBatch(kv, user.id, parsed.value);
      if (r.status === 'entry_limit') {
        return json(413, { error: 'entry_limit', message: cfg.messages.entryLimit });
      }
      if (r.status === 'size_limit') {
        return json(413, {
          error: 'storage_limit',
          message: `${cfg.messages.stored} would exceed ${cfg.maxDocBytes / (1024 * 1024)} MiB`,
        });
      }
      return json(200, { applied: r.applied, stale: r.stale });
    } catch (e) {
      return serverError(e, 'put');
    }
  };

  return { GET, PUT };
}
