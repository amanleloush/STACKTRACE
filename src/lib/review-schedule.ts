// Daily review queue (/review/): spaced repetition over two kinds of card.
//
//   n:<note slug>  / d:<dsa slug>   one-liner cards, built at build time
//                                   (/review/cards.json)
//   m:<mcq id>                      every OPEN mistake from the mistakes
//                                   notebook, asked as the MCQ itself
//
// Pure contract shared by the browser store (review-store.ts), the API
// route (/api/v1/review) and the page: card ids, the scheduler, the queue
// builder, validation and coercion. Safe to ship to the client. Merges are
// last-write-wins per card on `updatedAt` (lww.ts), like the mistakes
// notebook; settings live in the same doc under the key `settings`.
//
// ── Scheduler: simplified SM-2 ─────────────────────────────────────────────
// Every card carries an `ease` (interval multiplier, 1.3..3.0, starts at 2.5),
// an `interval` in days and `reps` (successful reviews since the last lapse).
//
//   Learning (reps = 0: brand new, or just lapsed)
//     Again → stays in learning, due again in 10 minutes
//     Hard / Good → 1 day      Easy → 4 days, ease +0.15
//   Review (reps ≥ 1)
//     Again → lapse: lapses +1, ease −0.20, back to learning (10 minutes)
//     Hard  → interval × 1.2,          ease −0.15
//     Good  → interval × ease
//     Easy  → interval × ease × 1.3,   ease +0.15
//   A successful review always grows the interval by at least one day, and
//   intervals are capped at 365 days. A card is "due today" when its due
//   time falls before the end of the user's local day, so a 1-day card
//   reviewed at 23:00 is due the next morning.
//
// Mistake cards graduate when a successful review gives them an interval of
// GRADUATE_DAYS or more (three Good answers: 1d → 3d → 8d). Graduating
// resolves the question in the mistakes notebook too.
//
// New one-liner cards are introduced at most `dailyCap` per local day
// (counted from each card's `firstSeen`, so the count syncs across
// devices). Open mistakes are not capped: they're always due.

export type Rating = 'again' | 'hard' | 'good' | 'easy';
export const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];

export interface CardState {
  kind: 'card';
  /** Unix ms when the card is next due. */
  due: number;
  /** Days; 0 while learning. */
  interval: number;
  ease: number;
  /** Successful reviews since the last lapse. */
  reps: number;
  lapses: number;
  /** Unix ms of the first review (drives the daily new-card cap). */
  firstSeen: number;
  /** Unix ms of the last review. */
  lastReview: number;
  /** Mistake cards only: reached GRADUATE_DAYS and resolved. */
  graduated: boolean;
  updatedAt: number;
}

export interface ReviewSettings {
  kind: 'settings';
  /** New one-liner cards per local day. */
  dailyCap: number;
  /** `notes/<phase>` / `dsa/<phase>` keys to study; empty = everything. */
  phases: string[];
  updatedAt: number;
}

export type ReviewEntry = CardState | ReviewSettings;
export type ReviewMap = Record<string, ReviewEntry>;

export const SETTINGS_KEY = 'settings';
export const DEFAULT_DAILY_CAP = 15;
export const MAX_DAILY_CAP = 200;
export const MAX_PHASES = 64;
export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL_DAYS = 365;
export const LEARNING_STEP_MS = 10 * 60 * 1000;
export const GRADUATE_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Most cards one account may track (settings included). */
export const MAX_ENTRIES_PER_USER = 5000;
export const MAX_BATCH_ENTRIES = 200;
/** ~200 bytes a card → 5,000 cards ≈ 1 MiB; this is abuse protection. */
export const MAX_DOC_BYTES = 2 * 1024 * 1024;
export const MAX_BATCH_BODY_BYTES = MAX_DOC_BYTES;
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
/** Latest due date we accept: ~2 years ahead (365-day cap + slack). */
const MAX_DUE_AHEAD_MS = 2 * 366 * DAY_MS;
const MAX_COUNT = 1_000_000;

// ── Ids ───────────────────────────────────────────────────────────────────────

const SLUG = '[a-z0-9-]{1,120}';
export const CARD_ID_RE = new RegExp(`^(?:[nd]:${SLUG}|m:${SLUG}:[a-z0-9]{1,13})$`);
export const PHASE_KEY_RE = /^(?:notes|dsa)\/[0-9]{2}-[a-z0-9-]{1,80}$/;

export function isValidCardId(id: unknown): id is string {
  return typeof id === 'string' && CARD_ID_RE.test(id);
}

