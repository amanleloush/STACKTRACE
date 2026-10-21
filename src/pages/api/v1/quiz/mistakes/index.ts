import { kvSyncRoute } from '~/lib/api/kv-sync-route';
import {
  MAX_BATCH_BODY_BYTES,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  parseBatchBody,
} from '~/lib/mistakes';
import { mistakesDoc } from '~/lib/mistakes-kv';

export const prerender = false;

// Mistakes-notebook sync for /review/mistakes/, stored in Workers KV (one
// doc per user, key `qm:v1:<userId>` — see src/lib/mistakes-kv.ts). Same
// auth, limits and error semantics as /api/v1/problems/progress (shared in
// src/lib/api/kv-sync-route.ts).
//
// GET → 200 `{ mistakes: { [mcqId]: { status, misses, lastPicked, noteSlug, updatedAt } } }`
//
// PUT — batch upsert.
//   body `{ entries: { [mcqId]: entry } }` (1..200)
//   200  `{ applied: string[], stale: { [mcqId]: entry } }` — `stale` holds
//        server copies that were at least as new; the client adopts them.
//   400 bad JSON / id / entry · 401 anon · 413 body too large, entry cap
//   (5000) or doc size cap (2 MiB) · 415 non-JSON · 503 KV unavailable.

export const { GET, PUT } = kvSyncRoute({
  tag: 'quiz/mistakes',
  field: 'mistakes',
  doc: mistakesDoc,
  parseBatch: (body) => parseBatchBody(body),
  maxBodyBytes: MAX_BATCH_BODY_BYTES,
  maxDocBytes: MAX_DOC_BYTES,
  messages: {
    sync: 'Mistakes sync',
    corrupt: 'Stored mistakes are unreadable',
    failed: 'Could not sync mistakes',
    entryLimit: `At most ${MAX_ENTRIES_PER_USER} saved questions per account`,
    stored: 'Saved mistakes',
  },
});
