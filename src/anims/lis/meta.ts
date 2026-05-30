import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'lis',
  title: 'Longest Increasing Subsequence — O(n log n) patience',
  caption: 'tails[k] = smallest possible tail of any length-(k+1) increasing subsequence seen so far. Binary search to place each value.',
  tags: ['dp'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 5,
  premium: false,
};

export default meta;
