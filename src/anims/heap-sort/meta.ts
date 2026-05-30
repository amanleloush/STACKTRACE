import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'heap-sort',
  title: 'Heap sort — build max-heap, repeatedly swap root to tail',
  caption: 'First build a max-heap. Then swap root with last, shrink the heap, sift the root down. Sorted region grows from the end.',
  tags: ['sorting'],
  pillar: 'dsa',
  phase: '13-sorting',
  order: 6,
  premium: false,
};

export default meta;
