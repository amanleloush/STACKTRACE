// Mistakes notebook: every quiz question a user got wrong, keyed by MCQ id
// (`<note slug>:<hash of question>`, see mcqId() in content-extract.ts).
//
// Pure contract shared by the browser store (mistakes-store.ts), the API
// route (/api/v1/quiz/mistakes) and the /review/mistakes/ page: the id
// rule, the state transitions, request-body validation and the limits.
// Merges are last-write-wins on `updatedAt` (lww.ts), exactly like the
// company-problem progress. KV access lives in mistakes-kv.ts so this
// module stays safe to ship to the client.
//
// A resolved entry is kept, not deleted: it syncs as a tombstone so the
// question doesn't come back as "open" from another device's older copy.

export type MistakeStatus = 'open' | 'resolved';

export interface MistakeEntry {
  status: MistakeStatus;
  /** How many times this question was answered wrong (ever). */
  misses: number;
  /** Option index of the most recent wrong pick. */
  lastPicked: number;
  noteSlug: string;
  /** Unix ms of the last change, client clock. Drives last-write-wins. */
  updatedAt: number;
}

export type MistakeMap = Record<string, MistakeEntry>;

/** Note slugs: lowercase alnum + dashes (file basenames). */
export const NOTE_SLUG_RE = /^[a-z0-9-]{1,120}$/;
/** `<note slug>:<FNV-1a base36>`; also a key in the stored doc, so be strict. */
export const MCQ_ID_RE = /^[a-z0-9-]{1,120}:[a-z0-9]{1,13}$/;
/** How far ahead of the server clock an `updatedAt` may be. */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
/** Most questions one account may track. The site has ~1,400 MCQs. */
export const MAX_ENTRIES_PER_USER = 5000;
/** Most entries in one batch PUT. */
export const MAX_BATCH_ENTRIES = 200;
/** Cap on the serialized per-user doc (UTF-8 bytes). 5,000 entries come to
 *  roughly 0.6 MiB, so this is pure abuse protection. */
export const MAX_DOC_BYTES = 2 * 1024 * 1024;
/** Cap on a batch PUT body (UTF-8 bytes). */
export const MAX_BATCH_BODY_BYTES = MAX_DOC_BYTES;
/** Clamp for counters coming from storage / the network. */
export const MAX_MISSES = 1_000_000;
/** MCQ.astro supports at most 8 options (letters A–H). */
export const MAX_OPTION_INDEX = 7;

export function isValidMcqId(id: unknown): id is string {
  return typeof id === 'string' && MCQ_ID_RE.test(id);
}

/** The note slug an id belongs to (everything before the last `:`). */
export function slugOfId(id: string): string {
  return id.slice(0, id.lastIndexOf(':'));
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;

/** Strict validation of one entry from a PUT body. */
export function parseMistakeBody(body: unknown, now: number = Date.now()): ParseResult<MistakeEntry> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'entry must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  if (b.status !== 'open' && b.status !== 'resolved') {
    return { ok: false, error: "status must be 'open' or 'resolved'" };
  }
  if (!isInt(b.misses, 0, MAX_MISSES)) return { ok: false, error: 'misses must be a non-negative integer' };
  if (!isInt(b.lastPicked, -1, MAX_OPTION_INDEX)) {
    return { ok: false, error: `lastPicked must be an integer in -1..${MAX_OPTION_INDEX}` };
  }
  if (typeof b.noteSlug !== 'string' || !NOTE_SLUG_RE.test(b.noteSlug)) {
    return { ok: false, error: 'noteSlug must match ^[a-z0-9-]{1,120}$' };
  }
  const ts = b.updatedAt;
  if (typeof ts !== 'number' || !Number.isSafeInteger(ts) || ts <= 0) {
    return { ok: false, error: 'updatedAt must be a positive integer (unix ms)' };
  }
  if (ts > now + MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: 'updatedAt is too far in the future' };
  }
  return {
    ok: true,
    value: { status: b.status, misses: b.misses, lastPicked: b.lastPicked, noteSlug: b.noteSlug, updatedAt: ts },
  };
}

/**
 * Validate a batch PUT body: `{ entries: { [mcqId]: MistakeEntry } }` with
 * 1..MAX_BATCH_ENTRIES entries. Errors name the id, never other values.
 */
