import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'n-queens',
  title: 'N-Queens — row-by-row with attack sets',
  caption: 'Place one queen per row. cols, diag1 (r+c), diag2 (r-c) give O(1) attack checks. Backtrack on conflict.',
  tags: [],
  pillar: 'dsa',
  phase: '06-backtracking',
  order: 4,
  premium: false,
};

export default meta;
