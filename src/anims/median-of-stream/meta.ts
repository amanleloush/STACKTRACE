import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'median-of-stream',
  title: 'Median of stream — two heaps',
  caption: 'Lower half is a max-heap (we store negatives so the array-sort visual still shows the root at index 0). Upper half is a min-heap. Keep sizes within one.',
  tags: [],
  pillar: 'dsa',
  phase: '07-heap',
  order: 3,
  premium: false,
};

export default meta;
