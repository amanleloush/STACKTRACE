// Pure logic for /mock/ (timed mock rounds): timer math, which phase of the
// round you should be in, rubric scoring, and the attempt history with its
// cap and coercion. No DOM or storage access, so tests can import it and the
// page script stays a thin shell around it.

export type Mode = 'hld' | 'lld';

export const MODES: Mode[] = ['hld', 'lld'];

export const MODE_LABEL: Record<Mode, string> = {
  hld: 'HLD',
  lld: 'LLD / machine coding',
};

const MIN = 60_000;

export const DURATION_MS: Record<Mode, number> = {
  hld: 45 * MIN,
  lld: 90 * MIN,
};

/** Shortest round a problem may ask for. */
const MIN_DURATION_MS = 15 * MIN;

/** A problem's own length (e.g. a "60 min" mock) when it is sane, else the
 *  mode's default. Never longer than the mode's default, so stored or
 *  tampered values can't stretch a round. */
export function clampDuration(mode: Mode, ms: unknown): number {
  const max = DURATION_MS[mode];
  return typeof ms === 'number' && Number.isInteger(ms) && ms >= MIN_DURATION_MS && ms <= max ? ms : max;
}

export interface Phase {
  label: string;
  minutes: number;
}

/** Recommended time boxes. Each mode's boxes add up to its duration. */
export const PHASES: Record<Mode, Phase[]> = {
  hld: [
    { label: 'Requirements', minutes: 5 },
    { label: 'Estimates', minutes: 5 },
    { label: 'API', minutes: 5 },
    { label: 'Data model', minutes: 5 },
    { label: 'High-level design', minutes: 10 },
    { label: 'Deep dive', minutes: 10 },
    { label: 'Wrap-up / trade-offs', minutes: 5 },
  ],
  lld: [
    { label: 'Clarify', minutes: 5 },
    { label: 'Entities / class design', minutes: 15 },
    { label: 'Core code', minutes: 45 },
    { label: 'Concurrency / edge cases', minutes: 10 },
    { label: 'Tests / demo', minutes: 10 },
    { label: 'Extensions', minutes: 5 },
  ],
};

/** What interviewers grade. Each item is self-scored 0, 1 or 2. */
export const RUBRICS: Record<Mode, string[]> = {
  hld: [
    'Clarified functional and non-functional requirements',
    'Capacity estimate',
    'API',
    'Data model and storage choice, with a reason',
    'A clear high-level diagram',
    'A deep dive on the hardest part',
    'Bottlenecks and scaling',
    'Failure handling',
    'Trade-offs stated',
    'Time management',
  ],
  lld: [
    'Requirements clarified',
    'Clean entities and responsibilities',
    'At least one appropriate pattern, with a reason',
    'Working, runnable core flow',
    'Thread-safety where needed',
    'Edge cases',
    'Tests or demo',
    'Extensibility',
    'Naming and readability',
    'Time management',
  ],
};

// ---------------------------------------------------------------------------
// Timer. State is wall-clock anchors, never a ticking counter, so a reload
// (or a backgrounded tab) loses nothing.

export interface Run {
  /** Attempt id; also keys the scratchpad. */
  id: string;
  slug: string;
  mode: Mode;
  durationMs: number;
  startedAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Total ms spent paused before the current pause (if any). */
  pausedTotal: number;
  /** Set once the round is over (finished early or time-up). */
  finishedAt: number | null;
  /** Rubric self-scores, one 0/1/2 per item. */
  scores: number[];
}

export function newRun(id: string, slug: string, mode: Mode, now: number, durationMs?: number): Run {
  return {
    id,
    slug,
    mode,
    durationMs: clampDuration(mode, durationMs),
    startedAt: now,
    pausedAt: null,
    pausedTotal: 0,
    finishedAt: null,
    scores: RUBRICS[mode].map(() => 0),
  };
}

/** Active (unpaused) time, clamped to [0, duration]. */
export function elapsedMs(run: Run, now: number): number {
  const end = run.finishedAt ?? run.pausedAt ?? now;
  // A pause that was still open when the round finished counts as paused.
  const openPause = run.finishedAt != null && run.pausedAt != null ? run.finishedAt - run.pausedAt : 0;
  const raw = end - run.startedAt - run.pausedTotal - Math.max(0, openPause);
  return Math.min(run.durationMs, Math.max(0, raw));
}

