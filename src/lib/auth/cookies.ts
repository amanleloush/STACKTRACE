import type { AstroCookies } from 'astro';

const COOKIE_NAME = 'sysviz_session';
const HINT_COOKIE_NAME = 'sysviz_signed_in';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const baseAttrs = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax',
  path: '/',
} as const;

export function setSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(COOKIE_NAME, token, { ...baseAttrs, maxAge: COOKIE_MAX_AGE });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export function readSessionCookie(cookies: AstroCookies): string | undefined {
  return cookies.get(COOKIE_NAME)?.value;
}

/** Non-HttpOnly UI hint cookie — readable by BaseLayout's nav-swap script
 *  so prerendered pages can show "Account" / "Admin" without an SSR round
 *  trip. Value format: "<name>|<role>" — purely informational; the real
 *  auth check still lives in the HttpOnly session cookie + the DB lookup. */
export function setHintCookie(
  cookies: AstroCookies,
  name: string,
  role: 'user' | 'admin',
): void {
  cookies.set(HINT_COOKIE_NAME, `${name}|${role}`, {
    httpOnly: false,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearHintCookie(cookies: AstroCookies): void {
  cookies.delete(HINT_COOKIE_NAME, { path: '/' });
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const HINT_COOKIE = HINT_COOKIE_NAME;
