// Per-problem progress (solved flag + free-text notes) for /dsa/companies/.
//
// Pure contract shared by the browser store (src/lib/problem-store.ts) and
// the API routes (/api/v1/problems/progress/*): the slug rule, request-body
// validation, and the last-write-wins merge. DB access lives in
// problem-progress-db.ts so this module stays safe to ship to the client.

export interface ProgressEntry {
  solved: boolean;
  notes: string;
  /** Unix ms of the last edit, client clock. Drives last-write-wins. */
  updatedAt: number;
}

export type ProgressMap = Record<string, ProgressEntry>;

/** LeetCode slugs: lowercase alnum + dashes. Also the DB key, so be strict. */
export const SLUG_RE = /^[a-z0-9-]{1,120}$/;
export const MAX_NOTES_CHARS = 20_000;
/** How far ahead of the server clock an `updatedAt` may be. A wildly-future
 *  timestamp would otherwise pin the row forever under last-write-wins. */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

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
