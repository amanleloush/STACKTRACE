import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'bucket',
  title: 'Token bucket vs leaky bucket',
  caption:
    'Token bucket allows bursts up to capacity; leaky bucket smooths to a constant rate. Click "send burst (10)" to compare.',
  tags: ['rate-limit', 'distsys'],
  pillar: 'systems',
  phase: '05-distributed-systems',
  order: 25,
  premium: false,
};

export default meta;
