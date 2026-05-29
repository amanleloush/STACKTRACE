import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDevDb } from '~/lib/db.dev';
import { runMigrations } from '~/lib/migrate';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS = path.join(REPO, 'migrations');

const REQUIRED_TABLES = [
  'users',
  'sessions',
  'subscriptions',
  'entitlement_overrides',
  'progress',
  'feature_flags',
  'api_keys',
] as const;

describe('Phase 3 schema migration', () => {
  it('creates all seven required tables', async () => {
    const db = makeDevDb(':memory:');
    await runMigrations(db, MIGRATIONS);
    const rows = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const tableNames = new Set(rows.map((r) => r.name));
    for (const t of REQUIRED_TABLES) {
      expect(tableNames.has(t), `missing table: ${t}`).toBe(true);
    }
  });

  it('users.google_sub is UNIQUE — duplicate inserts fail', async () => {
    const db = makeDevDb(':memory:');
    await runMigrations(db, MIGRATIONS);
    await db.run(
      `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['u1', 'sub-1', 'a@x.com', 'user', 1],
    );
    await expect(
      db.run(
        `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
        ['u2', 'sub-1', 'b@x.com', 'user', 2],
      ),
    ).rejects.toThrow();
  });

  it('entitlement_overrides PK is composite on (entity_kind, entity_id)', async () => {
    const db = makeDevDb(':memory:');
    await runMigrations(db, MIGRATIONS);
    await db.run(
      `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['u1', 'sub-1', 'a@x.com', 'admin', 1],
    );
    await db.run(
      `INSERT INTO entitlement_overrides
         (entity_kind, entity_id, premium, preview_paragraphs, updated_at, updated_by)
       VALUES ('note', 'foo', 1, 4, 1, 'u1')`,
    );
    // Same (kind, id) → second insert must fail without ON CONFLICT.
    await expect(
      db.run(
        `INSERT INTO entitlement_overrides
           (entity_kind, entity_id, premium, preview_paragraphs, updated_at, updated_by)
         VALUES ('note', 'foo', 0, null, 2, 'u1')`,
      ),
    ).rejects.toThrow();
    // Different kind, same id → OK.
    await db.run(
      `INSERT INTO entitlement_overrides
         (entity_kind, entity_id, premium, preview_paragraphs, updated_at, updated_by)
       VALUES ('anim', 'foo', 1, null, 3, 'u1')`,
    );
  });
});
