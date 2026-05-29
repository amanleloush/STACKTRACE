import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'saga',
  title: 'Saga vs 2-phase commit',
  caption:
    'Both want atomicity across services. 2PC holds locks across all participants; Saga uses local commits + compensations.',
  tags: ['distsys'],
  pillar: 'systems',
  phase: '05-distributed-systems',
  order: 24,
  premium: false,
};

export default meta;
