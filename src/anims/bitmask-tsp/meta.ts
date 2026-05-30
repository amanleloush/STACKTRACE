import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'bitmask-tsp',
  title: 'Bitmask TSP — dp[mask][i]',
  caption: 'dp[mask][i] = min cost ending at city i with visited-set mask. Relax in increasing popcount order; tour cost = min(dp[FULL][i] + dist[i][0]).',
  tags: ['dp'],
  pillar: 'dsa',
  phase: '12-bit-manipulation',
  order: 4,
  premium: false,
};

export default meta;
