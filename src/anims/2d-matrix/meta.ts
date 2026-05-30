import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: '2d-matrix',
  title: 'Search 2D Matrix — staircase from top-right',
  caption: 'Rows and columns are both sorted ascending. From top-right: if cell == target done; if cell > target step left (eliminate column); else step down (eliminate row).',
  tags: ['searching'],
  pillar: 'dsa',
  phase: '03-binary-search',
  order: 5,
  premium: false,
};

export default meta;
