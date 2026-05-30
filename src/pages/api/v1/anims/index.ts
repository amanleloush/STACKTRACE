import { withApiAuth } from '~/lib/api/handlers';
import { listAnimMetas } from '~/lib/anim/registry';

export const prerender = false;

/**
 * GET /api/v1/anims
 *
 * Lists every animation's metadata. The animation mount code (JS module) is
 * never served via the API — consumers can embed via the `standalone_url`
 * returned by the per-id endpoint or scrape the live page.
 */
export const GET = withApiAuth(async () => {
  const metas = listAnimMetas();
  const anims = metas.map((m) => ({
    id: m.id,
    title: m.title,
    caption: m.caption,
    tags: m.tags,
    pillar: m.pillar,
    phase: m.phase ?? null,
    order: m.order ?? null,
    premium: m.premium ?? false,
  }));
  return {
    status: 200,
    body: { anims, count: anims.length },
  };
});