/** Any key the review doc may hold: a card id or `settings`. */
export function isValidReviewKey(key: unknown): key is string {
  return key === SETTINGS_KEY || isValidCardId(key);
}

export const isMistakeCard = (id: string): boolean => id.startsWith('m:');
/** `m:<mcq id>` ↔ `<mcq id>` */
export const mistakeCardId = (mcqId: string): string => `m:${mcqId}`;
export const mcqIdOfCard = (id: string): string => id.slice(2);

// ── Local days ───────────────────────────────────────────────────────────────

/** Unix ms of the next local midnight after `now` (DST-safe via Date). */
export function endOfLocalDay(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

export function startOfLocalDay(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// ── Scheduling ───────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
/** Ease is kept to two decimals so repeated ± steps don't drift. */
const roundEase = (e: number): number => clamp(Math.round(e * 100) / 100, MIN_EASE, MAX_EASE);

export function newCardState(): Omit<CardState, 'updatedAt'> {
  return {
    kind: 'card',
    due: 0,
    interval: 0,
    ease: DEFAULT_EASE,
    reps: 0,
    lapses: 0,
    firstSeen: 0,
    lastReview: 0,
    graduated: false,
  };
}

/** Interval (days) and ease a rating would give, without timestamps. */
export function nextInterval(
  prev: Pick<CardState, 'interval' | 'ease' | 'reps'>,
  rating: Rating,
): { interval: number; ease: number; lapse: boolean } {
  const ease = roundEase(prev.ease);
  if (prev.reps === 0) {
    if (rating === 'again') return { interval: 0, ease, lapse: false };
    if (rating === 'easy') return { interval: 4, ease: roundEase(ease + 0.15), lapse: false };
    return { interval: 1, ease, lapse: false };
  }
  const ivl = Math.max(1, prev.interval);
  const grow = (x: number): number => clamp(Math.max(ivl + 1, Math.round(x)), 1, MAX_INTERVAL_DAYS);
  switch (rating) {
    case 'again':
      return { interval: 0, ease: roundEase(ease - 0.2), lapse: true };
    case 'hard':
      return { interval: grow(ivl * 1.2), ease: roundEase(ease - 0.15), lapse: false };
    case 'good':
      return { interval: grow(ivl * ease), ease, lapse: false };
    case 'easy':
      return { interval: grow(ivl * ease * 1.3), ease: roundEase(ease + 0.15), lapse: false };
  }
}

/** Next `updatedAt`: strictly increasing per card, even if the clock steps back. */
function nextStamp(prev: { updatedAt: number } | null, now: number): number {
  return Math.max(now, (prev?.updatedAt ?? 0) + 1);
}

/**
 * Apply one rating. `isMistake` turns on graduation. Pass null for a card
 * never reviewed before.
 */
export function review(
  prev: CardState | null,
  rating: Rating,
  now: number = Date.now(),
  isMistake = false,
): CardState {
  const base = prev ?? { ...newCardState(), updatedAt: 0 };
  const r = nextInterval(base, rating);
  const reps = r.interval === 0 ? 0 : base.reps + 1;
  const due = r.interval === 0 ? now + LEARNING_STEP_MS : now + r.interval * DAY_MS;
  return {
    kind: 'card',
    due,
    interval: r.interval,
    ease: r.ease,
    reps,
    lapses: Math.min(MAX_COUNT, base.lapses + (r.lapse ? 1 : 0)),
    firstSeen: base.firstSeen > 0 ? base.firstSeen : now,
    lastReview: now,
    graduated: isMistake && r.interval >= GRADUATE_DAYS,
    updatedAt: nextStamp(prev, now),
  };
}

/** Short label for the interval a rating gives ("10m", "1d", "3w", "4mo"). */
export function intervalLabel(days: number): string {
  if (days <= 0) return '10m';
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return '1y';
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function defaultSettings(): ReviewSettings {
  return { kind: 'settings', dailyCap: DEFAULT_DAILY_CAP, phases: [], updatedAt: 0 };
}

export function makeSettings(
  prev: ReviewSettings | null,
  patch: { dailyCap?: number; phases?: string[] },
  now: number = Date.now(),
): ReviewSettings {
  const cur = prev ?? defaultSettings();
  return {
    kind: 'settings',
    dailyCap: coerceCap(patch.dailyCap ?? cur.dailyCap),
    phases: coercePhases(patch.phases ?? cur.phases),
    updatedAt: nextStamp(prev, now),
  };
}

function coerceCap(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_DAILY_CAP;
  return clamp(Math.trunc(v), 0, MAX_DAILY_CAP);
}

function coercePhases(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const p of v) {
    if (typeof p === 'string' && PHASE_KEY_RE.test(p)) out.add(p);
    if (out.size >= MAX_PHASES) break;
  }
  return [...out].sort();
}

// ── Coercion (storage / network) ─────────────────────────────────────────────

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const int = (v: unknown, lo: number, hi: number): number => clamp(Math.trunc(num(v)), lo, hi);

/**
 * Lenient read of a stored entry (localStorage or server JSON): clamps
 * every number into range and drops what can't be repaired. Never throws.
 */
export function coerceReviewEntry(raw: unknown): ReviewEntry | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const updatedAt = int(r.updatedAt, 0, Number.MAX_SAFE_INTEGER);
  if (r.kind === 'settings') {
    return { kind: 'settings', dailyCap: coerceCap(r.dailyCap), phases: coercePhases(r.phases), updatedAt };
  }
  if (r.kind !== 'card') return null;
  const ease = num(r.ease);
  return {
    kind: 'card',
    due: int(r.due, 0, Number.MAX_SAFE_INTEGER),
    interval: int(r.interval, 0, MAX_INTERVAL_DAYS),
    ease: ease > 0 ? roundEase(ease) : DEFAULT_EASE,
    reps: int(r.reps, 0, MAX_COUNT),
    lapses: int(r.lapses, 0, MAX_COUNT),
    firstSeen: int(r.firstSeen, 0, Number.MAX_SAFE_INTEGER),
    lastReview: int(r.lastReview, 0, Number.MAX_SAFE_INTEGER),
    graduated: r.graduated === true,
    updatedAt,
  };
}

/** The settings entry of a map, or the defaults. */
export function settingsOf(map: ReviewMap): ReviewSettings {
  const s = map[SETTINGS_KEY];
  return s && s.kind === 'settings' ? s : defaultSettings();
}

// ── Request validation (strict) ──────────────────────────────────────────────

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;

/** Strict validation of one entry from a PUT body; `key` picks the shape. */
export function parseReviewEntry(key: string, body: unknown, now: number = Date.now()): ParseResult<ReviewEntry> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'entry must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  const ts = b.updatedAt;
  if (!isInt(ts, 1, Number.MAX_SAFE_INTEGER)) return { ok: false, error: 'updatedAt must be a positive integer (unix ms)' };
  if (ts > now + MAX_CLOCK_SKEW_MS) return { ok: false, error: 'updatedAt is too far in the future' };

  if (key === SETTINGS_KEY) {
    if (b.kind !== 'settings') return { ok: false, error: "kind must be 'settings'" };
    if (!isInt(b.dailyCap, 0, MAX_DAILY_CAP)) return { ok: false, error: `dailyCap must be an integer in 0..${MAX_DAILY_CAP}` };
    const phases = b.phases;
    if (
      !Array.isArray(phases) ||
      phases.length > MAX_PHASES ||
      !phases.every((p) => typeof p === 'string' && PHASE_KEY_RE.test(p))
    ) {
      return { ok: false, error: `phases must be at most ${MAX_PHASES} keys like notes/04-messaging-kafka` };
    }
    return { ok: true, value: { kind: 'settings', dailyCap: b.dailyCap, phases: coercePhases(phases), updatedAt: ts } };
  }

  if (b.kind !== 'card') return { ok: false, error: "kind must be 'card'" };
  const maxTime = now + MAX_DUE_AHEAD_MS;
  if (!isInt(b.due, 0, maxTime)) return { ok: false, error: 'due must be a unix ms timestamp' };
  if (!isInt(b.interval, 0, MAX_INTERVAL_DAYS)) return { ok: false, error: `interval must be an integer in 0..${MAX_INTERVAL_DAYS}` };
  if (typeof b.ease !== 'number' || !Number.isFinite(b.ease) || b.ease < MIN_EASE || b.ease > MAX_EASE) {
    return { ok: false, error: `ease must be a number in ${MIN_EASE}..${MAX_EASE}` };
  }
  if (!isInt(b.reps, 0, MAX_COUNT)) return { ok: false, error: 'reps must be a non-negative integer' };
  if (!isInt(b.lapses, 0, MAX_COUNT)) return { ok: false, error: 'lapses must be a non-negative integer' };
  if (!isInt(b.firstSeen, 0, maxTime)) return { ok: false, error: 'firstSeen must be a unix ms timestamp' };
  if (!isInt(b.lastReview, 0, maxTime)) return { ok: false, error: 'lastReview must be a unix ms timestamp' };
  if (typeof b.graduated !== 'boolean') return { ok: false, error: 'graduated must be a boolean' };
  return {
    ok: true,
    value: {
      kind: 'card',
      due: b.due,
      interval: b.interval,
      ease: roundEase(b.ease),
      reps: b.reps,
      lapses: b.lapses,
      firstSeen: b.firstSeen,
      lastReview: b.lastReview,
      graduated: b.graduated,
      updatedAt: ts,
    },
  };
}

