import { withApiAuth } from '~/lib/api/handlers';
import { getMeta } from '~/lib/anim/registry';
import { canAccess } from '~/lib/billing/entitlement';
import type { ApiAuthContext } from '~/lib/api/keys';
import type { SessionUser } from '~/lib/auth/session';

export const prerender = false;

/**
 * GET /api/v1/anims/[id]
 *
 * Single animation lookup. The body never includes the mount module — only
 * metadata + the `standalone_url` for embedding. The entitlement gate
 * mirrors the per-note flow: pro / admin always allowed; free users get a
 * `paywall: true` flag when the anim is premium-gated.
 */
export const GET = withApiAuth(async ({ ctx, db, params }) => {
  const id = String(params.id ?? '');
  const meta = getMeta(id);
  if (!meta) {
    return { status: 404, body: { error: 'not_found', message: `No anim with id "${id}"` } };
  }

  const access = await canAccess(
    db,
    { kind: 'anim', id, defaultPremium: meta.premium ?? false },
    sessionUserFromCtx(ctx),
  );

  const body: Record<string, unknown> = {
    id: meta.id,
    title: meta.title,
    caption: meta.caption,
    tags: meta.tags,
    pillar: meta.pillar,
    phase: meta.phase ?? null,
    order: meta.order ?? null,
    premium: meta.premium ?? false,
    standalone_url: `/animations/${meta.id}/`,
  };
  if (!access.allowed) body.paywall = true;

  return { status: 200, body };
});

function sessionUserFromCtx(ctx: ApiAuthContext): SessionUser {
  return {
    id: ctx.user.id,
    email: ctx.user.email,
    name: ctx.user.name,
    picture: null,
    role: ctx.user.role,
  };
}
