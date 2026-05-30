import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'remove-duplicates',
  title: 'Remove duplicates — slow/fast pointer',
  caption: 'slow tracks the write index; fast scans the array; copy only when a[fast] != a[slow].',
  tags: [],
  pillar: 'dsa',
  phase: '01-two-pointers',
  order: 3,
  premium: false,
};

export default meta;
