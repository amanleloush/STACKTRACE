import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'word-break',
  title: 'Word Break — boolean DP over prefixes',
  caption: 'dp[i] = can s[0..i] be split into dictionary words? True if some j with dp[j] AND s[j..i] in dict.',
  tags: ['dp', 'string'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 10,
  premium: false,
};

export default meta;
