import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDevDb } from '~/lib/db.dev';
import { runMigrations } from '~/lib/migrate';
import {
  isValidSlug,
  mergeProgress,
  parseProgressBody,
  MAX_CLOCK_SKEW_MS,
  MAX_NOTES_CHARS,
  type ProgressMap,
} from '~/lib/problem-progress';
import { listProgress, upsertProgress } from '~/lib/problem-progress-db';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS = path.join(REPO, 'migrations');

async function freshDb() {
  const db = makeDevDb(':memory:');
  await runMigrations(db, MIGRATIONS);
  await db.run(
    `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    ['u1', 'g-1', 'user@test.com', 'user', 1],
  );
  return db;
}

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
  const e = (updatedAt: number, solved = true, notes = '') => ({ solved, notes, updatedAt });

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

describe('problem_progress persistence', () => {
  it('upserts with last-write-wins and lists per user', async () => {
    const db = await freshDb();
    expect(await upsertProgress(db, 'u1', 'two-sum', { solved: true, notes: 'v1', updatedAt: 100 }))
      .toEqual({ status: 'applied', entry: { solved: true, notes: 'v1', updatedAt: 100 } });

    // Older write loses and gets the stored row back.
    expect(await upsertProgress(db, 'u1', 'two-sum', { solved: false, notes: 'old', updatedAt: 50 }))
      .toEqual({ status: 'stale', entry: { solved: true, notes: 'v1', updatedAt: 100 } });
    // Equal timestamp is also stale (no flip-flopping between devices).
    expect((await upsertProgress(db, 'u1', 'two-sum', { solved: false, notes: 'tie', updatedAt: 100 })).status)
      .toBe('stale');

    await upsertProgress(db, 'u1', 'two-sum', { solved: false, notes: 'v2', updatedAt: 200 });
    expect(await listProgress(db, 'u1')).toEqual({ 'two-sum': { solved: false, notes: 'v2', updatedAt: 200 } });
    expect(await listProgress(db, 'nobody')).toEqual({});
  });

  it('cascades on user delete', async () => {
    const db = await freshDb();
    await upsertProgress(db, 'u1', 'a', { solved: true, notes: '', updatedAt: 1 });
    await db.run('DELETE FROM users WHERE id = ?', ['u1']);
    const n = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM problem_progress');
    expect(n?.n).toBe(0);
  });
});

describe('API routes /api/v1/problems/progress', () => {
  let tmp: string;
  let prevPath: string | undefined;
  const user = { id: 'u1', email: 'user@test.com', name: 'U', role: 'user' };

  beforeAll(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), 'stacktrace-progress-'));
    prevPath = process.env.LOCAL_DB_PATH;
    process.env.LOCAL_DB_PATH = path.join(tmp, 'test.db');
    const db = makeDevDb(process.env.LOCAL_DB_PATH);
    await runMigrations(db, MIGRATIONS);
    await db.run(
      `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['u1', 'g-1', 'user@test.com', 'user', 1],
    );
  });
  afterAll(async () => {
    if (prevPath === undefined) delete process.env.LOCAL_DB_PATH;
    else process.env.LOCAL_DB_PATH = prevPath;
    await rm(tmp, { recursive: true, force: true });
  });

  // Astro's APIContext is large; the handlers only read these fields.
  type Ctx = Parameters<typeof import('~/pages/api/v1/problems/progress/[slug]').PUT>[0];
  const ctx = (o: { user?: unknown; slug?: string; body?: string; ctype?: string }) =>
    ({
      locals: { user: o.user ?? null, session: null },
      params: { slug: o.slug },
      request: new Request('http://x/api', {
        method: o.body === undefined ? 'GET' : 'PUT',
        headers: { 'Content-Type': o.ctype ?? 'application/json' },
        body: o.body,
      }),
    }) as unknown as Ctx;

  it('401s when signed out', async () => {
    const { GET } = await import('~/pages/api/v1/problems/progress/index');
    const { PUT } = await import('~/pages/api/v1/problems/progress/[slug]');
    expect((await GET(ctx({}))).status).toBe(401);
    expect((await PUT(ctx({ slug: 'two-sum', body: '{}' }))).status).toBe(401);
  });

  it('validates slug, content type and body', async () => {
    const { PUT } = await import('~/pages/api/v1/problems/progress/[slug]');
    const good = JSON.stringify({ solved: true, notes: '', updatedAt: Date.now() });
    expect((await PUT(ctx({ user, slug: 'Bad_Slug', body: good }))).status).toBe(400);
    expect((await PUT(ctx({ user, slug: 'two-sum', body: good, ctype: 'text/plain' }))).status).toBe(415);
    expect((await PUT(ctx({ user, slug: 'two-sum', body: '{nope' }))).status).toBe(400);
    expect((await PUT(ctx({ user, slug: 'two-sum', body: '{"solved":"yes"}' }))).status).toBe(400);
  });

  it('round-trips PUT then GET, last-write-wins', async () => {
    const { GET } = await import('~/pages/api/v1/problems/progress/index');
    const { PUT } = await import('~/pages/api/v1/problems/progress/[slug]');
    const t = Date.now();
    const put = (updatedAt: number, notes: string) =>
      PUT(ctx({ user, slug: 'two-sum', body: JSON.stringify({ solved: true, notes, updatedAt }) }));

    const r1 = await put(t, 'first');
    expect(r1.status).toBe(200);
    expect(await r1.json()).toMatchObject({ status: 'applied', entry: { notes: 'first' } });

    const r2 = await put(t - 1000, 'older');
    expect(await r2.json()).toMatchObject({ status: 'stale', entry: { notes: 'first', updatedAt: t } });

    const g = await GET(ctx({ user }));
    expect(g.status).toBe(200);
    expect(g.headers.get('Cache-Control')).toContain('no-store');
    expect(await g.json()).toEqual({ progress: { 'two-sum': { solved: true, notes: 'first', updatedAt: t } } });
  });
});