/**
 * Validate a batch PUT body: `{ entries: { [cardId | 'settings']: entry } }`
 * with 1..MAX_BATCH_ENTRIES entries. Errors name the key, never values.
 */
export function parseBatchBody(body: unknown, now: number = Date.now()): ParseResult<ReviewMap> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }
  const entries = (body as Record<string, unknown>).entries;
  if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) {
    return { ok: false, error: 'entries must be an object keyed by card id' };
  }
  const keys = Object.keys(entries);
  if (keys.length === 0) return { ok: false, error: 'entries must not be empty' };
  if (keys.length > MAX_BATCH_ENTRIES) return { ok: false, error: `at most ${MAX_BATCH_ENTRIES} entries per request` };
  const out: ReviewMap = {};
  for (const key of keys) {
    if (!isValidReviewKey(key)) return { ok: false, error: 'every key must be a card id (n:/d:/m:…) or settings' };
    const r = parseReviewEntry(key, (entries as Record<string, unknown>)[key], now);
    if (!r.ok) return { ok: false, error: `${key}: ${r.error}` };
    out[key] = r.value;
  }
  return { ok: true, value: out };
}

// ── The day's queue ──────────────────────────────────────────────────────────

/** One row of /review/cards.json (one-liner cards). */
export interface OneLinerCard {
  id: string;
  /** `notes/<phase>` or `dsa/<phase>`. */
  phase: string;
  title: string;
  front: string;
  /** Our own build output (MDX → HTML), never user input. */
  backHtml: string;
  href: string;
}

