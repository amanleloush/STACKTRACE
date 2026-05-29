import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'dijkstra',
  title: "Dijkstra — single-source shortest path",
  caption:
    'Extract the closest unfinalised node, relax its outgoing edges, repeat. Same grid as BFS/DFS, weighted edges.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '04-graphs',
  order: 3,
  premium: false,
};

export default meta;
