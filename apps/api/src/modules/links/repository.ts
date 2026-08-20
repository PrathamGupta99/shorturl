import type { PoolClient } from 'pg';

import { shardSequenceName } from '@url-shortener/shared';

import { shard } from '../../config.js';
import { pool } from '../../db/client.js';
import { isUniqueViolation } from '../../db/errors.js';

export interface LinkRecord {
  id: string;
  userId: string | null;
  longUrl: string;
  shortCode: string;
  title: string | null;
  isActive: boolean;
  isAnonymous: boolean;
  expiresAt: Date | null;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkPatch {
  longUrl?: string;
  title?: string | null;
  isActive?: boolean;
  expiresAt?: Date | null;
}

interface LinkRow {
  id: string;
  user_id: string | null;
  long_url: string;
  short_code: string | null;
  title: string | null;
  is_active: boolean;
  is_anonymous: boolean;
  expires_at: Date | null;
  password_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

const LINK_COLUMNS = `id, user_id, long_url, short_code, title, is_active, is_anonymous,
                      expires_at, password_hash, created_at, updated_at`;

function toLinkRecord(row: LinkRow): LinkRecord {
  if (!row.short_code) {
    throw new Error('Link is missing its short code');
  }

  return {
    id: row.id,
    userId: row.user_id,
    longUrl: row.long_url,
    shortCode: row.short_code,
    title: row.title,
    isActive: row.is_active,
    isAnonymous: row.is_anonymous,
    expiresAt: row.expires_at,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface NewLink {
  longUrl: string;
  userId: string | null;
  isAnonymous: boolean;
  expiresAt: Date | null;
  passwordHash: string | null;
  title: string | null;
}

/** PostgreSQL `undefined_table`, raised when the shard's sequence is missing. */
const UNDEFINED_TABLE = '42P01';
/** PostgreSQL `sequence_generator_limit_exceeded`, raised when a shard is full. */
const SEQUENCE_EXHAUSTED = '2200H';

/**
 * Allocates the id from this instance's own shard sequence, inside the INSERT so
 * it costs no extra round trip. Because each shard's sequence is bounded to its
 * own block of the short-code space, two instances can run concurrently without
 * ever agreeing on anything.
 */
export async function createLink(client: PoolClient, link: NewLink): Promise<string> {
  const sequence = shardSequenceName(shard.shardId);

  try {
    const result = await client.query<{ id: string }>(
      `INSERT INTO links (id, user_id, long_url, is_anonymous, expires_at, password_hash, title)
       VALUES (nextval($1::regclass), $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [sequence, link.userId, link.longUrl, link.isAnonymous, link.expiresAt, link.passwordHash, link.title]
    );
    return result.rows[0]!.id;
  } catch (error: unknown) {
    throw describeAllocationFailure(error, sequence);
  }
}

function describeAllocationFailure(error: unknown, sequence: string): unknown {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

  if (code === UNDEFINED_TABLE) {
    return new Error(
      `Shard sequence ${sequence} does not exist. Run \`npm run db:migrate\` with this SHARD_COUNT before starting the API.`
    );
  }

  if (code === SEQUENCE_EXHAUSTED) {
    return new Error(
      `Shard ${String(shard.shardId)} has issued every id in its range (${shard.start.toString()}-${shard.end.toString()}). Re-shard before creating more links.`
    );
  }

  return error;
}

/**
 * Attempts to take a short code for a link, returning `null` when the code is
 * already taken by another link. A savepoint keeps a rejected attempt from
 * poisoning the surrounding transaction, so the caller can try another code.
 */
export async function claimShortCode(
  client: PoolClient,
  id: string,
  shortCode: string
): Promise<LinkRecord | null> {
  await client.query('SAVEPOINT claim_short_code');

  try {
    const result = await client.query<LinkRow>(
      `UPDATE links
       SET short_code = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING ${LINK_COLUMNS}`,
      [id, shortCode]
    );
    await client.query('RELEASE SAVEPOINT claim_short_code');
    return toLinkRecord(result.rows[0]!);
  } catch (error: unknown) {
    await client.query('ROLLBACK TO SAVEPOINT claim_short_code');

    if (isUniqueViolation(error)) {
      return null;
    }

    throw error;
  }
}

export async function findLinkByShortCode(shortCode: string): Promise<LinkRecord | null> {
  const result = await pool.query<LinkRow>(
    `SELECT ${LINK_COLUMNS}
     FROM links
     WHERE short_code = $1`,
    [shortCode]
  );
  return result.rowCount === 0 ? null : toLinkRecord(result.rows[0]!);
}

/**
 * Anonymous links are never owned by a user, so they can never be reached
 * through the authenticated management endpoints.
 */
export async function findOwnedLink(shortCode: string, userId: string): Promise<LinkRecord | null> {
  const result = await pool.query<LinkRow>(
    `SELECT ${LINK_COLUMNS}
     FROM links
     WHERE short_code = $1 AND user_id = $2 AND is_anonymous = FALSE`,
    [shortCode, userId]
  );
  return result.rowCount === 0 ? null : toLinkRecord(result.rows[0]!);
}

export async function countLinksForUser(userId: string): Promise<number> {
  const result = await pool.query<{ total: string }>(
    'SELECT COUNT(*)::text AS total FROM links WHERE user_id = $1 AND is_anonymous = FALSE',
    [userId]
  );
  return Number(result.rows[0]!.total);
}

/** Active means reachable right now: enabled, and not past its expiry. */
export async function countActiveLinksForUser(userId: string): Promise<number> {
  const result = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM links
     WHERE user_id = $1
       AND is_anonymous = FALSE
       AND is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );
  return Number(result.rows[0]!.total);
}

export interface DailyLinkCount {
  date: string;
  linksCreated: number;
}

/**
 * Grouped in UTC so the buckets line up with the click time series, which Mongo
 * groups in UTC as well.
 */
export async function countLinksCreatedPerDay(
  userId: string,
  since: Date
): Promise<DailyLinkCount[]> {
  const result = await pool.query<{ date: string; links_created: string }>(
    `SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
            COUNT(*)::text AS links_created
     FROM links
     WHERE user_id = $1 AND is_anonymous = FALSE AND created_at >= $2
     GROUP BY 1
     ORDER BY 1`,
    [userId, since]
  );

  return result.rows.map((row) => ({
    date: row.date,
    linksCreated: Number(row.links_created)
  }));
}

export async function listLinksForUser(
  userId: string,
  limit: number,
  offset: number
): Promise<LinkRecord[]> {
  const result = await pool.query<LinkRow>(
    `SELECT ${LINK_COLUMNS}
     FROM links
     WHERE user_id = $1 AND is_anonymous = FALSE
     ORDER BY created_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows.map(toLinkRecord);
}

export async function updateOwnedLink(
  shortCode: string,
  userId: string,
  patch: LinkPatch
): Promise<LinkRecord | null> {
  const assignments: string[] = [];
  const values: unknown[] = [shortCode, userId];

  const columns: Array<[keyof LinkPatch, string]> = [
    ['longUrl', 'long_url'],
    ['title', 'title'],
    ['isActive', 'is_active'],
    ['expiresAt', 'expires_at']
  ];

  for (const [key, column] of columns) {
    if (key in patch) {
      values.push(patch[key]);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  if (assignments.length === 0) {
    return findOwnedLink(shortCode, userId);
  }

  const result = await pool.query<LinkRow>(
    `UPDATE links
     SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE short_code = $1 AND user_id = $2 AND is_anonymous = FALSE
     RETURNING ${LINK_COLUMNS}`,
    values
  );
  return result.rowCount === 0 ? null : toLinkRecord(result.rows[0]!);
}

export async function deleteOwnedLink(shortCode: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM links WHERE short_code = $1 AND user_id = $2 AND is_anonymous = FALSE',
    [shortCode, userId]
  );
  return result.rowCount === 1;
}
