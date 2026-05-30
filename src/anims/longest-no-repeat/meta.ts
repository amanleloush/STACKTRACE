import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'longest-no-repeat',
  title: 'Longest substring without repeating chars',
  caption: 'Window [l, r]. Extend r; if a[r] already in the window, shrink l until it isn',
  tags: ['string'],
  pillar: 'dsa',
  phase: '02-sliding-window',
  order: 2,
  premium: false,
};

export default meta;
