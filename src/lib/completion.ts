// "Mark as completed" progress for notes and DSA pages, plus the pure maths
// behind the /progress/ dashboard.
//
// Pure contract shared by the browser store (completion-store.ts), the API
// route (/api/v1/completion) and /progress/: the key rule, request-body
// validation, the limits, migration of the legacy localStorage array, and
// the streak / heatmap / per-phase aggregation. KV access lives in
// completion-kv.ts so this module stays safe to ship to the client.
//
// Keys are `<pillar>:<slug>` — `notes:cap-pacelc-consistency`,
// `dsa:two-sum-sorted` — the same keys NoteCompletion and the roadmap have
// always used. Merges are last-write-wins on `updatedAt` (lww.ts). Un-
// completing keeps the entry with `done: false`: it syncs as a tombstone so
// another device's older "done" copy can't bring it back.

export interface CompletionEntry {
  done: boolean;
  /** Unix ms when the item was (last) marked done; 0 = not done, or done
   *  before timestamps were recorded (migrated from the legacy array). */
  completedAt: number;
  /** Unix ms of the last change, client clock. Drives last-write-wins. */
  updatedAt: number;
}

export type CompletionMap = Record<string, CompletionEntry>;

/** `notes:<slug>` or `dsa:<slug>`; also a key in the stored doc, so be strict. */
export const COMPLETION_KEY_RE = /^(?:notes|dsa):[a-z0-9-]{1,120}$/;
/** The pre-sync storage: one JSON array of completed keys. */
export const LEGACY_KEY = 'stacktrace:completed';
/** `updatedAt` given to migrated legacy entries. Older than any real edit,
 *  so a synced change (e.g. an un-complete on another device) always wins. */
export const LEGACY_UPDATED_AT = 1;
/** How far ahead of the server clock a timestamp may be. */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
/** Most items one account may track. The site has ~260 pages. */
export const MAX_ENTRIES_PER_USER = 5000;
/** Most entries in one batch PUT. */
export const MAX_BATCH_ENTRIES = 200;
/** Cap on the serialized per-user doc (UTF-8 bytes); 5,000 entries come to
 *  about 0.4 MiB, so this is abuse protection only. */
export const MAX_DOC_BYTES = 1024 * 1024;
/** Cap on a batch PUT body (UTF-8 bytes). */
export const MAX_BATCH_BODY_BYTES = MAX_DOC_BYTES;

export function isValidCompletionKey(key: unknown): key is string {
  return typeof key === 'string' && COMPLETION_KEY_RE.test(key);
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isStamp = (v: unknown, min: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min;

/** Strict validation of one entry from a PUT body. */
export function parseCompletionBody(body: unknown, now: number = Date.now()): ParseResult<CompletionEntry> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'entry must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.done !== 'boolean') return { ok: false, error: 'done must be a boolean' };
  if (!isStamp(b.completedAt, 0)) {
    return { ok: false, error: 'completedAt must be a non-negative integer (unix ms)' };
  }
  if (!isStamp(b.updatedAt, 1)) return { ok: false, error: 'updatedAt must be a positive integer (unix ms)' };
  if (b.updatedAt > now + MAX_CLOCK_SKEW_MS || b.completedAt > now + MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: 'timestamp is too far in the future' };
  }
  return {
    ok: true,
    value: { done: b.done, completedAt: b.done ? b.completedAt : 0, updatedAt: b.updatedAt },
  };
}

/**
 * Validate a batch PUT body: `{ entries: { [key]: CompletionEntry } }` with
 * 1..MAX_BATCH_ENTRIES entries. Errors name the key, never other values.
 */
export function parseBatchBody(body: unknown, now: number = Date.now()): ParseResult<CompletionMap> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }
  const entries = (body as Record<string, unknown>).entries;
  if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) {
    return { ok: false, error: 'entries must be an object keyed by <pillar>:<slug>' };
  }
  const keys = Object.keys(entries);
  if (keys.length === 0) return { ok: false, error: 'entries must not be empty' };
  if (keys.length > MAX_BATCH_ENTRIES) {
    return { ok: false, error: `at most ${MAX_BATCH_ENTRIES} entries per request` };
  }
  const out: CompletionMap = {};
  for (const key of keys) {
    if (!isValidCompletionKey(key)) return { ok: false, error: 'every key must look like notes:<slug> or dsa:<slug>' };
    const r = parseCompletionBody((entries as Record<string, unknown>)[key], now);
    if (!r.ok) return { ok: false, error: `${key}: ${r.error}` };
    out[key] = r.value;
  }
  return { ok: true, value: out };
}

/**
 * Lenient read of a stored entry (localStorage or server JSON): repairs
 * numbers, drops what can't be repaired. Never throws.
 */
export function coerceCompletion(raw: unknown): CompletionEntry | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.done !== 'boolean') return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0);
  return { done: r.done, completedAt: r.done ? num(r.completedAt) : 0, updatedAt: num(r.updatedAt) };
}

/**
 * The entry after a local toggle. Re-marking something already done keeps
 * its original completion time; `updatedAt` is strictly increasing per key
 * even if the clock steps back.
 */
export function markEntry(prev: CompletionEntry | null, done: boolean, now: number = Date.now()): CompletionEntry {
  const keepAt = done && prev?.done && prev.completedAt > 0 ? prev.completedAt : 0;
  return {
    done,
    completedAt: done ? keepAt || now : 0,
    updatedAt: Math.max(now, (prev?.updatedAt ?? 0) + 1),
  };
}

