import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'counting-bits',
  title: 'Counting Bits — dp[i] = dp[i>>1] + (i&1)',
  caption: 'Number of set bits via DP: drop the low bit (i>>1, already computed) and add 1 if i was odd.',
  tags: [],
  pillar: 'dsa',
  phase: '12-bit-manipulation',
  order: 2,
  premium: false,
};

export default meta;
