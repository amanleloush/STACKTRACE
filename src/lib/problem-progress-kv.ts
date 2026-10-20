// Server-side persistence for /api/v1/problems/progress, on the existing
// Workers KV namespace bound as `KV` (wrangler.toml). No SQL table.
//
// Storage model — ONE key per user:
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
import {
  applyBatch,
  coerceEntry,
  isValidSlug,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  type ProgressMap,
} from './problem-progress';

export const DOC_VERSION = 1;

export function progressKey(userId: string): string {
  return `pp:v${DOC_VERSION}:${userId}`;
}

export interface ProgressDoc {
  v: typeof DOC_VERSION;
  progress: ProgressMap;
}

/** Thrown when the KV binding itself fails (network, 429 rate limit, …). */
export class KvUnavailableError extends Error {
  constructor(op: 'get' | 'put', cause: unknown) {
    // Only the op + the platform's message; never the value.
    super(`kv ${op} failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'KvUnavailableError';
  }
}

/** Thrown when the stored value can't be parsed — refuse to overwrite it. */
export class CorruptDocError extends Error {
  constructor() {
    super('stored progress doc is not valid JSON');
    this.name = 'CorruptDocError';
  }
}

const utf8 = new TextEncoder();
export function byteLength(s: string): number {
  return utf8.encode(s).length;
}

/** Lenient decode of a stored doc; unknown versions / bad entries are dropped. */
export function decodeDoc(raw: string | null): ProgressMap {
  if (raw == null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CorruptDocError();
  }
  const out: ProgressMap = {};
  if (typeof parsed !== 'object' || parsed === null) return out;
  const doc = parsed as { v?: unknown; progress?: unknown };
  if (doc.v !== DOC_VERSION || typeof doc.progress !== 'object' || doc.progress === null) return out;
  for (const [slug, e] of Object.entries(doc.progress as Record<string, unknown>)) {
    if (!isValidSlug(slug)) continue;
    const entry = coerceEntry(e);
    if (entry && entry.updatedAt > 0) out[slug] = entry;
  }
  return out;
}

export function encodeDoc(progress: ProgressMap): string {
  const doc: ProgressDoc = { v: DOC_VERSION, progress };
  return JSON.stringify(doc);
}

export async function loadProgress(kv: KVNamespace, userId: string): Promise<ProgressMap> {
  let raw: string | null;
  try {
    raw = await kv.get(progressKey(userId), 'text');
  } catch (e) {
    throw new KvUnavailableError('get', e);
  }
  return decodeDoc(raw);
}

export type SaveBatchResult =
  | { status: 'ok'; applied: string[]; stale: ProgressMap; wrote: boolean }
  | { status: 'entry_limit' }
  | { status: 'size_limit'; bytes: number };

/**
 * Read-merge-write for one batch. Over-cap batches are rejected whole
 * (nothing is written) so the stored doc never exceeds either limit.
 */
export async function saveBatch(
  kv: KVNamespace,
  userId: string,
  incoming: ProgressMap,
): Promise<SaveBatchResult> {
  const stored = await loadProgress(kv, userId);
  const r = applyBatch(stored, incoming);
  if (r.added > 0 && Object.keys(r.next).length > MAX_ENTRIES_PER_USER) {
    return { status: 'entry_limit' };
  }
  if (r.applied.length === 0) {
    return { status: 'ok', applied: [], stale: r.stale, wrote: false };
  }
  const value = encodeDoc(r.next);
  const bytes = byteLength(value);
  if (bytes > MAX_DOC_BYTES) return { status: 'size_limit', bytes };
  try {
    await kv.put(progressKey(userId), value);
  } catch (e) {
    throw new KvUnavailableError('put', e);
  }
  return { status: 'ok', applied: r.applied, stale: r.stale, wrote: true };
}

/** The request's KV binding, or null when it isn't configured. */
export function getProgressKv(
  locals: { runtime?: { env?: { KV?: KVNamespace } } } | undefined,
): KVNamespace | null {
  return locals?.runtime?.env?.KV ?? null;
}
