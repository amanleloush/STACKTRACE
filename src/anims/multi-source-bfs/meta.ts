import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'multi-source-bfs',
  title: 'Rotting Oranges — multi-source BFS',
  caption: 'Seed the queue with every rotten orange (time 0). Each round of BFS rots fresh neighbours and stamps them with time+1.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '04-bfs',
  order: 4,
  premium: false,
};

export default meta;
