// Server-side persistence for /api/v1/highlights, on the existing Workers
// KV namespace bound as `KV`. ONE key per user:
//   hl:v1:<userId>  →  {"v":1,"highlights":{"h:<id>":{…},"p:notes:<slug>":{…}}}
// Read-merge-write mechanics (and their caveats) are shared with the
// company-problem progress, the mistakes notebook and completion: see
// kv-doc.ts.

import { createKvDoc } from './kv-doc';
import { coerceHlEntry, isValidHlKey, MAX_DOC_BYTES, MAX_DOC_ENTRIES, type HlEntry } from './highlights';

export const highlightsDoc = createKvDoc<HlEntry>({
  prefix: 'hl',
  field: 'highlights',
  isValidKey: isValidHlKey,
  coerce: coerceHlEntry,
  maxEntries: MAX_DOC_ENTRIES,
  maxDocBytes: MAX_DOC_BYTES,
});
