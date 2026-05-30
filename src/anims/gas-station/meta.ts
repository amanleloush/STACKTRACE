import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'gas-station',
  title: 'Gas Station — single-pass tank',
  caption: 'Track running tank and total. Whenever tank goes negative, no station before i+1 can be the start; reset.',
  tags: ['greedy'],
  pillar: 'dsa',
  phase: '10-greedy',
  order: 3,
  premium: false,
};

export default meta;
