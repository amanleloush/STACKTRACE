import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { getGoogleClient, fetchGoogleUserInfo } from '~/lib/auth/google';
import { upsertUserFromGoogle } from '~/lib/auth/users';
import { createSession, generateSessionToken } from '~/lib/auth/session';
import { setSessionCookie } from '~/lib/auth/cookies';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, locals }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('google_oauth_state')?.value;
  const verifier = cookies.get('google_oauth_verifier')?.value;
  const next = cookies.get('google_oauth_next')?.value ?? '/account/';

  cookies.delete('google_oauth_state', { path: '/' });
  cookies.delete('google_oauth_verifier', { path: '/' });
  cookies.delete('google_oauth_next', { path: '/' });

  if (!code || !state || !storedState || !verifier || state !== storedState) {
    return new Response('Invalid OAuth state', { status: 400 });
  }

  let userinfo;
  try {
    const tokens = await getGoogleClient().validateAuthorizationCode(code, verifier);
    userinfo = await fetchGoogleUserInfo(tokens.accessToken());
  } catch (e) {
    return new Response('OAuth exchange failed: ' + String(e), { status: 500 });
  }

  const env = (locals as { runtime?: { env?: { DB?: unknown } } }).runtime?.env as {
    DB?: import('~/lib/db').D1Database;
  } | undefined;
  const db = await getDb({ env });
  const user = await upsertUserFromGoogle(db, userinfo);

  const token = generateSessionToken();
  await createSession(db, token, user.id);
  setSessionCookie(cookies, token);

  return new Response(null, { status: 302, headers: { Location: next } });
};
