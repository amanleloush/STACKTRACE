import { getEntry } from 'astro:content';
import { withApiAuth } from '~/lib/api/handlers';
import { canAccess } from '~/lib/billing/entitlement';
import type { ApiAuthContext } from '~/lib/api/keys';
import type { SessionUser } from '~/lib/auth/session';

export const prerender = false;

/**
 * GET /api/v1/notes/[slug]
 *
 * Single-note read. Searches both `notes` and `dsa` collections. Entitlement
 * is decided by `canAccess` so admin / pro / free behave identically to the
 * SSR-rendered learn pages:
 *   - allowed → full `body` (raw MDX string from the content entry)
 *   - denied  → `paywall: true` + `preview_paragraphs` count, no body
 */
export const GET = withApiAuth(async ({ ctx, db, params }) => {
  const slug = String(params.slug ?? '');
  if (!slug) {
    return { status: 400, body: { error: 'invalid_slug', message: 'slug is required' } };
  }

  const fromNotes = await getEntry('notes', slug);
  const fromDsa = fromNotes ? null : await getEntry('dsa', slug);
  const entry = fromNotes ?? fromDsa;
  if (!entry) {
    return { status: 404, body: { error: 'not_found', message: `No note with slug "${slug}"` } };
  }
  const pillar: 'systems' | 'dsa' = fromNotes ? 'systems' : 'dsa';

  const access = await canAccess(
    db,
    {
      kind: 'note',
      id: slug,
      defaultPremium: entry.data.premium,
      defaultPreviewParagraphs: entry.data.previewParagraphs,
    },
    sessionUserFromCtx(ctx),
  );

  const base = {
    slug,
    pillar,
    title: entry.data.title,
    phase: entry.data.phase,
    order: entry.data.order,
    tags: entry.data.tags,
    premium: entry.data.premium,
    estimatedMinutes: entry.data.estimatedMinutes ?? null,
    summary: entry.data.summary ?? null,
    prerequisites: entry.data.prerequisites ?? [],
  };

  if (access.allowed) {
    return {
      status: 200,
      body: { ...base, body: entry.body ?? '' },
    };
  }

  return {
    status: 200,
    body: { ...base, paywall: true, preview_paragraphs: access.previewParagraphs },
  };
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
