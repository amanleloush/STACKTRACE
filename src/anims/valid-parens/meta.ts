import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'valid-parens',
  title: 'Valid Parentheses — matching stack',
  caption: 'Push openers. On a closer, pop and check match. End must be empty.',
  tags: ['stack-queue'],
  pillar: 'dsa',
  phase: '15-stack-monotonic',
  order: 1,
  premium: false,
};

export default meta;
