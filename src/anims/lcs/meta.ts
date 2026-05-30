import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'lcs',
  title: 'Longest Common Subsequence — 2D DP',
  caption: 'dp[i][j] = LCS of a[..i] and b[..j]. Match: dp[i-1][j-1]+1. Mismatch: max(dp[i-1][j], dp[i][j-1]).',
  tags: ['dp', 'string'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 6,
  premium: false,
};

export default meta;
