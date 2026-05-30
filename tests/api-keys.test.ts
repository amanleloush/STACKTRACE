import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDevDb } from '~/lib/db.dev';
import { runMigrations } from '~/lib/migrate';
import { mintApiKey, verifyApiKey, revokeApiKey, listApiKeys, licenseStamp } from '~/lib/api/keys';
import { applyEvent } from '~/lib/billing/subscriptions';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS = path.join(REPO, 'migrations');

async function seed(role: 'user' | 'admin' = 'user') {
  const db = makeDevDb(':memory:');
  await runMigrations(db, MIGRATIONS);
  await db.run(
    `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    ['u1', 'g-1', 'u@test.com', role, 1],
  );
  await db.run(
    `INSERT INTO subscriptions (user_id, tier, status) VALUES (?, ?, ?)`,
    ['u1', 'free', 'active'],
  );
  return db;
}

describe('mintApiKey', () => {
  it('returns a bearer token that round-trips through verify', async () => {
    const db = await seed();
    const { publicId, full } = await mintApiKey(db, 'u1', 'my key');
    expect(full).toMatch(/^sk_test_ak_[a-f0-9]+\.[a-f0-9]+$/);
    const v = await verifyApiKey(db, `Bearer ${full}`);
    expect('ctx' in v).toBe(true);
    if ('ctx' in v) {
      expect(v.ctx.userId).toBe('u1');
      expect(v.ctx.keyId).toBe(publicId);
      expect(v.ctx.user.email).toBe('u@test.com');
      expect(v.ctx.tier).toBe('free');
    }
  });

  it('only stores the hash, not the secret', async () => {
    const db = await seed();
    const { full } = await mintApiKey(db, 'u1', 'k');
    const secret = full.split('.')[1]!;
    const row = await db.first<{ secret_hash: string }>(
      'SELECT secret_hash FROM api_keys WHERE user_id = ?',
      ['u1'],
    );
    expect(row?.secret_hash).not.toBe(secret);
    expect(row?.secret_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('verifyApiKey', () => {
  it('returns error on missing Authorization header', async () => {
    const db = await seed();
    expect(await verifyApiKey(db, null)).toEqual({ error: 'unauth' });
    expect(await verifyApiKey(db, undefined)).toEqual({ error: 'unauth' });
    expect(await verifyApiKey(db, '')).toEqual({ error: 'unauth' });
  });

  it('returns error on malformed token', async () => {
    const db = await seed();
    expect(await verifyApiKey(db, 'Bearer not-a-key')).toEqual({ error: 'unauth' });
    expect(await verifyApiKey(db, 'Basic xxx')).toEqual({ error: 'unauth' });
  });

  it('returns error when the secret hash does not match', async () => {
    const db = await seed();
    const { publicId } = await mintApiKey(db, 'u1', 'k');
    const wrong = `Bearer sk_test_${publicId}.deadbeef`;
    expect(await verifyApiKey(db, wrong)).toEqual({ error: 'unauth' });
  });

  it('rejects a revoked key', async () => {
    const db = await seed();
    const { publicId, full } = await mintApiKey(db, 'u1', 'k');
    await revokeApiKey(db, 'u1', publicId);
    expect(await verifyApiKey(db, `Bearer ${full}`)).toEqual({ error: 'unauth' });
  });

  it('reports the user`s current tier (pro after activated)', async () => {
    const db = await seed();
    await applyEvent(db, 'u1', { type: 'subscription.activated', currentPeriodEnd: 9_000_000_000 });
    const { full } = await mintApiKey(db, 'u1', 'k');
    const v = await verifyApiKey(db, `Bearer ${full}`);
    if ('ctx' in v) expect(v.ctx.tier).toBe('pro');
    else throw new Error('expected ctx');
  });
});

describe('quota tick', () => {
  it('increments daily_used on every verify', async () => {
    const db = await seed();
    const { publicId, full } = await mintApiKey(db, 'u1', 'k', 5);
    await verifyApiKey(db, `Bearer ${full}`);
    await verifyApiKey(db, `Bearer ${full}`);
    const row = await db.first<{ daily_used: number }>(
      'SELECT daily_used FROM api_keys WHERE id = ?',
      [publicId],
    );
    expect(row?.daily_used).toBe(2);
  });

  it('returns quota_exceeded once daily_used > daily_quota', async () => {
    const db = await seed();
    const { full } = await mintApiKey(db, 'u1', 'k', 2);
    expect('ctx' in (await verifyApiKey(db, `Bearer ${full}`))).toBe(true);
    expect('ctx' in (await verifyApiKey(db, `Bearer ${full}`))).toBe(true);
    expect(await verifyApiKey(db, `Bearer ${full}`)).toEqual({ error: 'quota_exceeded' });
  });
});

describe('listApiKeys + revokeApiKey', () => {
  it('list returns every key for the user, scoped to that user', async () => {
    const db = await seed();
    await mintApiKey(db, 'u1', 'first');
    await mintApiKey(db, 'u1', 'second');
    // Seed another user with their own key — should not appear.
    await db.run(
      `INSERT INTO users (id, google_sub, email, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['u2', 'g-2', 'other@test.com', 'user', 1],
    );
    await mintApiKey(db, 'u2', 'someone-else');
    const keys = await listApiKeys(db, 'u1');
    const names = keys.map((k) => k.name).sort();
    expect(names).toEqual(['first', 'second']);
  });

  it('revoke only flips the row when owned by the user', async () => {
    const db = await seed();
    const { publicId } = await mintApiKey(db, 'u1', 'k');
    expect(await revokeApiKey(db, 'u1', publicId)).toBe(true);
    // Second revoke is a no-op (already revoked).
    expect(await revokeApiKey(db, 'u1', publicId)).toBe(false);
    // Revoking with the wrong user id does nothing.
    const { publicId: id2 } = await mintApiKey(db, 'u1', 'k2');
    expect(await revokeApiKey(db, 'OTHER', id2)).toBe(false);
  });
});

describe('licenseStamp', () => {
  it('is deterministic per user', () => {
    const a = licenseStamp('u1');
    const b = licenseStamp('u1');
    const c = licenseStamp('u2');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.length).toBe(16);
  });
});
