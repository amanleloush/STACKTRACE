#!/usr/bin/env node
// Apply every migration in ./migrations/ to the local sqlite file.
// Usage: npm run migrate [-- --db=path/to/file.db --dir=path/to/migrations]
//
// Production migrations against D1 go through `wrangler d1 migrations apply`,
// not this script. This script exists only to keep the local dev DB in sync.

import path from 'node:path';
import { makeDevDb } from '../src/lib/db.dev.ts';
import { runMigrations } from '../src/lib/migrate.ts';

function readFlag(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const dbPath = readFlag('db', process.env.LOCAL_DB_PATH ?? '.local.db');
const migrationsDir = readFlag('dir', path.resolve(process.cwd(), 'migrations'));

const db = makeDevDb(dbPath);
const result = await runMigrations(db, migrationsDir);

if (result.applied.length === 0) {
  console.log(`[migrate] no new migrations (already-applied: ${result.skipped.length})`);
} else {
  console.log(`[migrate] applied ${result.applied.length} new migration(s):`);
  for (const f of result.applied) console.log(`  + ${f}`);
}
