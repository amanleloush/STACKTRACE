// Server-side persistence for /api/v1/quiz/mistakes, on the existing
// Workers KV namespace bound as `KV`. ONE key per user:
//   qm:v1:<userId>  →  {"v":1,"mistakes":{"<mcqId>":{status,misses,lastPicked,noteSlug,updatedAt}}}
// Read-merge-write mechanics (and their caveats) are shared with the
// company-problem progress: see kv-doc.ts.

import { createKvDoc } from './kv-doc';
import {
  coerceMistake,
  isValidMcqId,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  type MistakeEntry,
} from './mistakes';

export const mistakesDoc = createKvDoc<MistakeEntry>({
  prefix: 'qm',
  field: 'mistakes',
  isValidKey: isValidMcqId,
  coerce: coerceMistake,
  maxEntries: MAX_ENTRIES_PER_USER,
  maxDocBytes: MAX_DOC_BYTES,
});
