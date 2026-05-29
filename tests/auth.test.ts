import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDevDb } from '~/lib/db.dev';
import { runMigrations } from '~/lib/migrate';
import {
  createSession,
  validateSession,
  invalidateSession,
  generateSessionToken,
} from '~/lib/auth/session';
import { upsertUserFromGoogle } from '~/lib/auth/users';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS = path.join(REPO, 'migrations');

async function seed() {
  const db = makeDevDb(':memory:');
  await runMigrations(db, MIGRATIONS);
  const user = await upsertUserFromGoogle(db, {
    sub: 'g-sub-1',
    email: 'test@example.com',
    name: 'Test User',
  });
  return { db, user };
}

describe('session manager', () => {
  it('creates a session, then validates it back to the same user', async () => {
    const { db, user } = await seed();
    const token = generateSessionToken();
    await createSession(db, token, user.id);
    const state = await validateSession(db, token);
    expect(state.user?.id).toBe(user.id);
    expect(state.user?.email).toBe('test@example.com');
    expect(state.session).not.toBeNull();
    expect(state.session!.userId).toBe(user.id);
  });

  it('returns null for an unknown token', async () => {
    const { db } = await seed();
    const state = await validateSession(db, generateSessionToken());
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('invalidateSession removes the row — subsequent validate is null', async () => {
    const { db, user } = await seed();
    const token = generateSessionToken();
    await createSession(db, token, user.id);
    await invalidateSession(db, token);
    const state = await validateSession(db, token);
    expect(state.user).toBeNull();
  });

  it('validate of an empty/undefined token short-circuits to null', async () => {
    const { db } = await seed();
    expect(await validateSession(db, '')).toEqual({ user: null, session: null });
    expect(await validateSession(db, null)).toEqual({ user: null, session: null });
    expect(await validateSession(db, undefined)).toEqual({ user: null, session: null });
  });
});

describe('upsertUserFromGoogle — admin promotion', () => {
  it('promotes role=admin when email is in ADMIN_EMAILS', async () => {
    const previous = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = 'boss@example.com, helper@example.com';
    try {
      const db = makeDevDb(':memory:');
      await runMigrations(db, MIGRATIONS);
      const u1 = await upsertUserFromGoogle(db, { sub: 's1', email: 'boss@example.com' });
      const u2 = await upsertUserFromGoogle(db, { sub: 's2', email: 'random@example.com' });
      expect(u1.role).toBe('admin');
      expect(u2.role).toBe('user');
    } finally {
      if (previous == null) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = previous;
    }
  });

  it('upsert returns the same user row for repeated sign-ins', async () => {
    const db = makeDevDb(':memory:');
    await runMigrations(db, MIGRATIONS);
    const u1 = await upsertUserFromGoogle(db, { sub: 'g-1', email: 'a@x.com', name: 'First' });
    const u2 = await upsertUserFromGoogle(db, { sub: 'g-1', email: 'a@x.com', name: 'Renamed' });
    expect(u2.id).toBe(u1.id);
    expect(u2.name).toBe('Renamed');
  });

  it('upsert seeds a default subscriptions row at tier=free', async () => {
    const db = makeDevDb(':memory:');
    await runMigrations(db, MIGRATIONS);
    const u = await upsertUserFromGoogle(db, { sub: 'g-1', email: 'a@x.com' });
    const sub = await db.first<{ tier: string; status: string }>(
      'SELECT tier, status FROM subscriptions WHERE user_id = ?',
      [u.id],
    );
    expect(sub?.tier).toBe('free');
    expect(sub?.status).toBe('active');
  });
});
