import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDevDb } from '~/lib/db.dev';
import { runMigrations } from '~/lib/migrate';
import {
  canAccess,
  setOverride,
  clearOverride,
  isGated,
  getPreviewLength,
  type Entity,
} from '~/lib/billing/entitlement';
import type { SessionUser } from '~/lib/auth/session';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS = path.join(REPO, 'migrations');

async function freshDb() {
  const db = makeDevDb(':memory:');
  await runMigrations(db, MIGRATIONS);
  // Seed an admin so setOverride has a valid updated_by FK.
  await db.run(
    `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    ['admin-1', 'g-admin', 'admin@x.com', 'admin', 1],
  );
  return db;
}

function user(role: 'user' | 'admin', tier: 'free' | 'pro' = 'free'): SessionUser & { tier: typeof tier } {
  return {
    id: `usr-${role}-${tier}`,
    email: `${role}-${tier}@x.com`,
    name: null,
    picture: null,
    role,
    tier,
  } as SessionUser & { tier: typeof tier };
}

async function seedTier(db: Awaited<ReturnType<typeof freshDb>>, u: SessionUser, tier: 'free' | 'pro') {
  await db.run(
    `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    [u.id, 'g-' + u.id, u.email, u.role, 1],
  );
  await db.run(
    'INSERT INTO subscriptions (user_id, tier, status) VALUES (?, ?, ?)',
    [u.id, tier, 'active'],
  );
}

const note = (defaultPremium: boolean): Entity => ({
  kind: 'note',
  id: 'cap-pacelc-consistency',
  defaultPremium,
  defaultPreviewParagraphs: 4,
});

describe('canAccess — entitlement matrix', () => {
  it('anonymous user can read non-gated note', async () => {
    const db = await freshDb();
    const r = await canAccess(db, note(false), null);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('free-and-not-gated');
  });

  it('anonymous user is paywalled on gated note', async () => {
    const db = await freshDb();
    const r = await canAccess(db, note(true), null);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('paywalled');
  });

  it('admin sees everything regardless of gate state', async () => {
    const db = await freshDb();
    const adminUser = user('admin');
    await seedTier(db, adminUser, 'free');
    const r = await canAccess(db, note(true), adminUser);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('admin');
  });

  it('pro-tier user reads a gated note', async () => {
    const db = await freshDb();
    const u = user('user', 'pro');
    await seedTier(db, u, 'pro');
    const r = await canAccess(db, note(true), u);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('paid-tier');
  });

  it('free-tier user is paywalled even though they signed in', async () => {
    const db = await freshDb();
    const u = user('user', 'free');
    await seedTier(db, u, 'free');
    const r = await canAccess(db, note(true), u);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('paywalled');
  });
});

describe('overrides take precedence over frontmatter default', () => {
  it('override → gated even though frontmatter said default-free', async () => {
    const db = await freshDb();
    const target = note(false); // default free
    await setOverride(db, { kind: target.kind, id: target.id }, true, null, 'admin-1');
    expect(await isGated(db, target)).toBe(true);
    const r = await canAccess(db, target, null);
    expect(r.allowed).toBe(false);
  });

  it('override → free even though frontmatter said default-premium', async () => {
    const db = await freshDb();
    const target = note(true); // default premium
    await setOverride(db, { kind: target.kind, id: target.id }, false, null, 'admin-1');
    expect(await isGated(db, target)).toBe(false);
    const r = await canAccess(db, target, null);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('free-and-not-gated');
  });

  it('clearOverride restores the frontmatter default', async () => {
    const db = await freshDb();
    const target = note(true);
    await setOverride(db, { kind: target.kind, id: target.id }, false, null, 'admin-1');
    await clearOverride(db, { kind: target.kind, id: target.id });
    expect(await isGated(db, target)).toBe(true);
  });

  it('override preview_paragraphs wins over frontmatter default', async () => {
    const db = await freshDb();
    const target = note(true);
    expect(await getPreviewLength(db, target)).toBe(4);
    await setOverride(db, { kind: target.kind, id: target.id }, true, 2, 'admin-1');
    expect(await getPreviewLength(db, target)).toBe(2);
  });
});

describe('block-level entity reason flags correctly', () => {
  it('paywalled block reports block-paywalled (not paywalled)', async () => {
    const db = await freshDb();
    const blockEntity: Entity = {
      kind: 'block',
      id: 'cap-pacelc-consistency:proof-of-quorum',
      defaultPremium: true,
    };
    const r = await canAccess(db, blockEntity, null);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('block-paywalled');
  });
});
