// Server-side persistence for /api/v1/review, on the existing Workers KV
// namespace bound as `KV`. ONE key per user:
//   rv:v1:<userId>  →  {"v":1,"review":{"<cardId>":{kind:"card",due,interval,…,updatedAt},
//                                       "settings":{kind:"settings",dailyCap,phases,updatedAt}}}
// Read-merge-write mechanics (and their caveats) are shared with the
// company-problem progress and the mistakes notebook: see kv-doc.ts.

import { createKvDoc } from './kv-doc';
import {
  coerceReviewEntry,
  isValidReviewKey,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  type ReviewEntry,
} from './review-schedule';

export const reviewDoc = createKvDoc<ReviewEntry>({
  prefix: 'rv',
  field: 'review',
  isValidKey: isValidReviewKey,
  coerce: coerceReviewEntry,
  maxEntries: MAX_ENTRIES_PER_USER,
  maxDocBytes: MAX_DOC_BYTES,
});
