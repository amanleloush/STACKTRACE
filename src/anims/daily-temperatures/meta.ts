import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'daily-temperatures',
  title: 'Daily Temperatures — monotonic decreasing stack of indices',
  caption: 'Stack stores indices waiting for a warmer day. On each i, pop everything cooler and answer those days with (i - popped).',
  tags: ['stack-queue'],
  pillar: 'dsa',
  phase: '15-stack-monotonic',
  order: 3,
  premium: false,
};

export default meta;
