import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'vector-clock',
  title: 'Vector clocks — causality vs concurrency',
  caption:
    "Three nodes. Each local event bumps that node's counter. Receiving a message takes the element-wise max + 1.",
  tags: ['distsys'],
  pillar: 'systems',
  phase: '05-distributed-systems',
  order: 28,
  premium: false,
};

export default meta;
