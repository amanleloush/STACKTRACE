import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'k-closest-points',
  title: 'K closest points — max-heap of size K',
  caption: 'Maintain a max-heap of size ≤ K keyed by squared distance. If size exceeds K, pop the farthest. The K closest survive.',
  tags: [],
  pillar: 'dsa',
  phase: '07-heap',
  order: 4,
  premium: false,
};

export default meta;
