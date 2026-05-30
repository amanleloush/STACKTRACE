import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'coin-change',
  title: 'Coin Change — min coins for amount',
  caption: 'dp[a] = min over coins c of (dp[a-c] + 1). ∞ means unreachable.',
  tags: ['dp'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 4,
  premium: false,
};

export default meta;
