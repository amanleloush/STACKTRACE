import { kvSyncRoute } from '~/lib/api/kv-sync-route';
import {
  MAX_BATCH_BODY_BYTES,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  parseBatchBody,
} from '~/lib/completion';
import { completionDoc } from '~/lib/completion-kv';

export const prerender = false;

// "Mark as completed" sync for notes and DSA pages, stored in Workers KV
// (one doc per user, key `nc:v1:<userId>` — see src/lib/completion-kv.ts).
// Same auth, limits and error semantics as /api/v1/problems/progress
// (shared in src/lib/api/kv-sync-route.ts).
//
// GET → 200 `{ completion: { ["notes:<slug>" | "dsa:<slug>"]: { done, completedAt, updatedAt } } }`
//
// PUT — batch upsert.
//   body `{ entries: { [key]: entry } }` (1..200)
//   200  `{ applied: string[], stale: { [key]: entry } }` — `stale` holds
//        server copies that were at least as new; the client adopts them.
//   400 bad JSON / key / entry · 401 anon · 413 body too large, entry cap
//   (5000) or doc size cap (1 MiB) · 415 non-JSON · 503 KV unavailable.

export const { GET, PUT } = kvSyncRoute({
  tag: 'completion',
  field: 'completion',
  doc: completionDoc,
  parseBatch: (body) => parseBatchBody(body),
  maxBodyBytes: MAX_BATCH_BODY_BYTES,
  maxDocBytes: MAX_DOC_BYTES,
  messages: {
    sync: 'Progress sync',
    corrupt: 'Stored progress is unreadable',
    failed: 'Could not sync progress',
    entryLimit: `At most ${MAX_ENTRIES_PER_USER} completed topics per account`,
    stored: 'Saved progress',
  },
});
