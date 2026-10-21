import { kvSyncRoute } from '~/lib/api/kv-sync-route';
import {
  MAX_BATCH_BODY_BYTES,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  parseBatchBody,
} from '~/lib/problem-progress';
import { progressDoc } from '~/lib/problem-progress-kv';

export const prerender = false;

// Company-tracker sync for /dsa/companies/, stored in Workers KV (one doc
// per user — see src/lib/problem-progress-kv.ts). Auth, limits and error
// semantics are shared with the other sync routes: src/lib/api/kv-sync-route.ts.
//
// GET → 200 `{ progress: { [slug]: { solved, notes, updatedAt } } }`
//
// PUT — batch upsert.
//   body `{ entries: { [slug]: { solved, notes, updatedAt } } }` (1..200)
//   200  `{ applied: string[], stale: { [slug]: entry } }` — `stale` holds
//        server copies that were at least as new; the client adopts them.
//   400 bad JSON / slug / entry · 401 anon · 413 body too large, entry cap
//   (5000) or doc size cap (2 MiB) · 415 non-JSON · 503 KV unavailable.

export const { GET, PUT } = kvSyncRoute({
  tag: 'problems/progress',
  field: 'progress',
  doc: progressDoc,
  parseBatch: (body) => parseBatchBody(body),
  maxBodyBytes: MAX_BATCH_BODY_BYTES,
  maxDocBytes: MAX_DOC_BYTES,
  messages: {
    sync: 'Progress sync',
    corrupt: 'Stored progress is unreadable',
    failed: 'Could not sync progress',
    entryLimit: `At most ${MAX_ENTRIES_PER_USER} tracked problems per account`,
    stored: 'Saved progress',
  },
});
