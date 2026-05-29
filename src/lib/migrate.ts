import fs from 'node:fs/promises';
import path from 'node:path';
import type { Db } from './db';

const TRACKING_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS _migrations (
  filename TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
`;

export interface MigrationResult {
  /** Filenames newly applied in this run, in the order they ran. */
  applied: string[];
  /** Filenames that were already applied before this run. */
  skipped: string[];
}

/**
 * Apply every `*.sql` file in `migrationsDir` (sorted lexicographically) that
 * hasn't been recorded in the `_migrations` tracking table yet. Each migration
 * file is executed in full via `db.exec`, so multi-statement SQL is supported.
 *
 * Migrations are NOT wrapped in a single transaction: D1 doesn't support
 * cross-statement transactions over the binding, and better-sqlite3 already
 * autocommits per statement. Each migration file should be authored to be
 * idempotent OR small enough to re-run safely on failure.
 */
export async function runMigrations(
  db: Db,
  migrationsDir: string,
): Promise<MigrationResult> {
  await db.exec(TRACKING_TABLE_DDL);

  const appliedRows = await db.query<{ filename: string }>(
    'SELECT filename FROM _migrations',
  );
  const applied = new Set(appliedRows.map((r) => r.filename));

  let entries: string[];
  try {
    entries = await fs.readdir(migrationsDir);
  } catch {
    return { applied: [], skipped: [...applied] };
  }
  const files = entries.filter((f) => f.endsWith('.sql')).sort();

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await db.exec(sql);
    await db.run('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)', [
      file,
      Date.now(),
    ]);
    newlyApplied.push(file);
  }

  return { applied: newlyApplied, skipped: [...applied] };
}
