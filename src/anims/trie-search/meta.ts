import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'trie-search',
  title: 'Trie — search word',
  caption: 'Pre-built trie of {car, cat, cab, dog, do}. Walk down matching each char; success only if the final node has end flag.',
  tags: ['tree', 'string'],
  pillar: 'dsa',
  phase: '11-trie',
  order: 2,
  premium: false,
};

export default meta;
