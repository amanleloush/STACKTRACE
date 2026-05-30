import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'bfs-graph',
  title: 'BFS on graph — explore in layers',
  caption: 'Queue holds nodes to visit. Pop front, mark visited, enqueue unvisited neighbours.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '04-bfs',
  order: 1,
  premium: false,
};

export default meta;
