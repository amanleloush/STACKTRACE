import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'bellman-ford',
  title: 'Bellman-Ford — shortest paths with negative edges',
  caption: 'Relax every edge V-1 times. After V-1 passes, one more pass that still relaxes any edge proves a negative cycle is reachable.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '08-graphs',
  order: 3,
  premium: false,
};

export default meta;
