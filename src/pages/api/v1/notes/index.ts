import { getCollection } from 'astro:content';
import { withApiAuth } from '~/lib/api/handlers';

export const prerender = false;

/**
 * GET /api/v1/notes
 *
 * List every non-draft note across both content collections (`notes` for the
 * systems pillar, `dsa` for the DSA pillar). Returns metadata only — body
 * content is gated on the per-slug endpoint via `canAccess`. The summary /
 * tag / phase / order fields are public so consumers can build their own
 * roadmap UIs without burning quota fetching each slug.
 */
export const GET = withApiAuth(async () => {
  const [systems, dsa] = await Promise.all([
    getCollection('notes', (n) => !n.data.draft),
    getCollection('dsa', (n) => !n.data.draft),
  ]);

  const notes = [
    ...systems.map((entry) => shape(entry, 'systems')),
    ...dsa.map((entry) => shape(entry, 'dsa')),
  ];

  return {
    status: 200,
    body: { notes, count: notes.length },
  };
});

interface NoteLike {
  id: string;
  data: {
    title: string;
    phase: string;
    order: number;
    tags: string[];
    premium: boolean;
    estimatedMinutes?: number;
    summary?: string;
  };
}

function shape(entry: NoteLike, pillar: 'systems' | 'dsa') {
  return {
    slug: entry.id,
    pillar,
    title: entry.data.title,
    phase: entry.data.phase,
    order: entry.data.order,
    tags: entry.data.tags,
    premium: entry.data.premium,
    estimatedMinutes: entry.data.estimatedMinutes ?? null,
    summary: entry.data.summary ?? null,
  };
}
