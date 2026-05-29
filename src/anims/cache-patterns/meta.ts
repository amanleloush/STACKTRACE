import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'cache-patterns',
  title: 'Cache patterns — flow comparison',
  caption:
    'Watch the request and response paths for each cache strategy. The number of round-trips and where staleness can creep in differs in each.',
  tags: ['caching'],
  pillar: 'systems',
  phase: '03-caching-redis',
  order: 14,
  premium: false,
};

export default meta;
