import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'rotated-search',
  title: 'Search in rotated sorted array',
  caption: 'At every mid, exactly one half [lo..mid] or [mid..hi] is sorted. Identify it, check if target lies inside, then descend into the half that must contain it.',
  tags: ['searching'],
  pillar: 'dsa',
  phase: '03-binary-search',
  order: 3,
  premium: false,
};

export default meta;
