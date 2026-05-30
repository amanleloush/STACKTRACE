import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'power-of-two',
  title: 'Power of Two — n & (n-1) trick',
  caption: 'A power of two has exactly one set bit. Subtracting 1 flips that bit and sets every lower bit → the AND must be zero.',
  tags: [],
  pillar: 'dsa',
  phase: '12-bit-manipulation',
  order: 3,
  premium: false,
};

export default meta;
