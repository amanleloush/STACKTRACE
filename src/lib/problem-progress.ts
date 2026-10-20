// Per-problem progress (solved flag + free-text notes) for /dsa/companies/.
//
// Pure contract shared by the browser store (src/lib/problem-store.ts) and
// the API route (/api/v1/problems/progress): the slug rule, request-body
// validation, the batch limits, and the last-write-wins merges. KV access
// lives in problem-progress-kv.ts so this module stays safe to ship to the
// client.

export interface ProgressEntry {
  solved: boolean;
  notes: string;
  /** Unix ms of the last edit, client clock. Drives last-write-wins. */
  updatedAt: number;
}

export type ProgressMap = Record<string, ProgressEntry>;

/** LeetCode slugs: lowercase alnum + dashes. Also a key in the stored doc,
 *  so be strict. */
export const SLUG_RE = /^[a-z0-9-]{1,120}$/;
export const MAX_NOTES_CHARS = 20_000;
/** How far ahead of the server clock an `updatedAt` may be. A wildly-future
 *  timestamp would otherwise pin the row forever under last-write-wins. */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
/** Most problems one account may track (the slug regex admits any string). */
export const MAX_ENTRIES_PER_USER = 5000;
/** Most entries in one batch PUT. */
export const MAX_BATCH_ENTRIES = 200;
/** Cap on the serialized per-user document (UTF-8 bytes). KV allows 25 MiB
 *  per value; this keeps reads/writes cheap and bounds abuse. */
export const MAX_DOC_BYTES = 2 * 1024 * 1024;
/** Cap on a batch PUT body (UTF-8 bytes). A body bigger than the whole doc
 *  could never be stored anyway. */
export const MAX_BATCH_BODY_BYTES = MAX_DOC_BYTES;

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validate a PUT body: `{ solved: boolean, notes: string, updatedAt: number }`. */
export function parseProgressBody(body: unknown, now: number = Date.now()): ParseResult<ProgressEntry> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.solved !== 'boolean') return { ok: false, error: 'solved must be a boolean' };
  if (typeof b.notes !== 'string') return { ok: false, error: 'notes must be a string' };
  if (b.notes.length > MAX_NOTES_CHARS) {
    return { ok: false, error: `notes exceeds ${MAX_NOTES_CHARS} characters` };
  }
  const ts = b.updatedAt;
  if (typeof ts !== 'number' || !Number.isSafeInteger(ts) || ts <= 0) {
    return { ok: false, error: 'updatedAt must be a positive integer (unix ms)' };
  }
  if (ts > now + MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: 'updatedAt is too far in the future' };
  }
  return { ok: true, value: { solved: b.solved, notes: b.notes, updatedAt: ts } };
}

/**
 * Validate a batch PUT body: `{ entries: { [slug]: { solved, notes, updatedAt } } }`
 * with 1..MAX_BATCH_ENTRIES entries. Errors name the slug, never the notes.
 */
export function parseBatchBody(body: unknown, now: number = Date.now()): ParseResult<ProgressMap> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }
  const entries = (body as Record<string, unknown>).entries;
  if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) {
    return { ok: false, error: 'entries must be an object keyed by slug' };
  }
  const slugs = Object.keys(entries);
  if (slugs.length === 0) return { ok: false, error: 'entries must not be empty' };
  if (slugs.length > MAX_BATCH_ENTRIES) {
    return { ok: false, error: `at most ${MAX_BATCH_ENTRIES} entries per request` };
  }
  const out: ProgressMap = {};
  for (const slug of slugs) {
    if (!isValidSlug(slug)) {
      return { ok: false, error: 'every slug must match ^[a-z0-9-]{1,120}$' };
    }
    const r = parseProgressBody((entries as Record<string, unknown>)[slug], now);
    if (!r.ok) return { ok: false, error: `${slug}: ${r.error}` };
    out[slug] = r.value;
  }
  return { ok: true, value: out };
}

export interface BatchApplyResult {
  /** The stored map after applying every newer incoming entry. */
  next: ProgressMap;
  /** Slugs whose incoming entry was strictly newer and is now stored. */
  applied: string[];
  /** Server copies that were at least as new as the incoming entry. */
  stale: ProgressMap;
  /** Incoming slugs that are new to the doc (count against the cap). */
  added: number;
}

/**
 * Server-side last-write-wins over a batch: an incoming entry replaces the
 * stored one only when its `updatedAt` is strictly newer; otherwise the
 * stored entry is reported back in `stale` so the client can adopt it.
 * Ties are stale (no flip-flopping between devices). Pure — never mutates
 * `stored`.
 */
export function applyBatch(stored: ProgressMap, incoming: ProgressMap): BatchApplyResult {
  const next: ProgressMap = { ...stored };
  const applied: string[] = [];
  const stale: ProgressMap = {};
  let added = 0;
  for (const [slug, entry] of Object.entries(incoming)) {
    const cur = Object.prototype.hasOwnProperty.call(stored, slug) ? stored[slug] : undefined;
    if (cur && cur.updatedAt >= entry.updatedAt) {
      stale[slug] = cur;
      continue;
    }
    if (!cur) added++;
    next[slug] = entry;
    applied.push(slug);
  }
  return { next, applied: applied.sort(), stale, added };
}

/** Lenient read of a stored entry (localStorage or server JSON). */
export function coerceEntry(raw: unknown): ProgressEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const updatedAt = typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : 0;
  return {
    solved: r.solved === true,
    notes: typeof r.notes === 'string' ? r.notes.slice(0, MAX_NOTES_CHARS) : '',
    updatedAt,
  };
}

/** True when the entry carries something worth listing on /dsa/my-notes/. */
export function isMeaningful(e: ProgressEntry | null | undefined): boolean {
  return !!e && (e.solved || e.notes.trim().length > 0);
}

export interface MergeResult {
  /** Union of both sides, newest `updatedAt` per slug. */
  merged: ProgressMap;
  /** Slugs where the server copy won and must be written locally. */
  pull: string[];
  /** Slugs where the local copy is strictly newer and must be PUT. */
  push: string[];
}

/**
 * Last-write-wins merge by `updatedAt`. Ties go to the server (nothing to
 * push, nothing to pull) so two devices that already agree stay quiet.
 */
export function mergeProgress(local: ProgressMap, server: ProgressMap): MergeResult {
  const merged: ProgressMap = {};
  const pull: string[] = [];
  const push: string[] = [];
  const slugs = new Set([...Object.keys(local), ...Object.keys(server)]);
  for (const slug of slugs) {
    const l = local[slug];
    const s = server[slug];
    if (l && (!s || l.updatedAt > s.updatedAt)) {
      merged[slug] = l;
      push.push(slug);
    } else if (s) {
      merged[slug] = s;
      if (!l || s.updatedAt > l.updatedAt) pull.push(slug);
    }
  }
  return { merged, pull: pull.sort(), push: push.sort() };
}
