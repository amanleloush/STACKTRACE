import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'raft',
  title: 'Raft — leader election & log replication',
  caption:
    'Five-node cluster. Kill the leader to trigger an election; partition the network to see Raft refuse progress without a quorum.',
  tags: ['distsys', 'consensus'],
  pillar: 'systems',
  phase: '05-distributed-systems',
  order: 23,
  premium: false,
};

export default meta;
