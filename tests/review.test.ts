import { describe, it, expect } from 'vitest';
import type { KVNamespace } from '~/lib/kv';
import { mergeLww, applyLwwBatch } from '~/lib/lww';
import {
  buildQueue,
  coerceReviewEntry,
  DAY_MS,
  DEFAULT_DAILY_CAP,
  DEFAULT_EASE,
  endOfLocalDay,
  GRADUATE_DAYS,
  intervalLabel,
  isValidReviewKey,
  LEARNING_STEP_MS,
  makeSettings,
  MAX_DOC_BYTES,
  MAX_EASE,
  MAX_ENTRIES_PER_USER,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  mistakeState,
  nextInterval,
  parseBatchBody,
  review,
  settingsOf,
  startOfLocalDay,
  type CardState,
  type OneLinerCard,
  type Rating,
  type ReviewMap,
} from '~/lib/review-schedule';
import { buildOneLinerCards } from '~/lib/review-cards';
import { reviewDoc } from '~/lib/review-kv';
import { CorruptDocError } from '~/lib/kv-doc';
import { GET, PUT } from '~/pages/api/v1/review/index';

/** In-memory stand-in for a Workers KV binding, with failure injection. */
class FakeKV implements KVNamespace {
  store = new Map<string, string>();
  puts = 0;
  failGet: Error | null = null;
  failPut: Error | null = null;
  get(key: string, type?: 'text'): Promise<string | null>;
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  async get(key: string, type?: 'text' | 'json'): Promise<unknown> {
    if (this.failGet) throw this.failGet;
    const v = this.store.get(key) ?? null;
    return type === 'json' && v != null ? JSON.parse(v) : v;
  }
  async put(key: string, value: string): Promise<void> {
    if (this.failPut) throw this.failPut;
    this.puts++;
    this.store.set(key, value);
  }
}

// Noon local time, far from midnight / DST edges.
const T0 = new Date(2026, 2, 10, 12, 0, 0).getTime();

const card = (o: Partial<CardState> = {}): CardState => ({
  kind: 'card',
  due: T0,
  interval: 1,
  ease: DEFAULT_EASE,
  reps: 1,
  lapses: 0,
  firstSeen: T0 - DAY_MS,
  lastReview: T0 - DAY_MS,
  graduated: false,
  updatedAt: T0 - DAY_MS,
  ...o,
});

/** Rate a fresh card through a sequence, a day apart. */
function run(ratings: Rating[], isMistake = false): CardState[] {
  const out: CardState[] = [];
  let s: CardState | null = null;
  let now = T0;
  for (const r of ratings) {
    s = review(s, r, now, isMistake);
    out.push(s);
    now = Math.max(now + 60_000, s.due);
  }
  return out;
}

