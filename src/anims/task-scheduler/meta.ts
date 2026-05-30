import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'task-scheduler',
  title: 'Task scheduler — max-heap + cooldown queue',
  caption: 'Each tick, pop the most-frequent ready task and emit it. If its count is still positive, park it in a cooldown queue for n ticks. When the front of the queue is ready, push it back to the heap.',
  tags: ['greedy'],
  pillar: 'dsa',
  phase: '07-heap',
  order: 5,
  premium: false,
};

export default meta;
