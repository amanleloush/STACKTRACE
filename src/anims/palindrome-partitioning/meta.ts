import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'palindrome-partitioning',
  title: 'Palindrome Partitioning — minimum cuts',
  caption: 'cuts[i] = min cuts for s[0..i]. If s[j..i] is a palindrome and dp[j-1] is solved, cuts[i] = min(cuts[i], cuts[j-1]+1).',
  tags: ['dp', 'string'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 11,
  premium: false,
};

export default meta;