export function remainingMs(run: Run, now: number): number {
  return run.durationMs - elapsedMs(run, now);
}

export function pause(run: Run, now: number): Run {
  if (run.pausedAt != null || run.finishedAt != null) return run;
  return { ...run, pausedAt: now };
}

export function resume(run: Run, now: number): Run {
  if (run.pausedAt == null || run.finishedAt != null) return run;
  return { ...run, pausedAt: null, pausedTotal: run.pausedTotal + Math.max(0, now - run.pausedAt) };
}

/** Freeze the clock. `now` past the deadline is fine: elapsed is clamped. */
export function finish(run: Run, now: number): Run {
  if (run.finishedAt != null) return run;
  const resumed = resume(run, now);
  return { ...resumed, finishedAt: now };
}

export type Warn = 'none' | 'ten' | 'five' | 'up';

/** Visual warning band for the time left. */
export function warnLevel(remaining: number): Warn {
  if (remaining <= 0) return 'up';
  if (remaining <= 5 * MIN) return 'five';
  if (remaining <= 10 * MIN) return 'ten';
  return 'none';
}

/** The mode's time boxes scaled to a round of `durationMs`, in whole
 *  minutes that still add up to the round's length. */
export function phasesFor(mode: Mode, durationMs: number = DURATION_MS[mode]): Phase[] {
  const total = Math.round(durationMs / MIN);
  const base = PHASES[mode];
  if (total === DURATION_MS[mode] / MIN) return base;
  const scale = total / (DURATION_MS[mode] / MIN);
  const out = base.map((p) => ({ label: p.label, minutes: Math.max(1, Math.round(p.minutes * scale)) }));
  // Rounding drift goes to the longest box.
  const drift = total - out.reduce((s, p) => s + p.minutes, 0);
  const longest = out.reduce((best, p, i) => (p.minutes > out[best]!.minutes ? i : best), 0);
  out[longest]!.minutes += drift;
  return out;
}

/** Index of the phase you should be in after `elapsed` ms. */
export function phaseIndex(mode: Mode, elapsed: number, durationMs: number = DURATION_MS[mode]): number {
  const phases = phasesFor(mode, durationMs);
  let end = 0;
  for (let i = 0; i < phases.length; i++) {
    end += phases[i]!.minutes * MIN;
    if (elapsed < end) return i;
  }
  return phases.length - 1;
}

/** `mm:ss`, or `h:mm:ss` from an hour up. Rounds up so 0:00 means time-up. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Short "38 min" style label for time used. */
export function formatMinutes(ms: number): string {
  const m = Math.round(ms / MIN);
  return m < 1 ? '<1 min' : `${m} min`;
}

// ---------------------------------------------------------------------------
// Scoring

export interface Verdict {
  band: 'strong' | 'borderline' | 'practice';
  label: string;
}

export function scoreTotal(scores: number[]): number {
  return scores.reduce((s, x) => s + (x === 1 || x === 2 ? x : 0), 0);
}

export function scoreMax(mode: Mode): number {
  return RUBRICS[mode].length * 2;
}

/** Self-assessment bands: ≥75% strong, ≥50% borderline, else practice. */
export function verdict(total: number, max: number): Verdict {
  const pct = max > 0 ? total / max : 0;
  if (pct >= 0.75) return { band: 'strong', label: 'Strong hire signal' };
  if (pct >= 0.5) return { band: 'borderline', label: 'Borderline' };
  return { band: 'practice', label: 'Needs practice' };
}

// ---------------------------------------------------------------------------
// Coercion of anything read back from localStorage.

const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const ID_RE = /^[a-z0-9]{1,40}$/;
const isMode = (v: unknown): v is Mode => v === 'hld' || v === 'lld';
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

function coerceScores(v: unknown, mode: Mode): number[] {
  const n = RUBRICS[mode].length;
  const arr = Array.isArray(v) ? v : [];
  return Array.from({ length: n }, (_, i) => (arr[i] === 1 || arr[i] === 2 ? arr[i] : 0));
}

