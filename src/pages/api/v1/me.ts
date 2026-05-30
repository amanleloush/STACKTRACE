import { withApiAuth } from '~/lib/api/handlers';

export const prerender = false;

/**
 * GET /api/v1/me
 *
 * Echoes the caller's auth context — useful for SDK clients to confirm
 * the bearer token is valid + show the human-readable email/tier. The
 * `_meta` envelope (attached by `withApiAuth`) already carries the same
 * tier + license stamp, but surfacing it on the body here keeps the
 * `/me` contract self-contained.
 *
 * Note: `key.name_known: false` is a placeholder — we'd need an extra DB
 * round-trip to fetch the key's `name` column, which isn't worth a quota
 * tick for Phase 4b. The dashboard's /account/keys/ already shows it.
 */
export const GET = withApiAuth(async ({ ctx }) => {
  return {
    status: 200,
    body: {
      user: {
        email: ctx.user.email,
        name: ctx.user.name,
        role: ctx.user.role,
      },
      tier: ctx.tier,
      key: {
        id: ctx.keyId,
        name_known: false,
      },
    },
  };
});
