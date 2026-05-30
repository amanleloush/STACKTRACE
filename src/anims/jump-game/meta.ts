import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'jump-game',
  title: 'Jump Game — greedy farthest reach',
  caption: 'Track farthest reachable index. If i ever exceeds it, return false. If farthest covers n-1, true.',
  tags: ['greedy'],
  pillar: 'dsa',
  phase: '10-greedy',
  order: 2,
  premium: false,
};

export default meta;
