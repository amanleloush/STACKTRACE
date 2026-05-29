import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'kafka',
  title: 'Kafka — producer, partitions, consumer group',
  caption:
    'Producer hashes keys to one of 4 partitions. A 3-consumer group splits partitions; rebalance redistributes when one consumer leaves.',
  tags: ['messaging', 'distsys'],
  pillar: 'systems',
  phase: '04-messaging-kafka',
  order: 18,
  premium: false,
};

export default meta;
