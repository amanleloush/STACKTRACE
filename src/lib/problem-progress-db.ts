// Server-side persistence for /api/v1/problems/progress/*. See
// migrations/0004_problem_progress.sql for the table.

import type { Db } from './db';
import type { ProgressEntry, ProgressMap } from './problem-progress';

/** Per-user row cap — the slug regex admits any string, so bound storage. */
export const MAX_ROWS_PER_USER = 5000;

interface Row {
  problem_slug: string;
  solved: number;
  notes: string;
  updated_at: number;
}

function toEntry(r: Row): ProgressEntry {
  return { solved: r.solved === 1, notes: r.notes, updatedAt: r.updated_at };
}

export async function listProgress(db: Db, userId: string): Promise<ProgressMap> {
  const rows = await db.query<Row>(
    'SELECT problem_slug, solved, notes, updated_at FROM problem_progress WHERE user_id = ?',
    [userId],
  );
  const out: ProgressMap = {};
  for (const r of rows) out[r.problem_slug] = toEntry(r);
  return out;
}

export type UpsertResult =
  | { status: 'applied' | 'stale'; entry: ProgressEntry }
  | { status: 'quota' };

/**
 * Last-write-wins upsert. The row is only overwritten when the incoming
 * `updatedAt` is strictly newer; otherwise the stored row is returned with
 * status `stale` so the client can adopt it.
 */
export async function upsertProgress(
  db: Db,
  userId: string,
  slug: string,
  entry: ProgressEntry,
): Promise<UpsertResult> {
  const existing = await db.first<Row>(
    'SELECT problem_slug, solved, notes, updated_at FROM problem_progress WHERE user_id = ? AND problem_slug = ?',
    [userId, slug],
  );
  if (!existing) {
    const n = await db.first<{ n: number }>(
      'SELECT COUNT(*) AS n FROM problem_progress WHERE user_id = ?',
      [userId],
    );
    if ((n?.n ?? 0) >= MAX_ROWS_PER_USER) return { status: 'quota' };
  } else if (existing.updated_at >= entry.updatedAt) {
    return { status: 'stale', entry: toEntry(existing) };
  }

  // The WHERE guard keeps LWW correct even if two writes race past the
  // read above.
  const r = await db.run(
    `INSERT INTO problem_progress (user_id, problem_slug, solved, notes, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, problem_slug) DO UPDATE SET
       solved = excluded.solved,
       notes = excluded.notes,
       updated_at = excluded.updated_at
     WHERE excluded.updated_at > problem_progress.updated_at`,
    [userId, slug, entry.solved ? 1 : 0, entry.notes, entry.updatedAt],
  );
  if (r.changes > 0) return { status: 'applied', entry };

  const current = await db.first<Row>(
    'SELECT problem_slug, solved, notes, updated_at FROM problem_progress WHERE user_id = ? AND problem_slug = ?',
    [userId, slug],
  );
  return { status: 'stale', entry: current ? toEntry(current) : entry };
}
