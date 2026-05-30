import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'largest-rectangle',
  title: 'Largest Rectangle in Histogram — monotonic stack',
  caption: 'Maintain a stack of strictly increasing heights. On a drop, pop and compute the rectangle bounded by neighbours.',
  tags: ['stack-queue'],
  pillar: 'dsa',
  phase: '15-stack-monotonic',
  order: 4,
  premium: false,
};

export default meta;
