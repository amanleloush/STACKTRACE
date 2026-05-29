// Local-only better-sqlite3 implementation of the Db interface.
// Dynamic-imported by src/lib/db.ts so this file (and its native binding)
// never reaches the Cloudflare worker bundle.

import BetterSqlite3 from 'better-sqlite3';
import type { Db, RunResult } from './db';

// One sqlite handle per file-path, shared across requests. better-sqlite3 is
// thread-safe for single-process concurrent reads + sequential writes;
// reopening per request would dominate latency in dev. `:memory:` is
// per-connection by definition in sqlite, so we never cache that path —
// each test gets an isolated in-memory db.
const handles = new Map<string, BetterSqlite3.Database>();
function openSqlite(localPath: string): BetterSqlite3.Database {
  if (localPath !== ':memory:') {
    const cached = handles.get(localPath);
    if (cached) return cached;
  }
  const h = new BetterSqlite3(localPath);
  h.pragma('journal_mode = WAL');
  h.pragma('foreign_keys = ON');
  if (localPath !== ':memory:') handles.set(localPath, h);
  return h;
}

export function makeDevDb(localPath: string = '.local.db'): Db {
  const sqlite = openSqlite(localPath);

  return {
    async first<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const row = sqlite.prepare(sql).get(...(params as never[])) as T | undefined;
      return row ?? null;
    },
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return sqlite.prepare(sql).all(...(params as never[])) as T[];
    },
    async run(sql: string, params: unknown[] = []): Promise<RunResult> {
      const r = sqlite.prepare(sql).run(...(params as never[]));
      const lastRowid = typeof r.lastInsertRowid === 'bigint' ? Number(r.lastInsertRowid) : r.lastInsertRowid;
      return { changes: r.changes, lastInsertRowid: lastRowid };
    },
    async exec(sql: string): Promise<void> {
      sqlite.exec(sql);
    },
  };
}
