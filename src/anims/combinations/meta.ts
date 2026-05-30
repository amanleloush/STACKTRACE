import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'combinations',
  title: 'Combinations C(n, k) — choose-or-skip',
  caption: 'Walk candidates left→right. At each, include it and recurse, then exclude it and continue.',
  tags: [],
  pillar: 'dsa',
  phase: '06-backtracking',
  order: 3,
  premium: false,
};

export default meta;
