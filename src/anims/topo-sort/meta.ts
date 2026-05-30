import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'topo-sort',
  title: 'Topological sort — Kahn',
  caption: 'Repeatedly pop a node with in-degree 0 and decrement in-degree of its children. A cycle ⇔ some node never reaches 0.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '08-graphs',
  order: 1,
  premium: false,
};

export default meta;
