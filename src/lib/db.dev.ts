// Local-only better-sqlite3 implementation of the Db interface.
// Dynamic-imported by src/lib/db.ts so this file (and its native binding)
// never reaches the Cloudflare worker bundle.

import BetterSqlite3 from 'better-sqlite3';
import type { Db, RunResult } from './db';

export function makeDevDb(localPath: string = '.local.db'): Db {
  const sqlite = new BetterSqlite3(localPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

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
