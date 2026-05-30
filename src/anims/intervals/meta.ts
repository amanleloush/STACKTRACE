import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'intervals',
  title: 'Merge Intervals — sweep & extend',
  caption: 'Sort by start. Walk; if current.start ≤ last.end, extend last.end. Otherwise append a new interval.',
  tags: ['greedy'],
  pillar: 'dsa',
  phase: '10-greedy',
  order: 5,
  premium: false,
};

export default meta;
