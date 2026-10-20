import { describe, it, expect } from 'vitest';
import type { KVNamespace } from '~/lib/kv';
import {
  applyBatch,
  isValidSlug,
  mergeProgress,
  parseBatchBody,
  parseProgressBody,
  MAX_BATCH_ENTRIES,
  MAX_CLOCK_SKEW_MS,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  MAX_NOTES_CHARS,
  type ProgressEntry,
  type ProgressMap,
} from '~/lib/problem-progress';
import {
  decodeDoc,
  encodeDoc,
  loadProgress,
  progressKey,
  saveBatch,
  CorruptDocError,
  KvUnavailableError,
} from '~/lib/problem-progress-kv';
import { GET, PUT } from '~/pages/api/v1/problems/progress/index';

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

const e = (updatedAt: number, solved = true, notes = ''): ProgressEntry => ({ solved, notes, updatedAt });

describe('slug + body validation', () => {
  it('accepts LeetCode-style slugs only', () => {
    expect(isValidSlug('two-sum')).toBe(true);
    expect(isValidSlug('3sum')).toBe(true);
    expect(isValidSlug('a'.repeat(120))).toBe(true);
    for (const bad of ['', 'Two-Sum', 'two_sum', '../etc', 'a b', 'a'.repeat(121), 42, null]) {
      expect(isValidSlug(bad), String(bad)).toBe(false);
    }
  });

  const now = 1_700_000_000_000;
  it('accepts a well-formed body', () => {
    expect(parseProgressBody({ solved: true, notes: 'hash map', updatedAt: now }, now)).toEqual({
      ok: true,
      value: { solved: true, notes: 'hash map', updatedAt: now },
    });
  });

  it.each([
    ['non-object', 'nope'],
    ['array', []],
    ['solved not boolean', { solved: 1, notes: '', updatedAt: now }],
    ['notes not string', { solved: true, notes: null, updatedAt: now }],
    ['notes too long', { solved: true, notes: 'x'.repeat(MAX_NOTES_CHARS + 1), updatedAt: now }],
    ['updatedAt missing', { solved: true, notes: '' }],
    ['updatedAt float', { solved: true, notes: '', updatedAt: 1.5 }],
    ['updatedAt negative', { solved: true, notes: '', updatedAt: -1 }],
    ['updatedAt far future', { solved: true, notes: '', updatedAt: now + MAX_CLOCK_SKEW_MS + 1 }],
  ])('rejects %s', (_label, body) => {
    expect(parseProgressBody(body, now).ok).toBe(false);
  });

  it('allows notes at exactly the limit', () => {
    expect(parseProgressBody({ solved: false, notes: 'x'.repeat(MAX_NOTES_CHARS), updatedAt: now }, now).ok).toBe(true);
  });
});

describe('mergeProgress (last-write-wins)', () => {
  it('pulls server-newer, pushes local-newer, ties are quiet', () => {
    const local: ProgressMap = { a: e(10), b: e(30, false, 'local'), c: e(5), only_local: e(1) };
    const server: ProgressMap = { a: e(20, false, 'server'), b: e(25), c: e(5), only_server: e(2) };
    const r = mergeProgress(local, server);
    expect(r.pull).toEqual(['a', 'only_server']);
    expect(r.push).toEqual(['b', 'only_local']);
    expect(r.merged.a).toEqual(e(20, false, 'server'));
    expect(r.merged.b).toEqual(e(30, false, 'local'));
    expect(r.merged.c).toEqual(e(5));
    expect(Object.keys(r.merged).sort()).toEqual(['a', 'b', 'c', 'only_local', 'only_server']);
  });

  it('propagates an un-solve (newer falsy entry still wins)', () => {
    const r = mergeProgress({ a: e(50, false) }, { a: e(40, true) });
    expect(r.push).toEqual(['a']);
    expect(r.merged.a!.solved).toBe(false);
  });
});

