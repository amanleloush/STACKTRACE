import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'next-greater',
  title: 'Next Greater Element — monotonic stack',
  caption: 'Walk left→right. Stack holds indices waiting for a greater value. On each a[i], pop everything smaller and answer them with a[i].',
  tags: ['stack-queue'],
  pillar: 'dsa',
  phase: '15-stack-monotonic',
  order: 2,
  premium: false,
};

export default meta;
