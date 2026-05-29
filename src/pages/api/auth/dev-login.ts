import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { upsertUserFromGoogle } from '~/lib/auth/users';
import { createSession, generateSessionToken } from '~/lib/auth/session';
import { setSessionCookie } from '~/lib/auth/cookies';

export const prerender = false;

/**
 * Dev-only OAuth bypass. Lets you flip into any user (and into admin via
 * ADMIN_EMAILS) without provisioning a Google Cloud project. Gated by
 * DEV_AUTH_BACKDOOR=1 *and* dev mode — returns 404 in prod regardless.
 *
 * Usage:
 *   DEV_AUTH_BACKDOOR=1 ADMIN_EMAILS=admin@example.com npm run dev
 *   open http://localhost:4321/api/auth/dev-login?email=admin@example.com
 */
export const GET: APIRoute = async ({ url, cookies, locals }) => {
  const flagOn =
    import.meta.env.DEV_AUTH_BACKDOOR === '1' ||
    (typeof process !== 'undefined' && process.env.DEV_AUTH_BACKDOOR === '1');
  if (!flagOn || import.meta.env.PROD) {
    return new Response('Not found', { status: 404 });
  }
  const email = (url.searchParams.get('email') ?? 'dev@example.com').toLowerCase();
  const next = url.searchParams.get('next') ?? '/account/';
  const env = (locals as { runtime?: { env?: { DB?: unknown } } }).runtime?.env as {
    DB?: import('~/lib/db').D1Database;
  } | undefined;
  const db = await getDb({ env });
  const user = await upsertUserFromGoogle(db, {
    sub: 'dev:' + email,
    email,
    name: email.split('@')[0] ?? email,
  });
  const token = generateSessionToken();
  await createSession(db, token, user.id);
  setSessionCookie(cookies, token);
  return new Response(null, { status: 302, headers: { Location: next } });
};
