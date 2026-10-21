import { describe, it, expect } from 'vitest';
import type { KVNamespace } from '~/lib/kv';
import { applyLwwBatch, mergeLww } from '~/lib/lww';
import {
  activityByDay,
  aggregatePhases,
  coerceCompletion,
  computeStreaks,
  dayFromNumber,
  dayKey,
  dayNumber,
  doneKeys,
  heatLevel,
  heatmapCells,
  isValidCompletionKey,
  LEGACY_UPDATED_AT,
  markEntry,
  migrateLegacy,
  parseBatchBody,
  parseCompletionBody,
  percent,
  totals,
  MAX_BATCH_ENTRIES,
  MAX_CLOCK_SKEW_MS,
  MAX_ENTRIES_PER_USER,
  type CompletionEntry,
  type CompletionMap,
  type Topic,
} from '~/lib/completion';
import { completionDoc } from '~/lib/completion-kv';
import { GET, PUT } from '~/pages/api/v1/completion/index';

class FakeKV implements KVNamespace {
  store = new Map<string, string>();
  puts = 0;
  get(key: string, type?: 'text'): Promise<string | null>;
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  async get(key: string, type?: 'text' | 'json'): Promise<unknown> {
    const v = this.store.get(key) ?? null;
    return type === 'json' && v != null ? JSON.parse(v) : v;
  }
  async put(key: string, value: string): Promise<void> {
    this.puts++;
    this.store.set(key, value);
  }
}

const done = (updatedAt: number, completedAt = updatedAt): CompletionEntry => ({ done: true, completedAt, updatedAt });
const tomb = (updatedAt: number): CompletionEntry => ({ done: false, completedAt: 0, updatedAt });

describe('keys + validation', () => {
  it('accepts notes:/dsa: keys only', () => {
    expect(isValidCompletionKey('notes:cap-pacelc-consistency')).toBe(true);
    expect(isValidCompletionKey('dsa:two-sum-sorted')).toBe(true);
    for (const bad of ['lc:two-sum', 'notes:', 'notes:Two', 'dsa:a_b', 'notes:a:b', `dsa:${'a'.repeat(121)}`, 7, null]) {
      expect(isValidCompletionKey(bad), String(bad)).toBe(false);
    }
  });

  const now = 1_700_000_000_000;
  it('parses a good entry and zeroes completedAt on a tombstone', () => {
    expect(parseCompletionBody({ done: true, completedAt: now, updatedAt: now }, now)).toEqual({
      ok: true,
      value: done(now),
    });
    expect(parseCompletionBody({ done: false, completedAt: now, updatedAt: now }, now)).toEqual({
      ok: true,
      value: tomb(now),
    });
  });

  it.each([
    ['array', []],
    ['done not boolean', { done: 1, completedAt: 0, updatedAt: now }],
    ['completedAt negative', { done: true, completedAt: -1, updatedAt: now }],
    ['updatedAt zero', { done: true, completedAt: 0, updatedAt: 0 }],
    ['updatedAt float', { done: true, completedAt: 0, updatedAt: 1.5 }],
    ['updatedAt far future', { done: true, completedAt: 0, updatedAt: now + MAX_CLOCK_SKEW_MS + 1 }],
    ['completedAt far future', { done: true, completedAt: now + MAX_CLOCK_SKEW_MS + 1, updatedAt: now }],
  ])('rejects %s', (_l, body) => {
    expect(parseCompletionBody(body, now).ok).toBe(false);
  });

  it('validates batches', () => {
    expect(parseBatchBody({ entries: {} }).ok).toBe(false);
    expect(parseBatchBody({ entries: { 'bad key': done(now) } }, now).ok).toBe(false);
    const many: Record<string, unknown> = {};
    for (let i = 0; i <= MAX_BATCH_ENTRIES; i++) many[`dsa:p${i}`] = done(now);
    expect(parseBatchBody({ entries: many }, now).ok).toBe(false);
    expect(parseBatchBody({ entries: { 'dsa:x': done(now) } }, now)).toEqual({ ok: true, value: { 'dsa:x': done(now) } });
  });

  it('coerces leniently and never throws', () => {
    expect(coerceCompletion(null)).toBeNull();
    expect(coerceCompletion({ done: 'yes' })).toBeNull();
    expect(coerceCompletion({ done: true, completedAt: -5, updatedAt: 3.7 })).toEqual({ done: true, completedAt: 0, updatedAt: 3 });
    expect(coerceCompletion({ done: false, completedAt: 99, updatedAt: 'x' })).toEqual(tomb(0));
  });
});