describe('scheduling math', () => {
  it('learning steps: Again 10m, Hard/Good 1d, Easy 4d', () => {
    const again = review(null, 'again', T0);
    expect(again).toMatchObject({ interval: 0, reps: 0, due: T0 + LEARNING_STEP_MS, firstSeen: T0, lapses: 0 });
    expect(review(null, 'hard', T0)).toMatchObject({ interval: 1, reps: 1, due: T0 + DAY_MS, ease: DEFAULT_EASE });
    expect(review(null, 'good', T0)).toMatchObject({ interval: 1, reps: 1, due: T0 + DAY_MS });
    expect(review(null, 'easy', T0)).toMatchObject({ interval: 4, ease: 2.65 });
  });

  it('Good grows by ease: 1 → 3 → 8 → 20', () => {
    expect(run(['good', 'good', 'good', 'good']).map((s) => s.interval)).toEqual([1, 3, 8, 20]);
  });

  it('Hard grows slower and lowers ease; Easy grows faster and raises it', () => {
    const base = { interval: 10, ease: 2.5, reps: 3 };
    expect(nextInterval(base, 'hard')).toEqual({ interval: 12, ease: 2.35, lapse: false });
    expect(nextInterval(base, 'good')).toEqual({ interval: 25, ease: 2.5, lapse: false });
    expect(nextInterval(base, 'easy')).toEqual({ interval: 33, ease: 2.65, lapse: false });
    // Always at least one day more than before.
    expect(nextInterval({ interval: 1, ease: MIN_EASE, reps: 1 }, 'hard').interval).toBe(2);
  });

  it('a lapse resets to learning, counts, and costs 0.2 ease', () => {
    const s = review(card({ interval: 20, reps: 4, ease: 2.5 }), 'again', T0);
    expect(s).toMatchObject({ interval: 0, reps: 0, lapses: 1, ease: 2.3, due: T0 + LEARNING_STEP_MS });
    // Relearning Good goes back to 1 day.
    expect(review(s, 'good', T0 + LEARNING_STEP_MS)).toMatchObject({ interval: 1, reps: 1, lapses: 1 });
  });

  it('keeps ease within bounds', () => {
    let s: CardState | null = null;
    for (let i = 0; i < 20; i++) s = review(review(s, 'good', T0 + i), 'again', T0 + i);
    expect(s!.ease).toBe(MIN_EASE);
    let e: CardState | null = null;
    for (let i = 0; i < 20; i++) e = review(e, 'easy', T0 + i * 1000);
    expect(e!.ease).toBe(MAX_EASE);
    expect(e!.interval).toBe(MAX_INTERVAL_DAYS);
  });

  it('first seen is kept; updatedAt strictly increases', () => {
    const a = review(null, 'good', T0);
    const b = review(a, 'good', T0 - 5000); // clock stepped back
    expect(b.firstSeen).toBe(T0);
    expect(b.updatedAt).toBe(a.updatedAt + 1);
  });

  it('mistake cards graduate at GRADUATE_DAYS; one-liners never do', () => {
    const m = run(['good', 'good', 'good'], true);
    expect(m.map((s) => s.graduated)).toEqual([false, false, true]);
    expect(m[2]!.interval).toBeGreaterThanOrEqual(GRADUATE_DAYS);
    expect(run(['good', 'good', 'good']).some((s) => s.graduated)).toBe(false);
  });

  it('labels intervals', () => {
    expect([0, 1, 13, 21, 90, 365].map(intervalLabel)).toEqual(['10m', '1d', '13d', '3w', '3mo', '1y']);
  });

  it('local day bounds', () => {
    expect(endOfLocalDay(T0) - startOfLocalDay(T0)).toBeGreaterThan(22 * 3600_000);
    expect(new Date(endOfLocalDay(T0)).getHours()).toBe(0);
    expect(endOfLocalDay(T0)).toBeGreaterThan(T0);
  });
});

describe('daily queue + new-card cap', () => {
  const mk = (i: number, phase = 'notes/04-messaging-kafka'): OneLinerCard => ({
    id: `n:c${i}`,
    phase,
    title: `C${i}`,
    front: `What is C${i}?`,
    backHtml: 'x',
    href: `/learn/notes/c${i}/`,
  });
  const cards = Array.from({ length: 40 }, (_, i) => mk(i, i < 20 ? 'notes/04-messaging-kafka' : 'notes/03-caching-redis'));
  const settings = (cap = DEFAULT_DAILY_CAP, phases: string[] = []) => makeSettings(null, { dailyCap: cap, phases }, 1);

  it('introduces at most the daily cap of new cards, in course order', () => {
    const q = buildQueue({ cards, mistakes: [], states: {}, settings: settings(), now: T0 });
    expect(q.fresh).toEqual(cards.slice(0, 15).map((c) => c.id));
    expect(q.due).toEqual([]);
  });

  it('counts cards introduced today (any phase) against the cap', () => {
    const states: ReviewMap = {};
    for (let i = 0; i < 10; i++) states[`n:c${i}`] = card({ firstSeen: T0 - 3600_000, due: T0 + DAY_MS });
    states['n:c10'] = card({ firstSeen: T0 - 2 * DAY_MS, due: T0 + DAY_MS }); // yesterday: doesn't count
    const q = buildQueue({ cards, mistakes: [], states, settings: settings(12), now: T0 });
    expect(q.introducedToday).toBe(10);
    expect(q.fresh).toEqual(['n:c11', 'n:c12']);
    expect(buildQueue({ cards, mistakes: [], states, settings: settings(5), now: T0 }).fresh).toEqual([]);
  });

  it('due cards first (earliest first), including later today; not tomorrow', () => {
    const states: ReviewMap = {
      'n:c1': card({ due: T0 - DAY_MS }),
      'n:c2': card({ due: T0 + 3600_000 }), // later today
      'n:c3': card({ due: endOfLocalDay(T0) + 1 }), // tomorrow
      'n:c0': card({ due: T0 - 2 * DAY_MS }),
    };
    const q = buildQueue({ cards, mistakes: [], states, settings: settings(0), now: T0 });
    expect(q.due).toEqual(['n:c0', 'n:c1', 'n:c2']);
  });

  it('filters by phase', () => {
    const q = buildQueue({ cards, mistakes: [], states: {}, settings: settings(100, ['notes/03-caching-redis']), now: T0 });
    expect(q.fresh).toEqual(cards.slice(20).map((c) => c.id));
  });

  it('open mistakes are always due (uncapped); graduated ones drop out until missed again', () => {
    const m = { id: 'm:kafka:abc', phase: 'notes/04-messaging-kafka', updatedAt: T0 - DAY_MS };
    const q = buildQueue({ cards: [], mistakes: [m], states: {}, settings: settings(0), now: T0 });
    expect(q.due).toEqual(['m:kafka:abc']);

    const grad = card({ graduated: true, interval: 8, due: T0 - 1, updatedAt: T0 - 10 });
    expect(buildQueue({ cards: [], mistakes: [m], states: { [m.id]: grad }, settings: settings(), now: T0 }).due).toEqual([]);
    const missedAgain = { ...m, updatedAt: T0 };
    expect(mistakeState({ [m.id]: grad }, missedAgain)).toBeNull();
    expect(buildQueue({ cards: [], mistakes: [missedAgain], states: { [m.id]: grad }, settings: settings(), now: T0 }).due).toEqual([m.id]);
    // Phase filter applies to mistakes too.
    expect(buildQueue({ cards: [], mistakes: [m], states: {}, settings: settings(15, ['dsa/01-two-pointers']), now: T0 }).due).toEqual([]);
  });
});