describe('parseBatchBody', () => {
  const now = 1_700_000_000_000;
  it('accepts a well-formed batch', () => {
    expect(parseBatchBody({ entries: { 'two-sum': e(now), '3sum': e(now - 1, false, 'n') } }, now)).toEqual({
      ok: true,
      value: { 'two-sum': e(now), '3sum': e(now - 1, false, 'n') },
    });
  });

  const many = Object.fromEntries(
    Array.from({ length: MAX_BATCH_ENTRIES + 1 }, (_, i) => [`p-${i}`, e(now)]),
  );
  it.each([
    ['non-object', 'nope'],
    ['missing entries', {}],
    ['entries array', { entries: [] }],
    ['empty entries', { entries: {} }],
    ['bad slug', { entries: { Bad_Slug: e(now) } }],
    ['bad entry', { entries: { 'two-sum': { solved: 'yes', notes: '', updatedAt: now } } }],
    ['future entry', { entries: { 'two-sum': e(now + MAX_CLOCK_SKEW_MS + 1) } }],
    ['too many entries', { entries: many }],
  ])('rejects %s', (_label, body) => {
    expect(parseBatchBody(body, now).ok).toBe(false);
  });

  it('allows exactly MAX_BATCH_ENTRIES', () => {
    const ok = Object.fromEntries(Array.from({ length: MAX_BATCH_ENTRIES }, (_, i) => [`p-${i}`, e(now)]));
    expect(parseBatchBody({ entries: ok }, now).ok).toBe(true);
  });

  it('never echoes notes in errors', () => {
    const r = parseBatchBody({ entries: { a: { solved: 1, notes: 'SECRET', updatedAt: now } } }, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toContain('SECRET');
  });
});

describe('applyBatch (server last-write-wins)', () => {
  it('applies newer, reports older/equal as stale, leaves input untouched', () => {
    const stored: ProgressMap = { a: e(100, true, 'srv'), b: e(100), c: e(100) };
    const r = applyBatch(stored, { a: e(50, false, 'old'), b: e(100, false, 'tie'), c: e(200, false, 'new'), d: e(1) });
    expect(r.applied).toEqual(['c', 'd']);
    expect(r.stale).toEqual({ a: e(100, true, 'srv'), b: e(100) });
    expect(r.added).toBe(1);
    expect(r.next).toEqual({ a: e(100, true, 'srv'), b: e(100), c: e(200, false, 'new'), d: e(1) });
    expect(stored.c).toEqual(e(100));
  });
});

describe('KV doc encoding', () => {
  it('uses one versioned key per user', () => {
    expect(progressKey('u1')).toBe('pp:v1:u1');
    expect(JSON.parse(encodeDoc({ a: e(1) }))).toEqual({ v: 1, progress: { a: e(1) } });
  });

  it('decodes leniently and drops junk', () => {
    expect(decodeDoc(null)).toEqual({});
    expect(decodeDoc('{"v":2,"progress":{"a":{"solved":true,"notes":"","updatedAt":1}}}')).toEqual({});
    expect(
      decodeDoc(JSON.stringify({ v: 1, progress: { ok: e(5), Bad_Slug: e(5), zero: { solved: true } } })),
    ).toEqual({ ok: e(5) });
    expect(() => decodeDoc('{not json')).toThrow(CorruptDocError);
  });
});

describe('saveBatch / loadProgress on KV', () => {
  it('merges, writes once, and skips the write when nothing changed', async () => {
    const kv = new FakeKV();
    let r = await saveBatch(kv, 'u1', { 'two-sum': e(100, true, 'v1'), '3sum': e(100) });
    expect(r).toEqual({ status: 'ok', applied: ['3sum', 'two-sum'], stale: {}, wrote: true });
    expect(kv.puts).toBe(1);

    r = await saveBatch(kv, 'u1', { 'two-sum': e(50, false, 'old'), '3sum': e(100) });
    expect(r).toEqual({
      status: 'ok',
      applied: [],
      stale: { 'two-sum': e(100, true, 'v1'), '3sum': e(100) },
      wrote: false,
    });
    expect(kv.puts).toBe(1);

    r = await saveBatch(kv, 'u1', { 'two-sum': e(200, false, 'v2'), '3sum': e(10) });
    expect(r).toMatchObject({ status: 'ok', applied: ['two-sum'], stale: { '3sum': e(100) } });
    expect(kv.puts).toBe(2);
    expect(await loadProgress(kv, 'u1')).toEqual({ 'two-sum': e(200, false, 'v2'), '3sum': e(100) });
    expect(await loadProgress(kv, 'nobody')).toEqual({});
  });

  it('enforces the per-user entry cap without writing', async () => {
    const kv = new FakeKV();
    const full: ProgressMap = {};
    for (let i = 0; i < MAX_ENTRIES_PER_USER; i++) full[`p-${i}`] = e(1);
    kv.store.set(progressKey('u1'), encodeDoc(full));
    expect(await saveBatch(kv, 'u1', { 'one-more': e(2) })).toEqual({ status: 'entry_limit' });
    // Updating an existing slug at the cap is still fine.
    expect(await saveBatch(kv, 'u1', { 'p-0': e(2) })).toMatchObject({ status: 'ok', applied: ['p-0'] });
    expect(kv.puts).toBe(1);
  });

  it('enforces the serialized size cap without writing', async () => {
    const kv = new FakeKV();
    const big = 'é'.repeat(MAX_NOTES_CHARS); // 2 bytes each in UTF-8
    const batch: ProgressMap = {};
    for (let i = 0; i < Math.ceil(MAX_DOC_BYTES / (2 * MAX_NOTES_CHARS)) + 1; i++) batch[`p-${i}`] = e(1, true, big);
    const r = await saveBatch(kv, 'u1', batch);
    expect(r.status).toBe('size_limit');
    expect(kv.puts).toBe(0);
  });

  it('wraps KV failures as KvUnavailableError', async () => {
    const kv = new FakeKV();
    kv.failPut = new Error('KV PUT failed: 429 Too Many Requests');
    await expect(saveBatch(kv, 'u1', { a: e(1) })).rejects.toBeInstanceOf(KvUnavailableError);
    kv.failGet = new Error('network');
    await expect(loadProgress(kv, 'u1')).rejects.toBeInstanceOf(KvUnavailableError);
  });
});

describe('API route /api/v1/problems/progress', () => {
  const user = { id: 'u1', email: 'user@test.com', name: 'U', role: 'user' };

  // Astro's APIContext is large; the handlers only read these fields.
  type Ctx = Parameters<typeof PUT>[0];
  const ctx = (o: { user?: unknown; body?: string; ctype?: string; kv?: KVNamespace | null }) =>
    ({
      locals: {
        user: o.user ?? null,
        session: null,
        runtime: o.kv === null ? { env: {} } : { env: { KV: o.kv } },
      },
      params: {},
      request: new Request('http://x/api/v1/problems/progress', {
        method: o.body === undefined ? 'GET' : 'PUT',
        headers: { 'Content-Type': o.ctype ?? 'application/json' },
        body: o.body,
      }),
    }) as unknown as Ctx;
  const batch = (entries: Record<string, unknown>) => JSON.stringify({ entries });

  it('401s when signed out', async () => {
    const kv = new FakeKV();
    expect((await GET(ctx({ kv }))).status).toBe(401);
    expect((await PUT(ctx({ kv, body: batch({ a: e(1) }) }))).status).toBe(401);
  });

  it('validates content type, JSON and entries', async () => {
    const kv = new FakeKV();
    const good = batch({ 'two-sum': e(Date.now()) });
    expect((await PUT(ctx({ user, kv, body: good, ctype: 'text/plain' }))).status).toBe(415);
    expect((await PUT(ctx({ user, kv, body: '{nope' }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({ Bad_Slug: e(Date.now()) }) }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({ a: { solved: 'yes' } }) }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({}) }))).status).toBe(400);
    expect(kv.puts).toBe(0);
  });

  it('413s on an oversized body and on the size cap', async () => {
    const kv = new FakeKV();
    const huge = JSON.stringify({ entries: { a: e(1) }, pad: 'x'.repeat(MAX_DOC_BYTES) });
    const r1 = await PUT(ctx({ user, kv, body: huge }));
    expect(r1.status).toBe(413);

    const big = '€'.repeat(MAX_NOTES_CHARS); // 3 bytes each
    const t = Date.now();
    const entries: Record<string, ProgressEntry> = {};
    for (let i = 0; i < 30; i++) entries[`p-${i}`] = e(t, true, big);
    // Two ~1.7 MiB batches: each fits the body cap, together exceed the doc cap.
    expect((await PUT(ctx({ user, kv, body: batch(entries) }))).status).toBe(200);
    const more: Record<string, ProgressEntry> = {};
    for (let i = 30; i < 45; i++) more[`p-${i}`] = e(t, true, big);
    const r2 = await PUT(ctx({ user, kv, body: batch(more) }));
    expect(r2.status).toBe(413);
    expect(await r2.json()).toMatchObject({ error: 'storage_limit' });
    expect(kv.puts).toBe(1);
  });

  it('503s (retryable) when KV is missing or a put fails', async () => {
    const r0 = await GET(ctx({ user, kv: null }));
    expect(r0.status).toBe(503);
    expect(await r0.json()).toMatchObject({ error: 'sync_unavailable', retryable: true });
    expect((await PUT(ctx({ user, kv: null, body: batch({ a: e(Date.now()) }) }))).status).toBe(503);

    const kv = new FakeKV();
    kv.failPut = new Error('KV PUT failed: 429 Too Many Requests');
    const r1 = await PUT(ctx({ user, kv, body: batch({ a: e(Date.now(), true, 'private note') }) }));
    expect(r1.status).toBe(503);
    expect(r1.headers.get('Retry-After')).toBeTruthy();
    const body = await r1.json();
    expect(body).toMatchObject({ retryable: true });
    expect(JSON.stringify(body)).not.toContain('private note');

    kv.failGet = new Error('boom');
    expect((await GET(ctx({ user, kv }))).status).toBe(503);
  });

  it('round-trips batch PUT then GET with last-write-wins and stale echo', async () => {
    const kv = new FakeKV();
    const t = Date.now();
    const r1 = await PUT(ctx({ user, kv, body: batch({ 'two-sum': e(t, true, 'first'), '3sum': e(t, false) }) }));
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ applied: ['3sum', 'two-sum'], stale: {} });

    const r2 = await PUT(ctx({ user, kv, body: batch({ 'two-sum': e(t - 1000, false, 'older'), 'new-one': e(t) }) }));
    expect(await r2.json()).toEqual({ applied: ['new-one'], stale: { 'two-sum': e(t, true, 'first') } });

    const g = await GET(ctx({ user, kv }));
    expect(g.status).toBe(200);
    expect(g.headers.get('Cache-Control')).toContain('no-store');
    expect(await g.json()).toEqual({
      progress: { 'two-sum': e(t, true, 'first'), '3sum': e(t, false), 'new-one': e(t) },
    });
    // Other users see nothing.
    const other = await GET(ctx({ user: { ...user, id: 'u2' }, kv }));
    expect(await other.json()).toEqual({ progress: {} });
    expect([...kv.store.keys()]).toEqual(['pp:v1:u1']);
  });
});
