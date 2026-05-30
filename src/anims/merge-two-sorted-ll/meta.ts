import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'merge-two-sorted-ll',
  title: 'Merge two sorted lists — dummy head + tail',
  caption: 'Compare a.head vs b.head; thread the smaller onto the merged tail; advance that pointer. Append the leftover list at the end.',
  tags: ['linked-list', 'sorting'],
  pillar: 'dsa',
  phase: '14-linked-list',
  order: 3,
  premium: false,
};

export default meta;
