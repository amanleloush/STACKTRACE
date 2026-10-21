import { describe, it, expect } from 'vitest';
import type { KVNamespace } from '~/lib/kv';
import { inlineCodeHtml, mcqId } from '~/lib/content-extract';
import { applyLwwBatch, mergeLww } from '~/lib/lww';
import {
  bucketMistakes,
  coerceMistake,
  inlineParts,
  isValidMcqId,
  parseBatchBody,
  parseMistakeBody,
  recordRight,
  recordWrong,
  slugOfId,
  MAX_BATCH_ENTRIES,
  MAX_CLOCK_SKEW_MS,
  MAX_DOC_BYTES,
  MAX_ENTRIES_PER_USER,
  MAX_MISSES,
  type MistakeEntry,
  type MistakeMap,
} from '~/lib/mistakes';
import { mistakesDoc } from '~/lib/mistakes-kv';
import { CorruptDocError, KvUnavailableError } from '~/lib/kv-doc';
import { GET, PUT } from '~/pages/api/v1/quiz/mistakes/index';

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

const m = (
  updatedAt: number,
  status: MistakeEntry['status'] = 'open',
  misses = 1,
  noteSlug = 'kafka',
  lastPicked = 0,
): MistakeEntry => ({ status, misses, lastPicked, noteSlug, updatedAt });

const ID = mcqId('kafka', 'Why does Kafka scale?');
const ID2 = mcqId('redis', 'Which command is O(N)?');

describe('ids', () => {
  it('accepts the ids MCQ.astro emits and nothing else', () => {
    expect(isValidMcqId(ID)).toBe(true);
    expect(isValidMcqId(ID2)).toBe(true);
    expect(slugOfId(ID)).toBe('kafka');
    for (const bad of ['', 'kafka', 'Kafka:abc', 'kafka:', ':abc', 'kafka:ab_c', 'a b:c', `${'a'.repeat(121)}:x`, 42, null]) {
      expect(isValidMcqId(bad), String(bad)).toBe(false);
    }
  });
});

describe('state transitions', () => {
  it('a wrong answer opens, counts and remembers the pick', () => {
    const a = recordWrong(null, 2, 'kafka', 1000);
    expect(a).toEqual({ status: 'open', misses: 1, lastPicked: 2, noteSlug: 'kafka', updatedAt: 1000 });
    const b = recordWrong(a, 1, 'kafka', 2000);
    expect(b).toMatchObject({ status: 'open', misses: 2, lastPicked: 1, updatedAt: 2000 });
  });

  it('a wrong answer re-opens a resolved question', () => {
    expect(recordWrong(m(5, 'resolved', 3), 0, 'kafka', 10)).toMatchObject({ status: 'open', misses: 4 });
  });

  it('a right answer resolves only an open question, keeping the entry', () => {
    expect(recordRight(null, 1)).toBeNull();
    expect(recordRight(m(5, 'resolved'), 10)).toBeNull();
    expect(recordRight(m(5, 'open', 3), 10)).toEqual(m(10, 'resolved', 3));
  });

  it('updatedAt strictly increases even if the clock steps back', () => {
    expect(recordWrong(m(5000), 0, 'kafka', 1000).updatedAt).toBe(5001);
    expect(recordRight(m(5000), 1000)!.updatedAt).toBe(5001);
  });

  it('clamps a nonsense pick', () => {
    expect(recordWrong(null, 99, 'kafka', 1).lastPicked).toBe(-1);
  });
});