describe('markEntry', () => {
  it('stamps completion and keeps the first time on a re-mark', () => {
    const a = markEntry(null, true, 1000);
    expect(a).toEqual(done(1000));
    expect(markEntry(a, true, 5000)).toEqual({ done: true, completedAt: 1000, updatedAt: 5000 });
  });
  it('writes a tombstone and stays strictly increasing when the clock steps back', () => {
    const t = markEntry(done(5000), false, 4000);
    expect(t).toEqual(tomb(5001));
    expect(markEntry(t, true, 4000)).toEqual({ done: true, completedAt: 4000, updatedAt: 5002 });
  });
});

describe('merge + tombstones (lww)', () => {
  it('a newer tombstone beats an older done, both ways', () => {
    const local: CompletionMap = { 'notes:a': done(100), 'notes:b': tomb(300) };
    const server: CompletionMap = { 'notes:a': tomb(200), 'notes:b': done(250) };
    const r = mergeLww(local, server);
    expect(r.merged['notes:a']).toEqual(tomb(200));
    expect(r.merged['notes:b']).toEqual(tomb(300));
    expect(r.pull).toEqual(['notes:a']);
    expect(r.push).toEqual(['notes:b']);
  });
  it('server batch keeps a newer tombstone and echoes it as stale', () => {
    const r = applyLwwBatch<CompletionEntry>({ 'dsa:x': tomb(500) }, { 'dsa:x': done(400), 'dsa:y': done(1) });
    expect(r.applied).toEqual(['dsa:y']);
    expect(r.stale).toEqual({ 'dsa:x': tomb(500) });
    expect(r.next['dsa:x']).toEqual(tomb(500));
  });
  it('doneKeys ignores tombstones', () => {
    expect([...doneKeys({ 'notes:a': done(1), 'notes:b': tomb(2) })]).toEqual(['notes:a']);
  });
});

describe('legacy migration', () => {
  it('copies valid legacy keys with no date and the oldest possible stamp', () => {
    const raw = JSON.stringify(['notes:a', 'dsa:b', 'notes:a', 'lc:junk', 42, 'notes:Bad']);
    expect(migrateLegacy(raw, () => false)).toEqual({
      'notes:a': { done: true, completedAt: 0, updatedAt: LEGACY_UPDATED_AT },
      'dsa:b': { done: true, completedAt: 0, updatedAt: LEGACY_UPDATED_AT },
    });
  });
  it('skips keys the store already has (done or tombstoned) — idempotent', () => {
    const have = new Set(['notes:a']);
    expect(Object.keys(migrateLegacy('["notes:a","notes:c"]', (k) => have.has(k)))).toEqual(['notes:c']);
  });
  it('tolerates missing / malformed storage', () => {
    expect(migrateLegacy(null, () => false)).toEqual({});
    expect(migrateLegacy('{not json', () => false)).toEqual({});
    expect(migrateLegacy('{"a":1}', () => false)).toEqual({});
  });
  it('caps the migrated count', () => {
    const keys = Array.from({ length: MAX_ENTRIES_PER_USER + 10 }, (_, i) => `dsa:p${i}`);
    expect(Object.keys(migrateLegacy(JSON.stringify(keys), () => false))).toHaveLength(MAX_ENTRIES_PER_USER);
  });
  it('any real synced change beats a migrated entry', () => {
    const migrated = migrateLegacy('["notes:a"]', () => false);
    const r = mergeLww(migrated, { 'notes:a': tomb(10) });
    expect(r.merged['notes:a']).toEqual(tomb(10));
    expect(r.push).toEqual([]);
  });
});

