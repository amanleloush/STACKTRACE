import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'consistent-hash',
  title: 'Consistent hashing ring',
  caption:
    'Add or remove servers; only keys whose nearest node changes get re-routed. Without consistent hashing, removing one of N servers would re-shuffle (N-1)/N of all keys.',
  tags: ['hashing', 'sharding', 'distsys'],
  pillar: 'systems',
  phase: '06-hld-patterns',
  order: 31,
  premium: false,
};

export default meta;
