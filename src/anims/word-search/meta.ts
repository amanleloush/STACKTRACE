import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'word-search',
  title: 'Word Search — DFS + backtracking',
  caption: 'From each cell that matches word[0], DFS into 4 neighbours, marking cells visited. Unmark on the way back.',
  tags: [],
  pillar: 'dsa',
  phase: '06-backtracking',
  order: 6,
  premium: false,
};

export default meta;