export function parseBatchBody(body: unknown, now: number = Date.now()): ParseResult<MistakeMap> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }
  const entries = (body as Record<string, unknown>).entries;
  if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) {
    return { ok: false, error: 'entries must be an object keyed by question id' };
  }
  const ids = Object.keys(entries);
  if (ids.length === 0) return { ok: false, error: 'entries must not be empty' };
  if (ids.length > MAX_BATCH_ENTRIES) {
    return { ok: false, error: `at most ${MAX_BATCH_ENTRIES} entries per request` };
  }
  const out: MistakeMap = {};
  for (const id of ids) {
    if (!isValidMcqId(id)) return { ok: false, error: 'every id must look like <note-slug>:<hash>' };
    const r = parseMistakeBody((entries as Record<string, unknown>)[id], now);
    if (!r.ok) return { ok: false, error: `${id}: ${r.error}` };
    out[id] = r.value;
  }
  return { ok: true, value: out };
}

/**
 * Lenient read of a stored entry (localStorage or server JSON): clamps
 * numbers, and drops values that can't be repaired (unknown status, bad
 * slug). Never throws.
 */
export function coerceMistake(raw: unknown): MistakeEntry | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.status !== 'open' && r.status !== 'resolved') return null;
  if (typeof r.noteSlug !== 'string' || !NOTE_SLUG_RE.test(r.noteSlug)) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0);
  const misses = Math.min(MAX_MISSES, Math.max(0, num(r.misses)));
  const lp = num(r.lastPicked);
  return {
    status: r.status,
    misses,
    lastPicked: lp >= -1 && lp <= MAX_OPTION_INDEX ? lp : -1,
    noteSlug: r.noteSlug,
    updatedAt: Math.max(0, num(r.updatedAt)),
  };
}

/** Next `updatedAt`: strictly increasing per id, even if the clock steps back. */
function nextStamp(prev: MistakeEntry | null, now: number): number {
  return Math.max(now, (prev?.updatedAt ?? 0) + 1);
}

/** A wrong answer: (re)open the question, count the miss, remember the pick. */
export function recordWrong(
  prev: MistakeEntry | null,
  picked: number,
  noteSlug: string,
  now: number = Date.now(),
): MistakeEntry {
  return {
    status: 'open',
    misses: Math.min(MAX_MISSES, (prev?.misses ?? 0) + 1),
    lastPicked: isInt(picked, 0, MAX_OPTION_INDEX) ? picked : -1,
    noteSlug,
    updatedAt: nextStamp(prev, now),
  };
}

/**
 * A right answer resolves an open question. Returns null when there is
 * nothing to change (never missed, or already resolved), so a correct
 * first try doesn't create an entry.
 */
export function recordRight(prev: MistakeEntry | null, now: number = Date.now()): MistakeEntry | null {
  if (!prev || prev.status !== 'open') return null;
  return { ...prev, status: 'resolved', updatedAt: nextStamp(prev, now) };
}

export interface Buckets {
  /** Open questions that still exist — re-answerable. */
  open: string[];
  /** Open questions whose id is gone (the question text was edited). */
  orphans: string[];
  /** Resolved questions not hidden by "Clear resolved". */
  resolved: string[];
}

/**
 * Split the notebook for /review/mistakes/. `known` says whether an id is
 * still in mcqs.json. Resolved entries changed at or before `clearedAt`
 * are hidden, and so are resolved orphans (there's nothing to show).
 */
export function bucketMistakes(map: MistakeMap, known: (id: string) => boolean, clearedAt: number): Buckets {
  const out: Buckets = { open: [], orphans: [], resolved: [] };
  for (const [id, e] of Object.entries(map)) {
    if (e.status === 'open') (known(id) ? out.open : out.orphans).push(id);
    else if (known(id) && e.updatedAt > clearedAt) out.resolved.push(id);
  }
  return out;
}

/**
 * Backtick spans of MCQ text as parts: odd-indexed parts were inside `…`
 * and render as code, the rest as plain (escaped) text — the same rule as
 * MCQ.astro and inlineCodeHtml() in content-extract.ts, without pulling the
 * MDX toolchain into the browser.
 */
export function inlineParts(s: string): Array<{ text: string; code: boolean }> {
  return s.split('`').map((text, i) => ({ text, code: i % 2 === 1 }));
}

/** One row of /review/mcqs.json. */
export interface McqRecord {
  q: string;
  options: string[];
  answer: number;
  explanationHtml: string;
  noteSlug: string;
  noteTitle: string;
  phase: string;
}
