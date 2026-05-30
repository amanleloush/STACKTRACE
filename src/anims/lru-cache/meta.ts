import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'lru-cache',
  title: 'LRU Cache — doubly linked list + hashmap',
  caption: 'Most-recent at head, LRU at tail. get/put move/insert at head; if size exceeds cap, evict tail. Map gives O(1) node lookup.',
  tags: ['linked-list', 'caching'],
  pillar: 'dsa',
  phase: '14-linked-list',
  order: 5,
  premium: false,
};

export default meta;