export function coerceRun(v: unknown): Run | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== 'string' || !ID_RE.test(r.id)) return null;
  if (typeof r.slug !== 'string' || !SLUG_RE.test(r.slug)) return null;
  if (!isMode(r.mode)) return null;
  if (!isTime(r.startedAt) || !isTime(r.pausedTotal)) return null;
  const pausedAt = r.pausedAt == null ? null : isTime(r.pausedAt) ? r.pausedAt : undefined;
  const finishedAt = r.finishedAt == null ? null : isTime(r.finishedAt) ? r.finishedAt : undefined;
  if (pausedAt === undefined || finishedAt === undefined) return null;
  if (pausedAt != null && pausedAt < r.startedAt) return null;
  if (finishedAt != null && finishedAt < r.startedAt) return null;
  return {
    id: r.id,
    slug: r.slug,
    mode: r.mode,
    // Clamped to the mode's length: a tampered value can't stretch the round.
    durationMs: clampDuration(r.mode, r.durationMs),
    startedAt: r.startedAt,
    pausedAt,
    pausedTotal: r.pausedTotal,
    finishedAt,
    scores: coerceScores(r.scores, r.mode),
  };
}

// ---------------------------------------------------------------------------
// History: newest first, at most MAX_HISTORY attempts, localStorage only.

export const MAX_HISTORY = 50;

export interface Attempt {
  id: string;
  /** Unix ms the round started. */
  at: number;
  slug: string;
  title: string;
  mode: Mode;
  usedMs: number;
  score: number;
  max: number;
}

export function coerceAttempt(v: unknown): Attempt | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const a = v as Record<string, unknown>;
  if (typeof a.id !== 'string' || !ID_RE.test(a.id)) return null;
  if (typeof a.slug !== 'string' || !SLUG_RE.test(a.slug)) return null;
  if (!isMode(a.mode) || !isTime(a.at) || !isTime(a.usedMs)) return null;
  const max = scoreMax(a.mode);
  const score = typeof a.score === 'number' && Number.isInteger(a.score) ? a.score : -1;
  if (score < 0 || score > max) return null;
  const title = typeof a.title === 'string' && a.title.trim() ? a.title.slice(0, 200) : a.slug;
  return {
    id: a.id,
    at: a.at,
    slug: a.slug,
    title,
    mode: a.mode,
    usedMs: Math.min(a.usedMs, DURATION_MS[a.mode]),
    score,
    max,
  };
}

/** Valid attempts only, de-duplicated by id, newest first, capped. */
export function coerceHistory(v: unknown): Attempt[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: Attempt[] = [];
  for (const raw of v) {
    const a = coerceAttempt(raw);
    if (!a || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out.sort((x, y) => y.at - x.at).slice(0, MAX_HISTORY);
}

/** Insert or replace (by id) an attempt, keeping the cap. */
export function upsertAttempt(list: Attempt[], a: Attempt): Attempt[] {
  return [a, ...list.filter((x) => x.id !== a.id)].sort((x, y) => y.at - x.at).slice(0, MAX_HISTORY);
}

export interface Best {
  slug: string;
  title: string;
  mode: Mode;
  best: Attempt;
  attempts: number;
}

/** Best attempt per problem (ties go to the faster one), best first. */
export function bestPerProblem(list: Attempt[]): Best[] {
  const by = new Map<string, Best>();
  for (const a of list) {
    const cur = by.get(a.slug);
    if (!cur) {
      by.set(a.slug, { slug: a.slug, title: a.title, mode: a.mode, best: a, attempts: 1 });
      continue;
    }
    cur.attempts++;
    const better =
      a.score / a.max > cur.best.score / cur.best.max ||
      (a.score / a.max === cur.best.score / cur.best.max && a.usedMs < cur.best.usedMs);
    if (better) cur.best = a;
  }
  return [...by.values()].sort(
    (x, y) => y.best.score / y.best.max - x.best.score / x.best.max || x.title.localeCompare(y.title),
  );
}

export function attemptFromRun(run: Run, title: string, now: number): Attempt {
  return {
    id: run.id,
    at: run.startedAt,
    slug: run.slug,
    title,
    mode: run.mode,
    usedMs: elapsedMs(run, now),
    score: scoreTotal(run.scores),
    max: scoreMax(run.mode),
  };
}

/** Pick a uniformly random slug; `rand` is injectable for tests. */
export function pickRandom<T>(items: T[], rand: () => number = Math.random): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))];
}
