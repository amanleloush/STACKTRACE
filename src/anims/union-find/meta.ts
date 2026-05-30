import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'union-find',
  title: 'Union-Find — path compression + union by rank',
  caption: 'find(x) climbs to the root; union merges trees by attaching the shorter to the taller. Amortized α(n).',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '08-graphs',
  order: 5,
  premium: false,
};

export default meta;