describe('settings', () => {
  it('defaults, clamps and dedupes', () => {
    expect(settingsOf({})).toMatchObject({ dailyCap: DEFAULT_DAILY_CAP, phases: [] });
    const s = makeSettings(null, { dailyCap: 9999, phases: ['dsa/01-two-pointers', 'bogus', 'dsa/01-two-pointers'] }, T0);
    expect(s).toEqual({ kind: 'settings', dailyCap: 200, phases: ['dsa/01-two-pointers'], updatedAt: T0 });
    expect(makeSettings(s, { dailyCap: -3 }, T0 - 1)).toMatchObject({ dailyCap: 0, updatedAt: T0 + 1 });
  });
});

describe('coercion', () => {
  it('clamps cards and drops garbage', () => {
    expect(coerceReviewEntry(null)).toBeNull();
    expect(coerceReviewEntry([])).toBeNull();
    expect(coerceReviewEntry({ kind: 'nope' })).toBeNull();
    expect(
      coerceReviewEntry({ kind: 'card', due: 'x', interval: 99999, ease: 9, reps: -1, lapses: 2.7, graduated: 'yes', updatedAt: 5 }),
    ).toEqual({
      kind: 'card',
      due: 0,
      interval: MAX_INTERVAL_DAYS,
      ease: MAX_EASE,
      reps: 0,
      lapses: 2,
      firstSeen: 0,
      lastReview: 0,
      graduated: false,
      updatedAt: 5,
    });
    expect(coerceReviewEntry({ kind: 'card', ease: 0 })).toMatchObject({ ease: DEFAULT_EASE });
    expect(coerceReviewEntry({ kind: 'card', ease: 1 })).toMatchObject({ ease: MIN_EASE });
    expect(coerceReviewEntry({ kind: 'settings', dailyCap: '7', phases: 'x', updatedAt: 3 })).toEqual({
      kind: 'settings',
      dailyCap: DEFAULT_DAILY_CAP,
      phases: [],
      updatedAt: 3,
    });
  });

  it('validates keys', () => {
    for (const k of ['n:kafka-basics', 'd:two-sum-ii', 'm:kafka:1abc', 'settings']) expect(isValidReviewKey(k)).toBe(true);
    for (const k of ['x:kafka', 'n:Kafka', 'm:kafka', 'n:', 'settings2', 'n:a:b', '__proto__']) expect(isValidReviewKey(k)).toBe(false);
  });
});