describe('coerceMistake (storage / network)', () => {
  it('keeps a good entry', () => {
    expect(coerceMistake(m(5))).toEqual(m(5));
  });

  it('drops what cannot be repaired', () => {
    for (const bad of [null, 'x', [], {}, { ...m(5), status: 'gone' }, { ...m(5), noteSlug: '../x' }, { ...m(5), noteSlug: 1 }]) {
      expect(coerceMistake(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('clamps numbers', () => {
    expect(coerceMistake({ ...m(5), misses: -3, lastPicked: 42, updatedAt: 'x' })).toEqual({
      ...m(0, 'open', 0),
      lastPicked: -1,
    });
    expect(coerceMistake({ ...m(5.7), misses: 1e12 })).toMatchObject({ misses: MAX_MISSES, updatedAt: 5 });
  });
});

describe('body validation', () => {
  const now = 1_700_000_000_000;
  it('accepts a well-formed entry and batch', () => {
    expect(parseMistakeBody(m(now), now)).toEqual({ ok: true, value: m(now) });
    expect(parseBatchBody({ entries: { [ID]: m(now), [ID2]: m(now - 1, 'resolved', 2, 'redis') } }, now).ok).toBe(true);
  });

  it.each([
    ['non-object', 'nope'],
    ['bad status', { ...m(now), status: 'closed' }],
    ['negative misses', { ...m(now), misses: -1 }],
    ['float misses', { ...m(now), misses: 1.5 }],
    ['pick out of range', { ...m(now), lastPicked: 8 }],
    ['bad slug', { ...m(now), noteSlug: 'Kafka' }],
    ['missing updatedAt', { status: 'open', misses: 1, lastPicked: 0, noteSlug: 'kafka' }],
    ['future updatedAt', m(now + MAX_CLOCK_SKEW_MS + 1)],
  ])('rejects an entry with %s', (_label, body) => {
    expect(parseMistakeBody(body, now).ok).toBe(false);
  });

  const many = Object.fromEntries(Array.from({ length: MAX_BATCH_ENTRIES + 1 }, (_, i) => [`n:${i.toString(36)}`, m(now)]));
  it.each([
    ['non-object', 'nope'],
    ['missing entries', {}],
    ['entries array', { entries: [] }],
    ['empty entries', { entries: {} }],
    ['bad id', { entries: { 'kafka:no_t': m(now) } }],
    ['bad entry', { entries: { [ID]: { ...m(now), status: 1 } } }],
    ['too many entries', { entries: many }],
  ])('rejects a batch with %s', (_label, body) => {
    expect(parseBatchBody(body, now).ok).toBe(false);
  });
});

describe('last-write-wins merge + tombstones', () => {
  it('a newer resolve on one device beats an older open on another', () => {
    const local: MistakeMap = { [ID]: m(10, 'open', 1) };
    const server: MistakeMap = { [ID]: m(20, 'resolved', 1) };
    const r = mergeLww(local, server);
    expect(r.pull).toEqual([ID]);
    expect(r.merged[ID]!.status).toBe('resolved');
  });

  it('a newer miss re-opens over an older resolve', () => {
    const r = mergeLww({ [ID]: m(30, 'open', 2) }, { [ID]: m(20, 'resolved', 1) });
    expect(r.push).toEqual([ID]);
    expect(r.merged[ID]).toEqual(m(30, 'open', 2));
  });

  it('server batch keeps the resolve and echoes it as stale to the older device', () => {
    const r = applyLwwBatch({ [ID]: m(20, 'resolved') }, { [ID]: m(10, 'open') });
    expect(r.applied).toEqual([]);
    expect(r.stale).toEqual({ [ID]: m(20, 'resolved') });
  });
});

describe('bucketMistakes', () => {
  it('splits open / orphaned / resolved and honours "clear resolved"', () => {
    const map: MistakeMap = {
      'a:1': m(10, 'open'),
      'a:2': m(10, 'open'),
      'a:3': m(10, 'resolved'),
      'a:4': m(30, 'resolved'),
      'a:5': m(30, 'resolved'),
    };
    const known = (id: string) => id !== 'a:2' && id !== 'a:5';
    expect(bucketMistakes(map, known, 20)).toEqual({ open: ['a:1'], orphans: ['a:2'], resolved: ['a:4'] });
    expect(bucketMistakes(map, known, 0).resolved).toEqual(['a:3', 'a:4']);
  });
});

describe('inlineParts', () => {
  it('matches inlineCodeHtml semantics', () => {
    const html = (s: string) =>
      inlineParts(s)
        .map((p) => {
          const t = p.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          return p.code ? `<code>${t}</code>` : t;
        })
        .join('');
    for (const s of ['plain', 'use `KEYS *` <never>', '`a` & `b`', 'odd ` tick', '']) {
      expect(html(s)).toBe(inlineCodeHtml(s));
    }
  });
});

describe('KV doc', () => {
  it('uses one versioned key per user and decodes leniently', () => {
    expect(mistakesDoc.key('u1')).toBe('qm:v1:u1');
    expect(JSON.parse(mistakesDoc.encode({ [ID]: m(1) }))).toEqual({ v: 1, mistakes: { [ID]: m(1) } });
    expect(mistakesDoc.decode(null)).toEqual({});
    expect(
      mistakesDoc.decode(JSON.stringify({ v: 1, mistakes: { [ID]: m(5), 'Bad Id': m(5), [ID2]: { status: 'x' } } })),
    ).toEqual({ [ID]: m(5) });
    expect(() => mistakesDoc.decode('{nope')).toThrow(CorruptDocError);
  });

  it('enforces the entry cap without writing', async () => {
    const kv = new FakeKV();
    const full: MistakeMap = {};
    for (let i = 0; i < MAX_ENTRIES_PER_USER; i++) full[`n:${i.toString(36)}`] = m(1);
    kv.store.set(mistakesDoc.key('u1'), mistakesDoc.encode(full));
    expect(await mistakesDoc.saveBatch(kv, 'u1', { [ID]: m(2) })).toEqual({ status: 'entry_limit' });
    expect(await mistakesDoc.saveBatch(kv, 'u1', { 'n:0': m(2, 'resolved') })).toMatchObject({ status: 'ok', applied: ['n:0'] });
    expect(kv.puts).toBe(1);
  });

  it('wraps KV failures', async () => {
    const kv = new FakeKV();
    kv.failGet = new Error('net');
    await expect(mistakesDoc.load(kv, 'u1')).rejects.toBeInstanceOf(KvUnavailableError);
  });
});

describe('API route /api/v1/quiz/mistakes', () => {
  const user = { id: 'u1', email: 'user@test.com', name: 'U', role: 'user' };
  type Ctx = Parameters<typeof PUT>[0];
  const ctx = (o: { user?: unknown; body?: string; ctype?: string; kv?: KVNamespace | null }) =>
    ({
      locals: {
        user: o.user ?? null,
        session: null,
        runtime: o.kv === null ? { env: {} } : { env: { KV: o.kv } },
      },
      params: {},
      request: new Request('http://x/api/v1/quiz/mistakes', {
        method: o.body === undefined ? 'GET' : 'PUT',
        headers: { 'Content-Type': o.ctype ?? 'application/json' },
        body: o.body,
      }),
    }) as unknown as Ctx;
  const batch = (entries: Record<string, unknown>) => JSON.stringify({ entries });

  it('401s when signed out', async () => {
    const kv = new FakeKV();
    expect((await GET(ctx({ kv }))).status).toBe(401);
    expect((await PUT(ctx({ kv, body: batch({ [ID]: m(1) }) }))).status).toBe(401);
  });

  it('validates content type, JSON and entries', async () => {
    const kv = new FakeKV();
    const t = Date.now();
    expect((await PUT(ctx({ user, kv, body: batch({ [ID]: m(t) }), ctype: 'text/plain' }))).status).toBe(415);
    expect((await PUT(ctx({ user, kv, body: '{nope' }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({ 'Bad:id': m(t) }) }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({ [ID]: { ...m(t), status: 'gone' } }) }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({}) }))).status).toBe(400);
    expect(kv.puts).toBe(0);
  });

  it('413s on an oversized body', async () => {
    const kv = new FakeKV();
    const huge = JSON.stringify({ entries: { [ID]: m(1) }, pad: 'x'.repeat(MAX_DOC_BYTES) });
    expect((await PUT(ctx({ user, kv, body: huge }))).status).toBe(413);
  });

  it('413s at the entry cap', async () => {
    const kv = new FakeKV();
    const full: MistakeMap = {};
    for (let i = 0; i < MAX_ENTRIES_PER_USER; i++) full[`n:${i.toString(36)}`] = m(1);
    kv.store.set('qm:v1:u1', mistakesDoc.encode(full));
    const r = await PUT(ctx({ user, kv, body: batch({ [ID]: m(Date.now()) }) }));
    expect(r.status).toBe(413);
    expect(await r.json()).toMatchObject({ error: 'entry_limit' });
  });

  it('503s (retryable) when KV is missing or fails', async () => {
    const r0 = await GET(ctx({ user, kv: null }));
    expect(r0.status).toBe(503);
    expect(await r0.json()).toMatchObject({ error: 'sync_unavailable', retryable: true });
    const kv = new FakeKV();
    kv.failPut = new Error('429');
    const r1 = await PUT(ctx({ user, kv, body: batch({ [ID]: m(Date.now()) }) }));
    expect(r1.status).toBe(503);
    expect(r1.headers.get('Retry-After')).toBeTruthy();
  });

  it('500s without overwriting a corrupt doc', async () => {
    const kv = new FakeKV();
    kv.store.set('qm:v1:u1', '{corrupt');
    expect((await PUT(ctx({ user, kv, body: batch({ [ID]: m(Date.now()) }) }))).status).toBe(500);
    expect(kv.store.get('qm:v1:u1')).toBe('{corrupt');
  });

  it('round-trips with last-write-wins, tombstones and stale echo', async () => {
    const kv = new FakeKV();
    const t = Date.now();
    const r1 = await PUT(ctx({ user, kv, body: batch({ [ID]: m(t - 10, 'open', 2), [ID2]: m(t, 'resolved', 1, 'redis') }) }));
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ applied: [ID, ID2].sort(), stale: {} });

    // Another device resolves ID; a third, older device tries to re-open ID2.
    const r2 = await PUT(ctx({ user, kv, body: batch({ [ID]: m(t, 'resolved', 2), [ID2]: m(t - 5, 'open', 1, 'redis') }) }));
    expect(await r2.json()).toEqual({ applied: [ID], stale: { [ID2]: m(t, 'resolved', 1, 'redis') } });

    const g = await GET(ctx({ user, kv }));
    expect(g.status).toBe(200);
    expect(g.headers.get('Cache-Control')).toContain('no-store');
    expect(await g.json()).toEqual({ mistakes: { [ID]: m(t, 'resolved', 2), [ID2]: m(t, 'resolved', 1, 'redis') } });
    const other = await GET(ctx({ user: { ...user, id: 'u2' }, kv }));
    expect(await other.json()).toEqual({ mistakes: {} });
    expect([...kv.store.keys()]).toEqual(['qm:v1:u1']);
  });
});
