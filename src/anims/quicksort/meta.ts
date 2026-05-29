import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'quicksort',
  title: 'Quicksort — Lomuto partition',
  caption:
    'Pivot moves to its final position, then the array splits around it. Watch comparisons, swaps, and the boundary advance.',
  tags: ['sorting'],
  pillar: 'dsa',
  phase: 'sorting',
  order: 1,
  premium: false,
  defaults: { n: 16, seed: 7 },
};

export default meta;
