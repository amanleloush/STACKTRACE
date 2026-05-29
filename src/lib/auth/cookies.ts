import type { AstroCookies } from 'astro';

const COOKIE_NAME = 'sysviz_session';
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

export const SESSION_COOKIE_NAME = COOKIE_NAME;
