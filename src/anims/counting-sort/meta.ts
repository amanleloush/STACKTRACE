import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'counting-sort',
  title: 'Counting sort — tally and emit',
  caption: 'Build a count array of size K+1. Then walk values 0..K, emit each value count[v] times into the output.',
  tags: ['sorting'],
  pillar: 'dsa',
  phase: '13-sorting',
  order: 7,
  premium: false,
};

export default meta;
