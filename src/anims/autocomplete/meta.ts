import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'autocomplete',
  title: 'Autocomplete — trie + top-K cache',
  caption: 'Insert words with frequencies; each node caches the top-K best descendants. Query walks the prefix and reads the cache.',
  tags: ['tree', 'string'],
  pillar: 'dsa',
  phase: '11-trie',
  order: 5,
  premium: false,
};

export default meta;
