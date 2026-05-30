import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'top-k',
  title: 'Top K largest — min-heap of size K',
  caption: 'Keep a min-heap of size K. Push each element; if size > K, pop the smallest. End: heap holds K largest.',
  tags: [],
  pillar: 'dsa',
  phase: '07-heap',
  order: 1,
  premium: false,
};

export default meta;
