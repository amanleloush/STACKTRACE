import { getCollection } from 'astro:content';
import { withApiAuth } from '~/lib/api/handlers';

export const prerender = false;

interface Node {
  slug: string;
  title: string;
  order: number;
  premium: boolean;
  prerequisites: string[];
}

interface PhaseGroup {
  phase: string;
  label: string;
  nodes: Node[];
}

/**
 * GET /api/v1/roadmap?pillar=systems|dsa
 *
 * Returns notes grouped by phase, ordered, for one or both pillars. The
 * `label` we attach to each phase is the slug with its leading `NN-`
 * stripped + words title-cased (`05-distributed-systems` → "Distributed
 * Systems"). Good enough for API consumers; the SSR roadmap page reads
 * from a richer JSON collection.
 */
export const GET = withApiAuth(async ({ url }) => {
  const pillar = url.searchParams.get('pillar');
  if (pillar != null && pillar !== 'systems' && pillar !== 'dsa') {
    return {
      status: 400,
      body: { error: 'invalid_pillar', message: 'pillar must be "systems" or "dsa"' },
    };
  }

  const pillars: { systems?: PhaseGroup[]; dsa?: PhaseGroup[] } = {};

  if (pillar == null || pillar === 'systems') {
    const entries = await getCollection('notes', (n) => !n.data.draft);
    pillars.systems = groupByPhase(entries);
  }
  if (pillar == null || pillar === 'dsa') {
    const entries = await getCollection('dsa', (n) => !n.data.draft);
    pillars.dsa = groupByPhase(entries);
  }

  return { status: 200, body: { pillars } };
});

interface NoteLike {
  id: string;
  data: {
    title: string;
    phase: string;
    order: number;
    premium: boolean;
    prerequisites: string[];
  };
}

function groupByPhase(entries: NoteLike[]): PhaseGroup[] {
  const byPhase = new Map<string, Node[]>();
  for (const e of entries) {
    const arr = byPhase.get(e.data.phase) ?? [];
    arr.push({
      slug: e.id,
      title: e.data.title,
      order: e.data.order,
      premium: e.data.premium,
      prerequisites: e.data.prerequisites ?? [],
    });
    byPhase.set(e.data.phase, arr);
  }
  return [...byPhase.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([phase, nodes]) => ({
      phase,
      label: phaseLabel(phase),
      nodes: nodes.sort((a, b) => a.order - b.order),
    }));
}

function phaseLabel(phase: string): string {
  const stripped = phase.replace(/^[0-9]+-/, '');
  return stripped
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
