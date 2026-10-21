// One-JSON-doc-per-user storage on the existing Workers KV binding `KV`
// (wrangler.toml). Shared by every "localStorage first + KV sync" feature:
//
//   <prefix>:v1:<userId>  →  {"v":1,"<field>":{"<key>":{…entry, updatedAt}}}
//
// A batch PUT reads the doc once, merges per key (last-write-wins on
// `updatedAt`, see lww.ts), and writes once — only when something changed.
// KV has no compare-and-swap, so two writes racing on the same user doc can
// drop one side's entries; the client heals that on its next load (its
// local copy stays newer, so the load-time merge pushes it again).
//
// Entries may be user-private: nothing here logs values.

import type { KVNamespace } from './kv';
import { applyLwwBatch, type Timestamped } from './lww';

export const DOC_VERSION = 1;

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
    super('stored doc is not valid JSON');
    this.name = 'CorruptDocError';
  }
}

const utf8 = new TextEncoder();
export function byteLength(s: string): number {
  return utf8.encode(s).length;
}

export type SaveBatchResult<E> =
  | { status: 'ok'; applied: string[]; stale: Record<string, E>; wrote: boolean }
  | { status: 'entry_limit' }
  | { status: 'size_limit'; bytes: number };

export interface KvDocConfig<E extends Timestamped> {
  /** Key prefix, e.g. `pp` → `pp:v1:<userId>`. */
  prefix: string;
  /** Name of the map inside the stored JSON, e.g. `progress`. */
  field: string;
  isValidKey: (key: string) => boolean;
  /** Lenient read of one stored entry; null drops it. */
  coerce: (raw: unknown) => E | null;
  maxEntries: number;
  /** Cap on the serialized doc (UTF-8 bytes). */
  maxDocBytes: number;
}

export interface KvDoc<E extends Timestamped> {
  key(userId: string): string;
  /** Lenient decode; unknown versions / bad entries are dropped. */
  decode(raw: string | null): Record<string, E>;
  encode(map: Record<string, E>): string;
  load(kv: KVNamespace, userId: string): Promise<Record<string, E>>;
  /**
   * Read-merge-write for one batch. Over-cap batches are rejected whole
   * (nothing is written) so the stored doc never exceeds either limit.
   */
  saveBatch(kv: KVNamespace, userId: string, incoming: Record<string, E>): Promise<SaveBatchResult<E>>;
}

export function createKvDoc<E extends Timestamped>(cfg: KvDocConfig<E>): KvDoc<E> {
  const key = (userId: string) => `${cfg.prefix}:v${DOC_VERSION}:${userId}`;

  const decode = (raw: string | null): Record<string, E> => {
    if (raw == null) return {};
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CorruptDocError();
    }
    const out: Record<string, E> = {};
    if (typeof parsed !== 'object' || parsed === null) return out;
    const doc = parsed as Record<string, unknown>;
    const map = doc[cfg.field];
    if (doc.v !== DOC_VERSION || typeof map !== 'object' || map === null) return out;
    for (const [k, e] of Object.entries(map as Record<string, unknown>)) {
      if (!cfg.isValidKey(k)) continue;
      const entry = cfg.coerce(e);
      if (entry && entry.updatedAt > 0) out[k] = entry;
    }
    return out;
  };

  const encode = (map: Record<string, E>): string => JSON.stringify({ v: DOC_VERSION, [cfg.field]: map });

  const load = async (kv: KVNamespace, userId: string): Promise<Record<string, E>> => {
    let raw: string | null;
    try {
      raw = await kv.get(key(userId), 'text');
    } catch (e) {
      throw new KvUnavailableError('get', e);
    }
    return decode(raw);
  };

  const saveBatch = async (
    kv: KVNamespace,
    userId: string,
    incoming: Record<string, E>,
  ): Promise<SaveBatchResult<E>> => {
    const stored = await load(kv, userId);
    const r = applyLwwBatch(stored, incoming);
    if (r.added > 0 && Object.keys(r.next).length > cfg.maxEntries) {
      return { status: 'entry_limit' };
    }
    if (r.applied.length === 0) {
      return { status: 'ok', applied: [], stale: r.stale, wrote: false };
    }
    const value = encode(r.next);
    const bytes = byteLength(value);
    if (bytes > cfg.maxDocBytes) return { status: 'size_limit', bytes };
    try {
      await kv.put(key(userId), value);
    } catch (e) {
      throw new KvUnavailableError('put', e);
    }
    return { status: 'ok', applied: r.applied, stale: r.stale, wrote: true };
  };

  return { key, decode, encode, load, saveBatch };
}

/** The request's KV binding, or null when it isn't configured. */
export function getKv(
  locals: { runtime?: { env?: { KV?: KVNamespace } } } | undefined,
): KVNamespace | null {
  return locals?.runtime?.env?.KV ?? null;
}
