import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'edit-distance',
  title: 'Edit Distance (Levenshtein) — 2D DP',
  caption: 'dp[i][j] = edits to transform a[..i] → b[..j]. Same char: carry diagonal. Else: 1 + min(insert, delete, replace).',
  tags: ['dp', 'string'],
  pillar: 'dsa',
  phase: '09-dp',
  order: 7,
  premium: false,
};

export default meta;
