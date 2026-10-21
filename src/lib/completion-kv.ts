// Server-side persistence for /api/v1/completion, on the existing Workers
// KV namespace bound as `KV`. ONE key per user:
//   nc:v1:<userId>  →  {"v":1,"completion":{"notes:<slug>":{done,completedAt,updatedAt}}}
// Read-merge-write mechanics (and their caveats) are shared with the
// company-problem progress and the mistakes notebook: see kv-doc.ts.

import { createKvDoc } from './kv-doc';
import {
  coerceCompletion,
  isValidCompletionKey,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  type CompletionEntry,
} from './completion';

export const completionDoc = createKvDoc<CompletionEntry>({
  prefix: 'nc',
  field: 'completion',
  isValidKey: isValidCompletionKey,
  coerce: coerceCompletion,
  maxEntries: MAX_ENTRIES_PER_USER,
  maxDocBytes: MAX_DOC_BYTES,
});
