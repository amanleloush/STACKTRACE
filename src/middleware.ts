import { defineMiddleware } from 'astro:middleware';
import { getDb } from '~/lib/db';
import { validateSession } from '~/lib/auth/session';
import {
  readSessionCookie,
  clearSessionCookie,
  clearHintCookie,
  HINT_COOKIE,
} from '~/lib/auth/cookies';

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
  let staleToken = false;
  if (token) {
    try {
      const env = context.locals.runtime?.env;
      const db = await getDb({ env });
      const { user, session } = await validateSession(db, token);
      context.locals.user = user;
      context.locals.session = session;
      // Cookie present but no row → the user record was deleted (e.g. a
      // verify-phase3 run wiped .local.db) or the session expired. Mark
      // it so we can clear the stale cookie.
      if (!user) staleToken = true;
    } catch (e) {
      console.error('[middleware] session resolve failed:', e);
    }
  }

  // Keep the two cookies in lockstep. If we couldn't resolve a real user but
  // either cookie is still hanging around, drop both — otherwise the nav-swap
  // script in BaseLayout will keep lying about who's signed in.
  const hintPresent = context.cookies.has(HINT_COOKIE);
  if (!context.locals.user && (staleToken || hintPresent)) {
    if (staleToken) clearSessionCookie(context.cookies);
    if (hintPresent) clearHintCookie(context.cookies);
  }

  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin');
  if (isAdminRoute && context.locals.user?.role !== 'admin') {
    // Dev-mode diagnostic: include a small body explaining *why* (signed
    // out, stale, or just non-admin). Prod still gets a bare 404 so the
    // admin surface isn't telegraphed (§14h).
    if (import.meta.env.DEV) {
      const reason = staleToken
        ? 'session cookie is stale (user record missing — local DB was likely wiped). Sign in again at /login/.'
        : context.locals.user
          ? `signed in as ${context.locals.user.email} (role=${context.locals.user.role}). Admin routes require role=admin — add ${context.locals.user.email} to ADMIN_EMAILS in .env.local and sign in again.`
          : 'not signed in. Visit /login/.';
      // The clearSessionCookie / clearHintCookie calls above already queued
      // Set-Cookie headers on the cookies bag; Astro merges them onto this
      // response automatically. Just return.
      return new Response(
        `Not found.\n\n[dev-mode hint] /admin/* — ${reason}\n`,
        { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
      );
    }
    return new Response('Not found', { status: 404 });
  }

  return next();
});
