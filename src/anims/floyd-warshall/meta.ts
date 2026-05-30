import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'floyd-warshall',
  title: 'Floyd-Warshall — all-pairs shortest paths',
  caption: 'dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) over every intermediate k. After k = V-1 the matrix holds all-pairs shortest paths.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '08-graphs',
  order: 4,
  premium: false,
};

export default meta;