/** What the queue needs to know about an open mistake. */
export interface OpenMistake {
  /** The card id, `m:<mcq id>`. */
  id: string;
  /** `notes/<phase>` of the note the question is on. */
  phase: string;
  /** Unix ms the mistake was last changed (a re-miss bumps it). */
  updatedAt: number;
}

export interface QueueInput {
  /** All one-liner cards in course order. */
  cards: OneLinerCard[];
  /** Open mistakes that still have an MCQ to ask. */
  mistakes: OpenMistake[];
  states: ReviewMap;
  settings: ReviewSettings;
  now: number;
}

export interface Queue {
  /** Card ids due today, earliest first (mistakes included). */
  due: string[];
  /** New one-liner card ids for today, in course order, within the cap. */
  fresh: string[];
  /** New one-liner cards already introduced today. */
  introducedToday: number;
}

/**
 * A mistake card's live state. A graduated card whose question was missed
 * again since (the mistake changed after the card did) starts over.
 */
export function mistakeState(states: ReviewMap, m: OpenMistake): CardState | null {
  const s = states[m.id];
  if (!s || s.kind !== 'card') return null;
  if (s.graduated && m.updatedAt > s.updatedAt) return null;
  return s;
}

export function buildQueue(input: QueueInput): Queue {
  const { cards, mistakes, states, settings, now } = input;
  const wanted = new Set(settings.phases);
  const inScope = (phase: string): boolean => wanted.size === 0 || wanted.has(phase);
  const today0 = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);

  const due: Array<{ id: string; due: number }> = [];
  const fresh: string[] = [];
  let introducedToday = 0;

  // Counted over every card (not just in-scope ones): the cap is per day.
  for (const c of cards) {
    const s = states[c.id];
    if (s?.kind === 'card' && s.firstSeen >= today0 && s.firstSeen < todayEnd) introducedToday++;
  }
  for (const c of cards) {
    if (!inScope(c.phase)) continue;
    const s = states[c.id];
    if (s?.kind === 'card' && s.firstSeen > 0) {
      if (s.due < todayEnd) due.push({ id: c.id, due: s.due });
    } else {
      fresh.push(c.id);
    }
  }
  for (const m of mistakes) {
    if (!inScope(m.phase)) continue;
    const s = mistakeState(states, m);
    if (!s) due.push({ id: m.id, due: 0 });
    else if (!s.graduated && s.due < todayEnd) due.push({ id: m.id, due: s.due });
  }
  due.sort((a, b) => a.due - b.due || a.id.localeCompare(b.id));
  const room = Math.max(0, settings.dailyCap - introducedToday);
  return { due: due.map((d) => d.id), fresh: fresh.slice(0, room), introducedToday };
}
