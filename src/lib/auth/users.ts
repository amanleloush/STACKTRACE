import { randomBytes } from 'node:crypto';
import type { Db } from '~/lib/db';

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  googleSub: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  role: Role;
  createdAt: number;
}

interface UserRow {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  picture_url: string | null;
  role: string;
  created_at: number;
}

function adminEmailSet(): Set<string> {
  const raw =
    import.meta.env.ADMIN_EMAILS ??
    (typeof process !== 'undefined' ? process.env.ADMIN_EMAILS : '') ??
    '';
  return new Set(
    String(raw)
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function hydrate(row: UserRow): User {
  return {
    id: row.id,
    googleSub: row.google_sub,
    email: row.email,
    name: row.name,
    pictureUrl: row.picture_url,
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: row.created_at,
  };
}

export async function getUserById(db: Db, id: string): Promise<User | null> {
  const row = await db.first<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  return row ? hydrate(row) : null;
}

/** Insert-or-update from a Google userinfo claim. Promotes to admin role
 * when the email matches ADMIN_EMAILS (plan §14h). Also ensures the
 * `subscriptions` row exists so downstream entitlement queries are simple. */
export async function upsertUserFromGoogle(
  db: Db,
  claims: { sub: string; email: string; name?: string; picture?: string },
): Promise<User> {
  const admins = adminEmailSet();
  const shouldBeAdmin = admins.has(claims.email.toLowerCase());
  const existing = await db.first<UserRow>(
    'SELECT * FROM users WHERE google_sub = ?',
    [claims.sub],
  );

  if (existing) {
    // Don't demote a manual admin — only promote.
    const targetRole = shouldBeAdmin ? 'admin' : existing.role;
    await db.run(
      'UPDATE users SET email = ?, name = ?, picture_url = ?, role = ? WHERE id = ?',
      [claims.email, claims.name ?? null, claims.picture ?? null, targetRole, existing.id],
    );
    await db.run(
      'INSERT OR IGNORE INTO subscriptions (user_id, tier, status) VALUES (?, ?, ?)',
      [existing.id, 'free', 'active'],
    );
    const refreshed = await getUserById(db, existing.id);
    if (!refreshed) throw new Error('user disappeared mid-upsert');
    return refreshed;
  }

  const id = 'usr_' + randomBytes(8).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  await db.run(
    `INSERT INTO users (id, google_sub, email, name, picture_url, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      claims.sub,
      claims.email,
      claims.name ?? null,
      claims.picture ?? null,
      shouldBeAdmin ? 'admin' : 'user',
      now,
    ],
  );
  await db.run(
    'INSERT INTO subscriptions (user_id, tier, status) VALUES (?, ?, ?)',
    [id, 'free', 'active'],
  );
  const fresh = await getUserById(db, id);
  if (!fresh) throw new Error('user disappeared after insert');
  return fresh;
}
