import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'level-order',
  title: 'Binary tree level-order BFS',
  caption: 'Drain the queue one level at a time: snapshot size, pop that many nodes, push their children. Each drain = one level.',
  tags: ['tree'],
  pillar: 'dsa',
  phase: '04-bfs',
  order: 3,
  premium: false,
};

export default meta;
