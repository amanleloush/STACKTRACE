import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'activity-selection',
  title: 'Activity Selection — earliest-finish greedy',
  caption: 'Sort by finish time. Scan; pick the next activity whose start ≥ previous chosen finish. Always optimal.',
  tags: ['greedy'],
  pillar: 'dsa',
  phase: '10-greedy',
  order: 1,
  premium: false,
};

export default meta;
