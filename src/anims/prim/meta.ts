import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'prim',
  title: 'Prim MST — grow tree by lightest crossing edge',
  caption: 'Maintain a `visited` set starting at one vertex. Each step: pick the lightest edge with exactly one endpoint in `visited`; add it to the MST and absorb the new endpoint.',
  tags: ['graph'],
  pillar: 'dsa',
  phase: '08-graphs',
  order: 7,
  premium: false,
};

export default meta;
