// Single DB abstraction over Cloudflare D1 (prod) and better-sqlite3 (local).
// Every future query call site MUST go through this module — so swapping
// bindings at deploy time stays a one-line config change.
//
// Both impls are async (D1 is natively async; the dev impl wraps better-
// sqlite3 in Promise.resolve so the surface is identical).

/** Minimal subset of @cloudflare/workers-types/D1Database we depend on. */
export interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number; last_row_id?: number } }>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): Promise<unknown>;
}

export interface RunResult {
  changes: number;
  lastInsertRowid?: number;
}

export interface Db {
  /** Return the first row matching, or null. */
  first<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  /** Return all rows matching. */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  /** INSERT / UPDATE / DELETE / DDL with bound params. */
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  /** Multi-statement SQL — used by the migration runner. No parameters. */
  exec(sql: string): Promise<void>;
}

function makeD1Db(binding: D1Database): Db {
  const bound = (sql: string, params: unknown[] = []): D1PreparedStatement => {
    const stmt = binding.prepare(sql);
    return params.length ? stmt.bind(...params) : stmt;
  };
  return {
    async first<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return bound(sql, params).first<T>();
    },
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const r = await bound(sql, params).all<T>();
      return r.results;
    },
    async run(sql: string, params: unknown[] = []): Promise<RunResult> {
      const r = await bound(sql, params).run();
      return { changes: r.meta.changes, lastInsertRowid: r.meta.last_row_id };
    },
    async exec(sql: string): Promise<void> {
      await binding.exec(sql);
    },
  };
}

interface GetDbOptions {
  /** Cloudflare runtime env when called from inside a Worker. */
  env?: { DB?: D1Database };
  /** Local sqlite file path. Defaults to `.local.db` in cwd. Ignored in prod. */
  localPath?: string;
}

/**
 * Returns the right Db impl for the current runtime.
 * - import.meta.env.PROD → expects `env.DB` to be a D1 binding.
 * - dev → lazy-imports better-sqlite3 against a local file (or :memory: in tests).
 *
 * The dev branch is dynamic-imported so Vite tree-shakes `better-sqlite3`
 * out of the Cloudflare worker bundle (it has native bindings, can't run there).
 */
export async function getDb(opts: GetDbOptions = {}): Promise<Db> {
  if (import.meta.env.PROD) {
    if (!opts.env?.DB) {
      throw new Error('getDb: D1 binding `env.DB` is missing in production runtime');
    }
    return makeD1Db(opts.env.DB);
  }
  const { makeDevDb } = await import('./db.dev');
  return makeDevDb(opts.localPath);
}
