import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'min-window-substring',
  title: 'Min Window Substring — expand then shrink',
  caption: 'Expand r until every char in t is covered; then shrink l while still covering. Track the smallest cover.',
  tags: ['string'],
  pillar: 'dsa',
  phase: '02-sliding-window',
  order: 3,
  premium: false,
};

export default meta;
