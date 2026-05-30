import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'permutations',
  title: 'Permutations — swap-into-position',
  caption: 'At depth i, swap each j ≥ i into position i, recurse on i+1, undo the swap. Each leaf is a permutation.',
  tags: [],
  pillar: 'dsa',
  phase: '06-backtracking',
  order: 2,
  premium: false,
};

export default meta;
