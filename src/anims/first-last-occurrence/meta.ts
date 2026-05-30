import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'first-last-occurrence',
  title: 'First / Last occurrence — biased binary search',
  caption: 'Two binary searches. Phase 1 records ans on equality and pushes hi left (find leftmost). Phase 2 records ans and pushes lo right (find rightmost).',
  tags: ['searching'],
  pillar: 'dsa',
  phase: '03-binary-search',
  order: 2,
  premium: false,
};

export default meta;
