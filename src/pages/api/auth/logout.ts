import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { invalidateSession } from '~/lib/auth/session';
import { readSessionCookie, clearSessionCookie } from '~/lib/auth/cookies';

export const prerender = false;

async function logoutResponse({
  cookies,
  locals,
  redirectTo,
}: {
  cookies: import('astro').AstroCookies;
  locals: { runtime?: { env?: { DB?: unknown } } };
  redirectTo: string;
}): Promise<Response> {
  const token = readSessionCookie(cookies);
  if (token) {
    const env = locals.runtime?.env as { DB?: import('~/lib/db').D1Database } | undefined;
    const db = await getDb({ env });
    await invalidateSession(db, token);
  }
  clearSessionCookie(cookies);
  return new Response(null, { status: 302, headers: { Location: redirectTo } });
}

export const POST: APIRoute = async ({ cookies, locals, url }) => {
  const next = url.searchParams.get('next') ?? '/';
  return logoutResponse({
    cookies,
    locals: locals as { runtime?: { env?: { DB?: unknown } } },
    redirectTo: next,
  });
};
// Accept GET too so a plain <a href> can sign out — pragmatic for Phase 3;
// CSRF tightening (require POST + token) lands with the admin write paths.
export const GET = POST;
