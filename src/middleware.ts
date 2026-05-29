import { defineMiddleware } from 'astro:middleware';
import { getDb } from '~/lib/db';
import { validateSession } from '~/lib/auth/session';
import { readSessionCookie } from '~/lib/auth/cookies';

/**
 * Per-request auth resolver + admin route guard.
 *
 * Reads the sysviz_session cookie, looks the row up in `sessions` + `users`,
 * and stamps Astro.locals.user / .session for every downstream page or API
 * route. Cookie missing or invalid → user/session are null (anonymous).
 *
 * /admin/* is guarded here, server-side: anonymous + non-admin requests get
 * 404 (not 403) so the panel's existence isn't telegraphed to anyone who
 * isn't already entitled to it (§14h).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.session = null;

  const token = readSessionCookie(context.cookies);
  if (token) {
    try {
      const env = context.locals.runtime?.env;
      const db = await getDb({ env });
      const { user, session } = await validateSession(db, token);
      context.locals.user = user;
      context.locals.session = session;
    } catch (e) {
      // Don't fail the whole request if the DB is briefly unreachable —
      // surface as anonymous and let the route decide what to do.
      console.error('[middleware] session resolve failed:', e);
    }
  }

  // Admin gate. Path-based check so it covers both pages and API routes.
  if (context.url.pathname.startsWith('/admin')) {
    if (context.locals.user?.role !== 'admin') {
      return new Response('Not found', { status: 404 });
    }
  }

  return next();
});
