import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { makeDevDb } from '~/lib/db.dev';
import { runMigrations } from '~/lib/migrate';

describe('Db abstraction (dev impl)', () => {
  it('round-trips a value through run / first', async () => {
    const db = makeDevDb(':memory:');
    await db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
    const r = await db.run('INSERT INTO t (name) VALUES (?)', ['raft']);
    expect(r.changes).toBe(1);
    expect(r.lastInsertRowid).toBeGreaterThanOrEqual(1);
    const row = await db.first<{ id: number; name: string }>('SELECT * FROM t WHERE id = ?', [r.lastInsertRowid]);
    expect(row?.name).toBe('raft');
  });

  it('first returns null when no row matches', async () => {
    const db = makeDevDb(':memory:');
    await db.exec('CREATE TABLE t (id INTEGER)');
    expect(await db.first('SELECT * FROM t WHERE id = ?', [999])).toBeNull();
  });

  it('query returns every matching row', async () => {
    const db = makeDevDb(':memory:');
    await db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, label TEXT)');
    for (const label of ['a', 'b', 'c']) {
      await db.run('INSERT INTO t (label) VALUES (?)', [label]);
    }
    const rows = await db.query<{ label: string }>('SELECT label FROM t ORDER BY id');
    expect(rows.map((r) => r.label)).toEqual(['a', 'b', 'c']);
  });
});

describe('migration runner', () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'sysviz-migrate-'));
  });

  it('applies new migrations in lexicographic order and records them', async () => {
    const migDir = path.join(tmpDir, 'migrations');
    await mkdir(migDir, { recursive: true });
    await writeFile(path.join(migDir, '0001_a.sql'), 'CREATE TABLE a (x INTEGER);');
    await writeFile(path.join(migDir, '0002_b.sql'), 'CREATE TABLE b (y TEXT);');

    const db = makeDevDb(':memory:');
    const result = await runMigrations(db, migDir);
    expect(result.applied).toEqual(['0001_a.sql', '0002_b.sql']);

    // Both tables should exist now.
    const tables = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    // Note: SQL `LIKE '_%'` would *not* filter underscore-prefixed tables —
    // `_` is a single-char wildcard. Filter in JS instead.
    expect(tables.map((t) => t.name).filter((n) => !n.startsWith('_'))).toEqual(['a', 'b']);

    // Tracking table records both.
    const recorded = await db.query<{ filename: string }>(
      'SELECT filename FROM _migrations ORDER BY filename',
    );
    expect(recorded.map((r) => r.filename)).toEqual(['0001_a.sql', '0002_b.sql']);

    await rm(tmpDir, { recursive: true, force: true });
  });

  it('is idempotent — second run applies nothing', async () => {
    const migDir = path.join(tmpDir, 'migrations');
    await mkdir(migDir, { recursive: true });
    await writeFile(path.join(migDir, '0001_a.sql'), 'CREATE TABLE a (x INTEGER);');
    const db = makeDevDb(':memory:');

    const first = await runMigrations(db, migDir);
    const second = await runMigrations(db, migDir);
    expect(first.applied).toEqual(['0001_a.sql']);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toContain('0001_a.sql');

    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns gracefully when the migrations dir is absent', async () => {
    const db = makeDevDb(':memory:');
    const result = await runMigrations(db, path.join(tmpDir, 'does-not-exist'));
    expect(result.applied).toEqual([]);
  });
});
