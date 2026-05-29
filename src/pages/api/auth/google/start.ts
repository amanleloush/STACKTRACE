import type { APIRoute } from 'astro';
import {
  getGoogleClient,
  generateState,
  generateCodeVerifier,
} from '~/lib/auth/google';

export const prerender = false;

const SCOPES = ['openid', 'email', 'profile'];

export const GET: APIRoute = async ({ cookies, url }) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const next = url.searchParams.get('next') ?? '/account/';

  const oneHotAttrs = {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  } as const;
  cookies.set('google_oauth_state', state, oneHotAttrs);
  cookies.set('google_oauth_verifier', codeVerifier, oneHotAttrs);
  cookies.set('google_oauth_next', next, oneHotAttrs);

  try {
    const authUrl = getGoogleClient().createAuthorizationURL(state, codeVerifier, SCOPES);
    return new Response(null, { status: 302, headers: { Location: authUrl.toString() } });
  } catch {
    // Misconfig is a setup-time mistake, not a server fault. Send the user
    // back to /login with a friendly error chip + instructions instead of
    // a 500 wall of text.
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login/?error=oauth-misconfig&next=${encodeURIComponent(next)}`,
      },
    });
  }
};
