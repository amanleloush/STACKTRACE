import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'knapsack-unbounded',
  title: 'Unbounded Knapsack — items reusable',
  caption: 'dp[w] = max value with capacity w. Inner loop fills LEFT→RIGHT so dp[w-wt] may already include the current item again.',
  tags: ['dp'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 9,
  premium: false,
};

export default meta;
