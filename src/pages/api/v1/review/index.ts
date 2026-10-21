import { kvSyncRoute } from '~/lib/api/kv-sync-route';
import {
  MAX_BATCH_BODY_BYTES,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  parseBatchBody,
} from '~/lib/review-schedule';
import { reviewDoc } from '~/lib/review-kv';

export const prerender = false;

// Daily-review sync for /review/, stored in Workers KV (one doc per user,
// key `rv:v1:<userId>` — see src/lib/review-kv.ts). Same auth, limits and
// error semantics as /api/v1/quiz/mistakes (shared in
// src/lib/api/kv-sync-route.ts).
//
// GET → 200 `{ review: { [cardId]: CardState, settings?: ReviewSettings } }`
//
// PUT — batch upsert, last-write-wins per key on `updatedAt`.
//   body `{ entries: { [cardId | 'settings']: entry } }` (1..200)
//   200  `{ applied: string[], stale: { [key]: entry } }` — `stale` holds
//        server copies that were at least as new; the client adopts them.
//   400 bad JSON / key / entry · 401 anon · 413 body too large, entry cap
//   (5000) or doc size cap (2 MiB) · 415 non-JSON · 503 KV unavailable.

export const { GET, PUT } = kvSyncRoute({
  tag: 'review',
  field: 'review',
  doc: reviewDoc,
  parseBatch: (body) => parseBatchBody(body),
  maxBodyBytes: MAX_BATCH_BODY_BYTES,
  maxDocBytes: MAX_DOC_BYTES,
  messages: {
    sync: 'Review sync',
    corrupt: 'Stored review schedule is unreadable',
    failed: 'Could not sync your review schedule',
    entryLimit: `At most ${MAX_ENTRIES_PER_USER} review cards per account`,
    stored: 'Saved review schedule',
  },
});
