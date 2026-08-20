import type { PoolClient } from 'pg';

import { pool } from '../../db/client.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  createdAt: Date;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

interface SessionUserRow extends UserRow {
  session_id: string;
  expires_at: Date;
  revoked_at: Date | null;
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

export function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export async function createUser(email: string, passwordHash: string): Promise<UserRecord> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, password_hash, created_at`,
    [email, passwordHash]
  );
  return toUserRecord(result.rows[0]!);
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRow>(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  return result.rowCount === 0 ? null : toUserRecord(result.rows[0]!);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRow>(
    'SELECT id, email, password_hash, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rowCount === 0 ? null : toUserRecord(result.rows[0]!);
}

export async function createSession(
  client: PoolClient,
  userId: string,
  refreshTokenHash: string,
  expiresAt: Date
): Promise<void> {
  await client.query(
    'INSERT INTO sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, refreshTokenHash, expiresAt]
  );
}

export async function findSessionUserByTokenHash(
  tokenHash: string
): Promise<(UserRecord & { sessionId: string }) | null> {
  const result = await pool.query<SessionUserRow>(
    `SELECT sessions.id AS session_id, sessions.expires_at, sessions.revoked_at,
            users.id, users.email, users.password_hash, users.created_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.refresh_token_hash = $1`,
    [tokenHash]
  );
  const row = result.rows[0];

  if (!row || row.revoked_at !== null || row.expires_at <= new Date()) {
    return null;
  }

  return { ...toUserRecord(row), sessionId: row.session_id };
}

export async function revokeSession(client: PoolClient, sessionId: string): Promise<boolean> {
  const result = await client.query(
    'UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL',
    [sessionId]
  );
  return result.rowCount === 1;
}

export async function revokeSessionByTokenHash(userId: string, tokenHash: string): Promise<void> {
  await pool.query(
    'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND refresh_token_hash = $2 AND revoked_at IS NULL',
    [userId, tokenHash]
  );
}
