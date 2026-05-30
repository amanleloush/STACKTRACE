import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'fibonacci-dp',
  title: 'Fibonacci — bottom-up tabulation',
  caption: 'dp[i] = dp[i-1] + dp[i-2]. Each cell reads two cells to its left.',
  tags: ['dp'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 1,
  premium: false,
};

export default meta;
