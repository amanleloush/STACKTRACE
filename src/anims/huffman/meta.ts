import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'huffman',
  title: 'Huffman — greedy tree from a min-heap',
  caption: 'Pop two smallest-freq nodes, merge into a parent with freq=sum, push back. Repeat until one node remains: the Huffman tree.',
  tags: ['greedy'],
  pillar: 'dsa',
  phase: '10-greedy',
  order: 4,
  premium: false,
};

export default meta;
