import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'house-robber',
  title: 'House Robber — 1D DP',
  caption: 'dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Skip this house (carry forward) or rob it (and skip the previous).',
  tags: ['dp'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 2,
  premium: false,
};

export default meta;
