import type { APIRoute } from 'astro';
import { getDb, type Db } from '~/lib/db';
import { verifyApiKey, licenseStamp, type ApiAuthContext } from './keys';

export interface ApiResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type ApiHandler = (args: {
  ctx: ApiAuthContext;
  /** DB handle the wrapper already opened — reuse it instead of calling
   *  getDb again (prod requires env.DB which the handler can't reach). */
  db: Db;
  request: Request;
  url: URL;
  params: Record<string, string | undefined>;
}) => Promise<ApiResult>;

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store',
};

/**
 * Wraps an /api/v1/* handler with bearer-token auth + quota tick.
 * Every JSON response carries `_meta: { licensed_to, tier, generated_at }`
 * for traceability + per-user watermarking. Unauth → 401, over-quota → 429,
 * any thrown error → 500 + console.error.
 */
export function withApiAuth(handler: ApiHandler): APIRoute {
  return async ({ request, url, locals, params }) => {
    const env = locals.runtime?.env;
    const db = await getDb({ env });
    const auth = await verifyApiKey(db, request.headers.get('Authorization'));
    if ('error' in auth) {
      if (auth.error === 'quota_exceeded') {
        return new Response(
          JSON.stringify({ error: 'quota_exceeded', message: 'Daily quota exhausted' }, null, 2),
          {
            status: 429,
            headers: { ...BASE_HEADERS, 'Retry-After': '3600' },
          },
        );
      }
      return new Response(
        JSON.stringify({ error: 'unauthenticated', message: 'Bearer token missing, malformed, or revoked' }, null, 2),
        { status: 401, headers: { ...BASE_HEADERS, 'WWW-Authenticate': 'Bearer realm="api/v1"' } },
      );
    }

    let result: ApiResult;
    try {
      result = await handler({
        ctx: auth.ctx,
        db,
        request,
        url,
        params: (params as Record<string, string | undefined>) ?? {},
      });
    } catch (e) {
      console.error('[api/v1] handler threw:', e);
      return new Response(
        JSON.stringify({ error: 'internal', message: String((e as Error).message ?? e) }, null, 2),
        { status: 500, headers: BASE_HEADERS },
      );
    }

    // Attach a per-user license stamp + quota + tier on every response.
    const wrapped = withMeta(result.body, auth.ctx);
    return new Response(JSON.stringify(wrapped, null, 2), {
      status: result.status,
      headers: {
        ...BASE_HEADERS,
        'X-RateLimit-Limit': String(auth.ctx.quota.quota),
        'X-RateLimit-Remaining': String(Math.max(0, auth.ctx.quota.quota - auth.ctx.quota.used)),
        'X-RateLimit-Reset': String(auth.ctx.quota.resetAt),
        ...(result.headers ?? {}),
      },
    });
  };
}

function withMeta(body: unknown, ctx: ApiAuthContext): unknown {
  const meta = {
    licensed_to: licenseStamp(ctx.userId),
    tier: ctx.tier,
    generated_at: new Date().toISOString(),
    quota: { used: ctx.quota.used, limit: ctx.quota.quota, reset_at: ctx.quota.resetAt },
  };
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>), _meta: meta };
  }
  return { data: body, _meta: meta };
}
