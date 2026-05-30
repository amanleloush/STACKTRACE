import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'quick-sort',
  title: 'Quicksort — Lomuto partition',
  caption: 'Pick a pivot. Walk i,j; whenever a[j] ≤ pivot, swap a[i++] and a[j]. After: pivot lands at index i.',
  tags: ['sorting'],
  pillar: 'dsa',
  phase: '13-sorting',
  order: 5,
  premium: false,
};

export default meta;
