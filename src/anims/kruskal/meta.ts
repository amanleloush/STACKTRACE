import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'kruskal',
  title: 'Kruskal MST — sorted edges + union-find',
  caption: 'Sort all edges by weight. Walk the list; include an edge if its endpoints sit in different DSU components (else it would close a cycle).',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '08-graphs',
  order: 6,
  premium: false,
};

export default meta;
