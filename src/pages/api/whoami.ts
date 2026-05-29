import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Diagnostic endpoint — returns the current session's user info as JSON.
 * No DB writes. No secrets exposed (the session id is already in the
 * cookie). Useful when the admin/* routes mysteriously 404 and you want
 * to confirm whether middleware sees you as anon, user, or admin.
 *
 * Example output:
 *   {"signedIn":true,"user":{"email":"...","role":"admin",...},"session":{...}}
 */
export const GET: APIRoute = async ({ locals }) => {
  const body = {
    signedIn: locals.user != null,
    user: locals.user
      ? {
          id: locals.user.id,
          email: locals.user.email,
          name: locals.user.name,
          role: locals.user.role,
        }
      : null,
    session: locals.session
      ? {
          userId: locals.session.userId,
          expiresAt: locals.session.expiresAt,
        }
      : null,
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  });
};
