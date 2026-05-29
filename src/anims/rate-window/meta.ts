import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'rate-window',
  title: 'Fixed window vs sliding window',
  caption:
    'Send a burst right at a window boundary. Fixed window allows 2× limit at the edge; sliding window smooths it out.',
  tags: ['rate-limit', 'distsys'],
  pillar: 'systems',
  phase: '05-distributed-systems',
  order: 25,
  premium: false,
};

export default meta;