describe('days + streaks', () => {
  it('buckets by calendar day in the given time zone', () => {
    // 2024-03-10 03:30 UTC is still 2024-03-09 in New York, already 09:00 on the 10th in Kolkata.
    const ts = Date.UTC(2024, 2, 10, 3, 30);
    expect(dayKey(ts, 'America/New_York')).toBe('2024-03-09');
    expect(dayKey(ts, 'Asia/Kolkata')).toBe('2024-03-10');
    expect(dayKey(ts, 'UTC')).toBe('2024-03-10');
  });

  it('day numbers survive DST and month/year edges', () => {
    expect(dayNumber('2024-03-11') - dayNumber('2024-03-10')).toBe(1); // US DST start
    expect(dayFromNumber(dayNumber('2024-02-28') + 1)).toBe('2024-02-29');
    expect(dayFromNumber(dayNumber('2024-12-31') + 1)).toBe('2025-01-01');
  });

  it('counts current streak through today, or through yesterday if today is empty', () => {
    const days = ['2024-05-01', '2024-05-02', '2024-05-03'];
    expect(computeStreaks(days, '2024-05-03')).toEqual({ current: 3, longest: 3 });
    expect(computeStreaks(days, '2024-05-04')).toEqual({ current: 3, longest: 3 });
    expect(computeStreaks(days, '2024-05-05')).toEqual({ current: 0, longest: 3 });
  });

  it('finds the longest run across gaps, months and duplicates', () => {
    const days = ['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-01', '2024-02-05', '2024-02-06'];
    expect(computeStreaks(days, '2024-02-06')).toEqual({ current: 2, longest: 3 });
    expect(computeStreaks([], '2024-02-06')).toEqual({ current: 0, longest: 0 });
  });

  it('a late-night completion counts for the local day, not the UTC day', () => {
    // 23:30 in New York on Mar 1 and Mar 2 = 04:30 UTC on Mar 2 and Mar 3.
    const map: CompletionMap = {
      'notes:a': done(Date.UTC(2024, 2, 2, 4, 30)),
      'notes:b': done(Date.UTC(2024, 2, 3, 4, 30)),
      'notes:old': { done: true, completedAt: 0, updatedAt: 1 }, // migrated: no date
      'notes:gone': tomb(Date.UTC(2024, 2, 3, 5)),
    };
    const ny = activityByDay(map, 'America/New_York');
    expect([...ny.entries()]).toEqual([['2024-03-01', 1], ['2024-03-02', 1]]);
    expect(computeStreaks(ny.keys(), '2024-03-02')).toEqual({ current: 2, longest: 2 });
    const utc = activityByDay(map, 'UTC');
    expect([...utc.keys()].sort()).toEqual(['2024-03-02', '2024-03-03']);
  });
});