describe('batch validation', () => {
  const now = T0;
  it('accepts cards and settings', () => {
    const r = parseBatchBody(
      { entries: { 'n:a': card({ updatedAt: now }), settings: { kind: 'settings', dailyCap: 5, phases: ['notes/01-foundations'], updatedAt: now } } },
      now,
    );
    expect(r.ok).toBe(true);
  });
  it('rejects bad shapes', () => {
    const bad = (entries: unknown) => parseBatchBody({ entries }, now).ok;
    expect(bad({})).toBe(false);
    expect(bad({ 'Bad Key': card() })).toBe(false);
    expect(bad({ 'n:a': { ...card(), ease: 5 } })).toBe(false);
    expect(bad({ 'n:a': { ...card(), interval: 1.5 } })).toBe(false);
    expect(bad({ 'n:a': { ...card(), kind: 'settings' } })).toBe(false);
    expect(bad({ 'n:a': { ...card(), updatedAt: now + DAY_MS } })).toBe(false);
    expect(bad({ 'n:a': { ...card(), due: now + 5 * 365 * DAY_MS } })).toBe(false);
    expect(bad({ settings: { kind: 'settings', dailyCap: 500, phases: [], updatedAt: now } })).toBe(false);
    expect(bad({ settings: { kind: 'settings', dailyCap: 5, phases: ['x'], updatedAt: now } })).toBe(false);
    expect(parseBatchBody([], now).ok).toBe(false);
  });
});

describe('merge per card by updatedAt', () => {
  it('client merge keeps the newest card and settings on each side', () => {
    const local: ReviewMap = { 'n:a': card({ updatedAt: 10, interval: 3 }), settings: makeSettings(null, { dailyCap: 5 }, 30) };
    const server: ReviewMap = { 'n:a': card({ updatedAt: 20, interval: 8 }), 'n:b': card({ updatedAt: 5 }), settings: makeSettings(null, { dailyCap: 9 }, 25) };
    const r = mergeLww(local, server);
    expect((r.merged['n:a'] as CardState).interval).toBe(8);
    expect(settingsOf(r.merged).dailyCap).toBe(5);
    expect(r.pull).toEqual(['n:a', 'n:b']);
    expect(r.push).toEqual(['settings']);
  });
  it('server batch apply reports stale copies', () => {
    const r = applyLwwBatch<CardState>({ 'n:a': card({ updatedAt: 20 }) }, { 'n:a': card({ updatedAt: 20 }), 'n:b': card({ updatedAt: 1 }) });
    expect(r.applied).toEqual(['n:b']);
    expect(Object.keys(r.stale)).toEqual(['n:a']);
  });
});

describe('one-liner card builder', () => {
  it('builds note + DSA cards in course order and skips pages without a one-liner', () => {
    const cards = buildOneLinerCards(
      [
        { id: 'kafka-b', body: '**One-liner:** Kafka is a `log`.', data: { title: 'Kafka B', phase: '04-messaging-kafka', order: 2 } },
        { id: 'dns', body: '**One-liner:** Names to IPs.', data: { title: 'DNS', phase: '01-foundations', order: 1 } },
        { id: 'empty', body: 'nothing', data: { title: 'Empty', phase: '01-foundations', order: 0 } },
      ],
      [{ id: 'two-sum-ii', body: '**One-liner:** Two pointers.', data: { title: 'Two Sum II', phase: '01-two-pointers', order: 1 } }],
    );
    expect(cards.map((c) => c.id)).toEqual(['n:dns', 'n:kafka-b', 'd:two-sum-ii']);
    expect(cards[0]).toMatchObject({ front: 'Explain in one line: DNS', phase: 'notes/01-foundations', href: '/learn/notes/dns/' });
    expect(cards[1]!.backHtml).toBe('Kafka is a <code>log</code>.');
    expect(cards[2]).toMatchObject({ front: 'How do you solve Two Sum II?', phase: 'dsa/01-two-pointers', href: '/learn/dsa/two-sum-ii/' });
  });
});

