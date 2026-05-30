import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'tarjan-scc',
  title: 'Tarjan SCC — DFS with index / lowlink',
  caption: 'DFS each vertex; assign index = low = counter, push on stack. Update low from tree children and from any neighbour already on the stack. When low == index, pop the stack down to v — that block is one strongly-connected component.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '08-graphs',
  order: 8,
  premium: false,
};

export default meta;
