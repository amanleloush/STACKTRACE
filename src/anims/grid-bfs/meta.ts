import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'grid-bfs',
  title: 'Grid BFS — shortest path from S to T',
  caption: 'Multi-source BFS expands a wavefront layer by layer; distance to each cell = layer number it was discovered in.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '04-bfs',
  order: 2,
  premium: false,
};

export default meta;
