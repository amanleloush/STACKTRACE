import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'mergesort',
  title: 'Mergesort — divide & conquer',
  caption:
    'Recursively split into halves, then merge by comparing the heads of each subarray. Stable, O(n log n) worst-case, but uses O(n) extra space.',
  tags: ['sorting'],
  pillar: 'dsa',
  phase: '13-sorting',
  order: 4,
  premium: false,
  defaults: { n: 16, seed: 11 },
};

export default meta;
