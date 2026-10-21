import { kvSyncRoute } from '~/lib/api/kv-sync-route';
import { MAX_BATCH_BODY_BYTES, MAX_DOC_BYTES, MAX_HIGHLIGHTS, parseBatchBody } from '~/lib/highlights';
import { highlightsDoc } from '~/lib/highlights-kv';

export const prerender = false;

// Highlights + "My notes" sync for notes and DSA pages, stored in Workers
// KV (one doc per user, key `hl:v1:<userId>` — see src/lib/highlights-kv.ts).
// Same auth, limits and error semantics as /api/v1/problems/progress and
// /api/v1/completion (shared in src/lib/api/kv-sync-route.ts).
//
// GET → 200 `{ highlights: { ["h:<id>" | "p:<pillar>:<slug>"]: entry } }`
//
// PUT — batch upsert.
//   body `{ entries: { [key]: entry } }` (1..200)
//   200  `{ applied: string[], stale: { [key]: entry } }` — `stale` holds
//        server copies that were at least as new; the client adopts them.
//   400 bad JSON / key / entry · 401 anon · 413 body too large, entry cap
//   (10,000 incl. page notes and tombstones) or doc size cap (4 MiB) ·
//   415 non-JSON · 503 KV unavailable.

export const { GET, PUT } = kvSyncRoute({
  tag: 'highlights',
  field: 'highlights',
  doc: highlightsDoc,
  parseBatch: (body) => parseBatchBody(body),
  maxBodyBytes: MAX_BATCH_BODY_BYTES,
  maxDocBytes: MAX_DOC_BYTES,
  messages: {
    sync: 'Highlights sync',
    corrupt: 'Stored highlights are unreadable',
    failed: 'Could not sync highlights',
    entryLimit: `At most ${MAX_HIGHLIGHTS} highlights per account`,
    stored: 'Saved highlights',
  },
});
