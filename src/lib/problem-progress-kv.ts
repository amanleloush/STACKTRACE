// Server-side persistence for /api/v1/problems/progress, on the existing
// Workers KV namespace bound as `KV` (wrangler.toml). No SQL table.
//
// Storage model — ONE key per user (generic mechanics in kv-doc.ts):
//   pp:v1:<userId>  →  {"v":1,"progress":{"<slug>":{"solved":…,"notes":…,"updatedAt":…}}}
//
// A batch PUT reads the doc once, merges per slug (last-write-wins on
// `updatedAt`), and writes once — only when something changed. KV has no
// compare-and-swap, so two writes racing on the same user doc can drop one
// side's entries; the client heals that on its next load (its local copy
// stays newer, so the load-time merge pushes it again).
//
// Notes are user-private: nothing here logs keys' values.

import type { KVNamespace } from './kv';
import { createKvDoc, getKv, type SaveBatchResult as GenericSaveBatchResult } from './kv-doc';
import {
  coerceEntry,
  isValidSlug,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  type ProgressEntry,
  type ProgressMap,
} from './problem-progress';

export { byteLength, CorruptDocError, DOC_VERSION, KvUnavailableError } from './kv-doc';

export const progressDoc = createKvDoc<ProgressEntry>({
  prefix: 'pp',
  field: 'progress',
  isValidKey: isValidSlug,
  coerce: coerceEntry,
  maxEntries: MAX_ENTRIES_PER_USER,
  maxDocBytes: MAX_DOC_BYTES,
});

export function progressKey(userId: string): string {
  return progressDoc.key(userId);
}

export interface ProgressDoc {
  v: 1;
  progress: ProgressMap;
}

/** Lenient decode of a stored doc; unknown versions / bad entries are dropped. */
export function decodeDoc(raw: string | null): ProgressMap {
  return progressDoc.decode(raw);
}

export function encodeDoc(progress: ProgressMap): string {
  return progressDoc.encode(progress);
}

export function loadProgress(kv: KVNamespace, userId: string): Promise<ProgressMap> {
  return progressDoc.load(kv, userId);
}

export type SaveBatchResult = GenericSaveBatchResult<ProgressEntry>;

/**
 * Read-merge-write for one batch. Over-cap batches are rejected whole
 * (nothing is written) so the stored doc never exceeds either limit.
 */
export function saveBatch(kv: KVNamespace, userId: string, incoming: ProgressMap): Promise<SaveBatchResult> {
  return progressDoc.saveBatch(kv, userId, incoming);
}

/** The request's KV binding, or null when it isn't configured. */
export const getProgressKv = getKv;
