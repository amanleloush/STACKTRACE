import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '~/lib/db';
import type { Tier } from '~/lib/billing/subscriptions';
import { getEntitlement } from '~/lib/billing/entitlement';

/* ---------------------------------------------------------------- */
/* Types                                                            */
/* ---------------------------------------------------------------- */

export interface MintResult {
  /** Public id, also the row PK. Shown in the key listing. */
  publicId: string;
  /** Full bearer token: `sk_<env>_<publicId>.<secret>`. Returned ONCE
   *  at mint time; not retrievable thereafter (we only store the hash). */
  full: string;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
  dailyQuota: number;
  dailyUsed: number;
  quotaResetAt: number;
}

export interface ApiAuthContext {
  keyId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'user' | 'admin';
  };
  tier: Tier;
  quota: { quota: number; used: number; resetAt: number };
}

/* ---------------------------------------------------------------- */
/* Helpers                                                          */
/* ---------------------------------------------------------------- */

const ENV_PREFIX = (): 'live' | 'test' =>
  (import.meta.env.PROD ? 'live' : 'test') as 'live' | 'test';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function midnightFromNow(): number {
  // 24 hours from now — simple sliding window, matches the schema's
  // quota_reset_at semantic.
  return nowSec() + 86400;
}

/* ---------------------------------------------------------------- */
/* Mint / Revoke / List                                             */
/* ---------------------------------------------------------------- */

export async function mintApiKey(
  db: Db,
  userId: string,
  name: string,
  dailyQuota = 1000,
): Promise<MintResult> {
  const publicId = 'ak_' + randomBytes(8).toString('hex');
  const secret = randomBytes(24).toString('hex');
  const full = `sk_${ENV_PREFIX()}_${publicId}.${secret}`;
  const secretHash = sha256(secret);
  const created = nowSec();
  await db.run(
    `INSERT INTO api_keys (id, user_id, secret_hash, name, daily_quota, daily_used, quota_reset_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [publicId, userId, secretHash, name, dailyQuota, 0, midnightFromNow(), created],
  );
  return { publicId, full };
}

export async function revokeApiKey(db: Db, userId: string, keyId: string): Promise<boolean> {
  const r = await db.run(
    'UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
    [nowSec(), keyId, userId],
  );
  return r.changes > 0;
}

export async function listApiKeys(db: Db, userId: string): Promise<ApiKeySummary[]> {
  const rows = await db.query<{
    id: string;
    name: string;
    created_at: number;
    last_used_at: number | null;
    revoked_at: number | null;
    daily_quota: number;
    daily_used: number;
    quota_reset_at: number;
  }>(
    `SELECT id, name, created_at, last_used_at, revoked_at, daily_quota, daily_used, quota_reset_at
       FROM api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    revokedAt: r.revoked_at,
    dailyQuota: r.daily_quota,
    dailyUsed: r.daily_used,
    quotaResetAt: r.quota_reset_at,
  }));
}

/* ---------------------------------------------------------------- */
/* Verify (per /api/v1/* request)                                    */
/* ---------------------------------------------------------------- */

/**
 * Parse the Authorization header, look up the key, and return the
 * caller's auth context. Returns null on every failure path (no key,
 * wrong format, hash mismatch, revoked, user gone). Callers should
 * 401 on null.
 *
 * Also: updates last_used_at + ticks daily_used (resetting if past the
 * window). If the resulting daily_used exceeds daily_quota, returns
 * a quota-exceeded signal so the caller can 429.
 */
export async function verifyApiKey(
  db: Db,
  authHeader: string | null | undefined,
): Promise<{ ctx: ApiAuthContext } | { error: 'unauth' | 'quota_exceeded' }> {
  if (!authHeader) return { error: 'unauth' };
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return { error: 'unauth' };

  // sk_<env>_<publicId>.<secret>
  const token = m[1]!.trim();
  const dot = token.lastIndexOf('.');
  if (dot < 0) return { error: 'unauth' };
  const prefixAndId = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  const idMatch = prefixAndId.match(/^sk_(?:test|live)_(ak_[a-f0-9]+)$/);
  if (!idMatch) return { error: 'unauth' };
  const publicId = idMatch[1]!;
  const secretHash = sha256(secret);

  const row = await db.first<{
    id: string;
    user_id: string;
    secret_hash: string;
    revoked_at: number | null;
    daily_quota: number;
    daily_used: number;
    quota_reset_at: number;
    u_id: string;
    u_email: string;
    u_name: string | null;
    u_role: string;
  }>(
    `SELECT
       k.id AS id, k.user_id AS user_id, k.secret_hash AS secret_hash,
       k.revoked_at AS revoked_at,
       k.daily_quota AS daily_quota, k.daily_used AS daily_used, k.quota_reset_at AS quota_reset_at,
       u.id AS u_id, u.email AS u_email, u.name AS u_name, u.role AS u_role
     FROM api_keys k
     JOIN users u ON u.id = k.user_id
     WHERE k.id = ?`,
    [publicId],
  );
  if (!row) return { error: 'unauth' };
  if (row.revoked_at != null) return { error: 'unauth' };
  if (row.secret_hash !== secretHash) return { error: 'unauth' };

  // Quota window reset (if applicable) + tick.
  const now = nowSec();
  let used = row.daily_used;
  let resetAt = row.quota_reset_at;
  if (now >= resetAt) {
    used = 0;
    resetAt = midnightFromNow();
  }
  used += 1;

  if (used > row.daily_quota) {
    // Persist the attempt count anyway so abuse spikes show in audit.
    await db.run(
      'UPDATE api_keys SET daily_used = ?, quota_reset_at = ?, last_used_at = ? WHERE id = ?',
      [used, resetAt, now, publicId],
    );
    return { error: 'quota_exceeded' };
  }

  await db.run(
    'UPDATE api_keys SET daily_used = ?, quota_reset_at = ?, last_used_at = ? WHERE id = ?',
    [used, resetAt, now, publicId],
  );

  const tier = await getEntitlement(db, row.user_id);
  const ctx: ApiAuthContext = {
    keyId: row.id,
    userId: row.user_id,
    user: {
      id: row.u_id,
      email: row.u_email,
      name: row.u_name,
      role: row.u_role === 'admin' ? 'admin' : 'user',
    },
    tier,
    quota: { quota: row.daily_quota, used, resetAt },
  };
  return { ctx };
}

/** Stable, non-reversible identifier we can splat into response
 *  payloads for traceability without exposing the user id. */
export function licenseStamp(userId: string): string {
  return sha256(userId).slice(0, 16);
}