describe('KV doc', () => {
  it('uses rv:v1:<userId> and decodes leniently', () => {
    expect(reviewDoc.key('u1')).toBe('rv:v1:u1');
    const doc = JSON.stringify({ v: 1, review: { 'n:a': card({ updatedAt: 5 }), 'BAD': card(), 'n:b': { kind: 'x' } } });
    expect(Object.keys(reviewDoc.decode(doc))).toEqual(['n:a']);
    expect(() => reviewDoc.decode('{bad')).toThrow(CorruptDocError);
  });

  it('enforces the 5,000-card cap', async () => {
    const kv = new FakeKV();
    const full: ReviewMap = {};
    for (let i = 0; i < MAX_ENTRIES_PER_USER; i++) full[`n:c${i}`] = card({ updatedAt: 1 });
    kv.store.set(reviewDoc.key('u1'), reviewDoc.encode(full));
    expect(await reviewDoc.saveBatch(kv, 'u1', { 'n:new': card({ updatedAt: 2 }) })).toEqual({ status: 'entry_limit' });
    expect(await reviewDoc.saveBatch(kv, 'u1', { 'n:c0': card({ updatedAt: 2 }) })).toMatchObject({ status: 'ok', applied: ['n:c0'] });
  });
});

describe('API route /api/v1/review', () => {
  const user = { id: 'u1', email: 'user@test.com', name: 'U', role: 'user' };
  type Ctx = Parameters<typeof PUT>[0];
  const ctx = (o: { user?: unknown; body?: string; ctype?: string; kv?: KVNamespace | null }) =>
    ({
      locals: { user: o.user ?? null, session: null, runtime: o.kv === null ? { env: {} } : { env: { KV: o.kv } } },
      params: {},
      request: new Request('http://x/api/v1/review', {
        method: o.body === undefined ? 'GET' : 'PUT',
        headers: { 'Content-Type': o.ctype ?? 'application/json' },
        body: o.body,
      }),
    }) as unknown as Ctx;
  const batch = (entries: Record<string, unknown>) => JSON.stringify({ entries });

  it('401s when signed out', async () => {
    const kv = new FakeKV();
    expect((await GET(ctx({ kv }))).status).toBe(401);
    expect((await PUT(ctx({ kv, body: batch({ 'n:a': card() }) }))).status).toBe(401);
  });

  it('validates content type, JSON, keys and entries without writing', async () => {
    const kv = new FakeKV();
    const t = Date.now();
    expect((await PUT(ctx({ user, kv, body: batch({ 'n:a': card({ updatedAt: t }) }), ctype: 'text/plain' }))).status).toBe(415);
    expect((await PUT(ctx({ user, kv, body: '{nope' }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({ 'zz:a': card({ updatedAt: t }) }) }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({ 'n:a': { ...card({ updatedAt: t }), ease: 0.5 } }) }))).status).toBe(400);
    expect(kv.puts).toBe(0);
  });

  it('413s on an oversized body', async () => {
    const kv = new FakeKV();
    const huge = JSON.stringify({ entries: { 'n:a': card() }, pad: 'x'.repeat(MAX_DOC_BYTES) });
    expect((await PUT(ctx({ user, kv, body: huge }))).status).toBe(413);
  });

  it('503s when KV is missing or failing', async () => {
    expect((await GET(ctx({ user, kv: null }))).status).toBe(503);
    const kv = new FakeKV();
    kv.failGet = new Error('down');
    expect((await GET(ctx({ user, kv }))).status).toBe(503);
  });

  it('round-trips cards and settings with last-write-wins per key', async () => {
    const kv = new FakeKV();
    const t = Date.now();
    const settings = makeSettings(null, { dailyCap: 7, phases: ['notes/04-messaging-kafka'] }, t);
    const r1 = await PUT(ctx({ user, kv, body: batch({ 'n:a': card({ updatedAt: t - 10, interval: 3 }), settings }) }));
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ applied: ['n:a', 'settings'], stale: {} });

    // An older device tries to roll the card back.
    const r2 = await PUT(ctx({ user, kv, body: batch({ 'n:a': card({ updatedAt: t - 20, interval: 1 }), 'd:x': card({ updatedAt: t }) }) }));
    const j2 = (await r2.json()) as { applied: string[]; stale: Record<string, CardState> };
    expect(j2.applied).toEqual(['d:x']);
    expect(j2.stale['n:a']!.interval).toBe(3);

    const g = await GET(ctx({ user, kv }));
    expect(g.headers.get('Cache-Control')).toContain('no-store');
    const body = (await g.json()) as { review: ReviewMap };
    expect(Object.keys(body.review).sort()).toEqual(['d:x', 'n:a', 'settings']);
    expect(settingsOf(body.review)).toEqual(settings);
    expect([...kv.store.keys()]).toEqual(['rv:v1:u1']);
    expect(await (await GET(ctx({ user: { ...user, id: 'u2' }, kv }))).json()).toEqual({ review: {} });
  });
});
