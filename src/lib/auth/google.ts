import { Google, generateState, generateCodeVerifier } from 'arctic';

let client: Google | null = null;

/** Memoized Google OAuth client. Reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * / SITE_URL from env on first call; throws if any are missing so misconfig
 * surfaces at request time rather than silently dropping the flow. */
export function getGoogleClient(): Google {
  if (client) return client;
  const clientId = import.meta.env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  const siteUrl = import.meta.env.SITE_URL ?? process.env.SITE_URL ?? 'http://localhost:4321';
  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth not configured. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env.local. ' +
        'For local iteration without a Google Cloud project, use DEV_AUTH_BACKDOOR=1 + /api/auth/dev-login.',
    );
  }
  client = new Google(clientId, clientSecret, `${siteUrl}/api/auth/google/callback`);
  return client;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

/** Hit Google's userinfo endpoint with the access token returned by the
 * authorization-code exchange. Avoids JWT-decoding the id_token. */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const resp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    throw new Error(`Google userinfo failed: ${resp.status} ${resp.statusText}`);
  }
  const body = (await resp.json()) as Partial<GoogleUserInfo>;
  if (!body.sub || !body.email) {
    throw new Error('Google userinfo response missing sub or email');
  }
  return { sub: body.sub, email: body.email, name: body.name, picture: body.picture };
}

export { generateState, generateCodeVerifier };