/**
 * Entries to create from the legacy `stacktrace:completed` array (raw
 * localStorage string). Keys the new store already has — done or
 * tombstoned — are skipped, so running it again is a no-op and it never
 * resurrects an un-complete. Legacy items have no date: `completedAt` 0.
 */
export function migrateLegacy(raw: string | null, has: (key: string) => boolean): CompletionMap {
  const out: CompletionMap = {};
  if (raw == null) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!Array.isArray(parsed)) return out;
  let n = 0;
  for (const key of parsed) {
    if (n >= MAX_ENTRIES_PER_USER) break;
    if (!isValidCompletionKey(key) || has(key) || out[key]) continue;
    out[key] = { done: true, completedAt: 0, updatedAt: LEGACY_UPDATED_AT };
    n++;
  }
  return out;
}

/** Keys currently marked done. */
export function doneKeys(map: CompletionMap): Set<string> {
  const s = new Set<string>();
  for (const [k, e] of Object.entries(map)) if (e.done) s.add(k);
  return s;
}

// --- Days, streaks and the heatmap ---------------------------------------------
//
// A "day" is a calendar date in the user's timezone, as `YYYY-MM-DD`. Day
// arithmetic goes through a UTC day number, so DST changes can't make a day
// 23 or 25 hours long.

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar day of `ts`, in `timeZone` (IANA name) or the runtime's local zone. */
export function dayKey(ts: number, timeZone?: string): string {
  const d = new Date(ts);
  if (!timeZone) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** `YYYY-MM-DD` → days since 1970-01-01. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y!, m! - 1, d!) / DAY_MS);
}

/** Days since 1970-01-01 → `YYYY-MM-DD`. */
export function dayFromNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

/** Completions per day. Items with no known date (completedAt 0) are skipped. */
export function activityByDay(map: CompletionMap, timeZone?: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of Object.values(map)) {
    if (!e.done || e.completedAt <= 0) continue;
    const k = dayKey(e.completedAt, timeZone);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

export interface Streaks {
  /** Consecutive active days ending today — or yesterday, so a streak isn't
   *  shown as broken before today is over. */
  current: number;
  longest: number;
}

/** Streaks over days with at least one completion. `today` is a day key. */
export function computeStreaks(activeDays: Iterable<string>, today: string): Streaks {
  const days = [...new Set(activeDays)].map(dayNumber).sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev = Number.NaN;
  for (const d of days) {
    run = d === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const set = new Set(days);
  const t = dayNumber(today);
  let current = 0;
  let cursor = set.has(t) ? t : t - 1;
  while (set.has(cursor)) {
    current++;
    cursor--;
  }
  return { current, longest };
}

export interface HeatCell {
  day: string;
  count: number;
  /** 0 (none) .. 4 (busiest), for the colour ramp. */
  level: 0 | 1 | 2 | 3 | 4;
  /** After today: rendered blank. */
  future: boolean;
}

export function heatLevel(count: number): HeatCell['level'] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/**
 * The last `weeks` weeks as whole Sunday-to-Saturday columns, oldest first,
 * column by column (7 cells each) — the last column holds today.
 */
export function heatmapCells(activity: Map<string, number>, today: string, weeks = 12): HeatCell[] {
  const t = dayNumber(today);
  const dow = new Date(t * DAY_MS).getUTCDay(); // 0 = Sunday
  const start = t - dow - 7 * (weeks - 1);
  const cells: HeatCell[] = [];
  for (let n = start; n < start + 7 * weeks; n++) {
    const day = dayFromNumber(n);
    const future = n > t;
    const count = future ? 0 : (activity.get(day) ?? 0);
    cells.push({ day, count, level: heatLevel(count), future });
  }
  return cells;
}

// --- Per-phase aggregation ------------------------------------------------------

export interface Topic {
  /** `<pillar>:<slug>` */
  key: string;
  title: string;
  href: string;
  phase: string;
  order: number;
}

export interface PhaseInfo {
  slug: string;
  num: string;
  title: string;
}

export interface PhaseProgress extends PhaseInfo {
  done: number;
  total: number;
  /** Whole percent, floored so 100 means every topic is done. */
  pct: number;
  /** First incomplete topic in reading order, or null when all are done. */
  next: { title: string; href: string } | null;
}

export function percent(done: number, total: number): number {
  return total > 0 ? Math.floor((done / total) * 100) : 0;
}

/** Completion per phase, in `phases` order; phases with no topics are left out. */
export function aggregatePhases(
  phases: PhaseInfo[],
  topics: Topic[],
  isDone: (key: string) => boolean,
): PhaseProgress[] {
  const byPhase = new Map<string, Topic[]>();
  for (const t of topics) {
    const list = byPhase.get(t.phase) ?? [];
    list.push(t);
    byPhase.set(t.phase, list);
  }
  const out: PhaseProgress[] = [];
  for (const p of phases) {
    const list = (byPhase.get(p.slug) ?? []).slice().sort((a, b) => a.order - b.order);
    if (list.length === 0) continue;
    const done = list.filter((t) => isDone(t.key)).length;
    const nextTopic = list.find((t) => !isDone(t.key));
    out.push({
      ...p,
      done,
      total: list.length,
      pct: percent(done, list.length),
      next: nextTopic ? { title: nextTopic.title, href: nextTopic.href } : null,
    });
  }
  return out;
}

/** Sum of a pillar's phases. */
export function totals(phases: PhaseProgress[]): { done: number; total: number; pct: number } {
  const done = phases.reduce((s, p) => s + p.done, 0);
  const total = phases.reduce((s, p) => s + p.total, 0);
  return { done, total, pct: percent(done, total) };
}
