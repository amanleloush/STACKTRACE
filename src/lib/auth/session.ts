import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '~/lib/db';

const SESSION_DAYS = 30;
const SESSION_TTL_SEC = SESSION_DAYS * 24 * 60 * 60;

export interface Session {
  id: string;          // SHA-256 hash of the cookie token, stored in DB
  userId: string;
  expiresAt: number;   // unix seconds
  createdAt: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  role: 'user' | 'admin';
}

export interface AuthState {
  user: SessionUser | null;
  session: Session | null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generate a 256-bit random session token. Returned to the caller in plain
 * form for the cookie; only the hash hits the DB. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(db: Db, token: string, userId: string): Promise<Session> {
  const id = hashToken(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SEC;
  await db.run(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [id, userId, expiresAt, now],
  );
  return { id, userId, expiresAt, createdAt: now };
}

interface SessionJoinRow {
  s_id: string;
  s_user_id: string;
  s_expires_at: number;
  s_created_at: number;
  u_id: string;
  u_email: string;
  u_name: string | null;
  u_picture_url: string | null;
  u_role: string;
}

export async function validateSession(db: Db, token: string | undefined | null): Promise<AuthState> {
  if (!token) return { user: null, session: null };
  const id = hashToken(token);
  const row = await db.first<SessionJoinRow>(
    `SELECT
       s.id AS s_id,
       s.user_id AS s_user_id,
       s.expires_at AS s_expires_at,
       s.created_at AS s_created_at,
       u.id AS u_id,
       u.email AS u_email,
       u.name AS u_name,
       u.picture_url AS u_picture_url,
       u.role AS u_role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [id],
  );
  if (!row) return { user: null, session: null };
  const now = Math.floor(Date.now() / 1000);
  if (row.s_expires_at < now) {
    await db.run('DELETE FROM sessions WHERE id = ?', [id]);
    return { user: null, session: null };
  }
  return {
    user: {
      id: row.u_id,
      email: row.u_email,
      name: row.u_name,
      picture: row.u_picture_url,
      role: row.u_role === 'admin' ? 'admin' : 'user',
    },
    session: {
      id: row.s_id,
      userId: row.s_user_id,
      expiresAt: row.s_expires_at,
      createdAt: row.s_created_at,
    },
  };
}

export async function invalidateSession(db: Db, token: string | undefined | null): Promise<void> {
  if (!token) return;
  await db.run('DELETE FROM sessions WHERE id = ?', [hashToken(token)]);
}