describe('heatmap', () => {
  it('lays out whole Sunday-first weeks ending with the week of today', () => {
    const today = '2024-05-15'; // a Wednesday
    const cells = heatmapCells(new Map([['2024-05-15', 3], ['2024-02-25', 9], ['2024-02-24', 1]]), today, 12);
    expect(cells).toHaveLength(84);
    expect(cells[0]!.day).toBe('2024-02-25'); // Sunday, 11 weeks before
    expect(new Date(`${cells[0]!.day}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(cells[0]!.level).toBe(4);
    const t = cells.findIndex((c) => c.day === today);
    expect(t).toBe(83 - 3);
    expect(cells[t]).toEqual({ day: today, count: 3, level: 3, future: false });
    expect(cells.slice(t + 1).every((c) => c.future && c.count === 0)).toBe(true);
  });
  it('maps counts to levels', () => {
    expect([0, 1, 2, 3, 4, 5, 50].map(heatLevel)).toEqual([0, 1, 2, 3, 3, 4, 4]);
  });
});

describe('per-phase aggregation', () => {
  const topic = (key: string, phase: string, order: number): Topic => ({ key, title: key, href: `/x/${key}/`, phase, order });
  const phases = [
    { slug: '01-a', num: '01', title: 'A' },
    { slug: '02-b', num: '02', title: 'B' },
    { slug: '03-empty', num: '03', title: 'Empty' },
  ];
  const topics = [topic('notes:a2', '01-a', 2), topic('notes:a1', '01-a', 1), topic('notes:a3', '01-a', 3), topic('notes:b1', '02-b', 1)];

  it('counts, floors the percent, and points at the first incomplete topic in order', () => {
    const done = new Set(['notes:a1', 'notes:b1', 'notes:elsewhere']);
    const rows = aggregatePhases(phases, topics, (k) => done.has(k));
    expect(rows.map((r) => [r.slug, r.done, r.total, r.pct, r.next?.title ?? null])).toEqual([
      ['01-a', 1, 3, 33, 'notes:a2'],
      ['02-b', 1, 1, 100, null],
    ]);
    expect(totals(rows)).toEqual({ done: 2, total: 4, pct: 50 });
  });
  it('never shows 100% until everything is done', () => {
    expect(percent(199, 200)).toBe(99);
    expect(percent(0, 0)).toBe(0);
  });
});

describe('KV doc + API route', () => {
  const user = { id: 'u1', email: 'u@test.com', name: 'U', role: 'user' };
  type Ctx = Parameters<typeof PUT>[0];
  const ctx = (o: { user?: unknown; body?: string; kv?: KVNamespace | null }) =>
    ({
      locals: { user: o.user ?? null, session: null, runtime: o.kv === null ? { env: {} } : { env: { KV: o.kv } } },
      params: {},
      request: new Request('http://x/api/v1/completion', {
        method: o.body === undefined ? 'GET' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: o.body,
      }),
    }) as unknown as Ctx;
  const batch = (entries: Record<string, unknown>) => JSON.stringify({ entries });

  it('uses the nc:v1:<userId> key', () => {
    expect(completionDoc.key('u1')).toBe('nc:v1:u1');
  });

  it('401s anon, 400s bad bodies, 503s without KV', async () => {
    const kv = new FakeKV();
    expect((await GET(ctx({ kv }))).status).toBe(401);
    expect((await PUT(ctx({ kv, body: batch({ 'notes:a': done(Date.now()) }) }))).status).toBe(401);
    expect((await PUT(ctx({ user, kv, body: batch({ 'lc:a': done(Date.now()) }) }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({ 'notes:a': { done: 'y' } }) }))).status).toBe(400);
    expect((await GET(ctx({ user, kv: null }))).status).toBe(503);
  });

  it('round-trips with last-write-wins, tombstones and a stale echo', async () => {
    const kv = new FakeKV();
    const t = Date.now() - 10_000;
    const r1 = await PUT(ctx({ user, kv, body: batch({ 'notes:a': done(t), 'dsa:b': done(t) }) }));
    expect(await r1.json()).toEqual({ applied: ['dsa:b', 'notes:a'], stale: {} });
    // Un-complete on another device (newer) and an older stale "done".
    const r2 = await PUT(ctx({ user, kv, body: batch({ 'notes:a': tomb(t + 5), 'dsa:b': done(t - 1) }) }));
    expect(await r2.json()).toEqual({ applied: ['notes:a'], stale: { 'dsa:b': done(t) } });
    const g = await GET(ctx({ user, kv }));
    expect(await g.json()).toEqual({ completion: { 'notes:a': tomb(t + 5), 'dsa:b': done(t) } });
    expect(kv.store.has('nc:v1:u1')).toBe(true);
    expect(await (await GET(ctx({ user: { ...user, id: 'u2' }, kv }))).json()).toEqual({ completion: {} });
  });
});
