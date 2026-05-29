import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: 'lsm-btree',
  title: 'LSM tree vs B+ tree on writes',
  caption:
    'B+ tree updates pages in place (random I/O, low write-amp on the leaves, high on the journal). LSM appends to memtable then flushes; periodic compaction merges SSTables.',
  tags: ['db', 'distsys'],
  pillar: 'systems',
  phase: '02-databases',
  order: 8,
  premium: false,
};

export default meta;
