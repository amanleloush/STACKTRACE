import { defineMiddleware } from 'astro:middleware';
import { getDb } from '~/lib/db';
import { validateSession } from '~/lib/auth/session';
import { readSessionCookie } from '~/lib/auth/cookies';

/**
 * Per-request auth resolver + admin route guard.
 *
 * Only resolves the session for routes that actually need it. Prerendered
 * routes (everything outside `SSR_PATH_PREFIXES`) skip the cookie read so
 * Astro's static analyzer doesn't fire the "Astro.request.headers was used"
 * warning at build/prerender time — and so the CDN can cache them with
 * a single representation across all visitors (plan §14e).
 *
 * /admin/* + /api/admin/* are guarded server-side: anon or non-admin gets
 * 404 (not 403) so the panel's existence isn't telegraphed (§14h).
 */
const SSR_PATH_PREFIXES = [
  '/api/',
  '/admin',
  '/account',
  '/login',
  '/learn/',
] as const;

function needsAuthResolution(pathname: string): boolean {
  for (const p of SSR_PATH_PREFIXES) {
    if (pathname === p.replace(/\/$/, '') || pathname.startsWith(p)) return true;
  }
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.session = null;

  const path = context.url.pathname;
  if (!needsAuthResolution(path)) {
    return next();
  }

  const token = readSessionCookie(context.cookies);
  if (token) {
    try {
      const env = context.locals.runtime?.env;
      const db = await getDb({ env });
      const { user, session } = await validateSession(db, token);
      context.locals.user = user;
      context.locals.session = session;
    } catch (e) {
      console.error('[middleware] session resolve failed:', e);
    }
  }

  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin');
  if (isAdminRoute && context.locals.user?.role !== 'admin') {
    return new Response('Not found', { status: 404 });
  }

  return next();
});
