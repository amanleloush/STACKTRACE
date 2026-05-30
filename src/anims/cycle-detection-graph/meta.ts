import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'cycle-detection-graph',
  title: 'Cycle detection — DFS with white/gray/black',
  caption: 'Gray = on the current DFS path. A back-edge to a gray node = cycle. After finishing, mark the node black.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '05-dfs',
  order: 6,
  premium: false,
};

export default meta;
