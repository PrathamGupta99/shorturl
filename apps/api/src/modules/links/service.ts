import type { PoolClient } from 'pg';

import { encodeFixedLengthBase62, SHORT_CODE_LENGTH } from '@url-shortener/shared';

import { apiConfig } from '../../config.js';
import { pool } from '../../db/client.js';
import { HttpError } from '../../errors.js';
import { hashPassword } from '../auth/passwords.js';
import { invalidateLinkCache } from './cache.js';
import {
  claimShortCode,
  countLinksForUser,
  createLink,
  deleteOwnedLink,
  findOwnedLink,
  listLinksForUser,
  updateOwnedLink,
  type LinkPatch,
  type LinkRecord,
  type NewLink
} from './repository.js';
import {
  bulkItemSchema,
  type BulkCreateLinksInput,
  type CreateLinkInput,
  type ListLinksQuery,
  type UpdateLinkInput
} from './schemas.js';

export interface PublicLink {
  id: string;
  shortCode: string;
  shortUrl: string;
  url: string;
  title: string | null;
  isActive: boolean;
  isAnonymous: boolean;
  requiresPassword: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedLinks {
  links: PublicLink[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BulkLinkResult {
  index: number;
  url: string;
  status: 'created' | 'failed';
  link?: PublicLink;
  error?: { code: string; message: string };
}

export interface BulkLinksSummary {
  requested: number;
  created: number;
  failed: number;
  results: BulkLinkResult[];
}

/**
 * Generated codes are `SHORT_CODE_LENGTH` characters wide, but a custom alias
 * may already have taken the code a new numeric ID maps to. Widening the code
 * by one character is deterministic and always produces a string no alias of
 * the original width can equal, so two extra attempts are plenty.
 */
const GENERATED_CODE_LENGTHS = [SHORT_CODE_LENGTH, SHORT_CODE_LENGTH + 1, SHORT_CODE_LENGTH + 2];

export async function createShortLink(
  input: CreateLinkInput,
  userId: string | null
): Promise<PublicLink> {
  const isAnonymous = userId === null;
  const newLink: NewLink = {
    longUrl: input.url,
    userId,
    isAnonymous,
    expiresAt: resolveExpiry(input.expiresAt ?? null, isAnonymous),
    passwordHash: input.password === undefined ? null : await hashPassword(input.password),
    title: input.title ?? null
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const link = await insertLinkWithShortCode(client, newLink, input.customAlias);
    await client.query('COMMIT');
    return toPublicLink(link);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Creates one link per valid URL, owned by `userId` when the batch was sent by a
 * signed-in user and anonymous otherwise. Each URL is validated on its own so a
 * single bad entry is reported against that entry instead of rejecting the
 * whole batch.
 */
export async function createBulkLinks(
  input: BulkCreateLinksInput,
  userId: string | null
): Promise<BulkLinksSummary> {
  const results: BulkLinkResult[] = [];

  for (const [index, url] of input.urls.entries()) {
    const parsed = bulkItemSchema.safeParse({ url });

    if (!parsed.success) {
      results.push({
        index,
        url,
        status: 'failed',
        error: {
          code: 'INVALID_URL',
          message: parsed.error.issues[0]?.message ?? 'URL is not valid'
        }
      });
      continue;
    }

    try {
      results.push({
        index,
        url,
        status: 'created',
        link: await createShortLink({ url: parsed.data.url }, userId)
      });
    } catch (error: unknown) {
      const httpError = error instanceof HttpError ? error : undefined;

      if (!httpError) {
        throw error;
      }

      results.push({
        index,
        url,
        status: 'failed',
        error: { code: httpError.code, message: httpError.message }
      });
    }
  }

  const created = results.filter((result) => result.status === 'created').length;
  return { requested: results.length, created, failed: results.length - created, results };
}

export async function listUserLinks(
  userId: string,
  query: ListLinksQuery
): Promise<PaginatedLinks> {
  const offset = (query.page - 1) * query.pageSize;
  const [total, links] = await Promise.all([
    countLinksForUser(userId),
    listLinksForUser(userId, query.pageSize, offset)
  ]);

  return {
    links: links.map(toPublicLink),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize))
  };
}

export async function getOwnedLink(shortCode: string, userId: string): Promise<LinkRecord> {
  const link = await findOwnedLink(shortCode, userId);

  if (!link) {
    throw new HttpError(404, 'LINK_NOT_FOUND', 'Short link was not found');
  }

  return link;
}

export async function updateLink(
  shortCode: string,
  userId: string,
  input: UpdateLinkInput
): Promise<PublicLink> {
  const patch: LinkPatch = {};

  if ('url' in input && input.url !== undefined) {
    patch.longUrl = input.url;
  }
  if ('title' in input) {
    patch.title = input.title ?? null;
  }
  if ('isActive' in input && input.isActive !== undefined) {
    patch.isActive = input.isActive;
  }
  if ('expiresAt' in input) {
    patch.expiresAt = input.expiresAt ?? null;
  }

  const link = await updateOwnedLink(shortCode, userId, patch);

  if (!link) {
    throw new HttpError(404, 'LINK_NOT_FOUND', 'Short link was not found');
  }

  await invalidateLinkCache(shortCode);
  return toPublicLink(link);
}

export async function disableLink(shortCode: string, userId: string): Promise<PublicLink> {
  return updateLink(shortCode, userId, { isActive: false });
}

export async function deleteLink(shortCode: string, userId: string): Promise<void> {
  const deleted = await deleteOwnedLink(shortCode, userId);

  if (!deleted) {
    throw new HttpError(404, 'LINK_NOT_FOUND', 'Short link was not found');
  }

  await invalidateLinkCache(shortCode);
}

export function toPublicLink(link: LinkRecord): PublicLink {
  return {
    id: link.id,
    shortCode: link.shortCode,
    shortUrl: shortUrlFor(link.shortCode),
    url: link.longUrl,
    title: link.title,
    isActive: link.isActive,
    isAnonymous: link.isAnonymous,
    requiresPassword: link.passwordHash !== null,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt
  };
}

export function shortUrlFor(shortCode: string): string {
  return new URL(shortCode, `${apiConfig.PUBLIC_BASE_URL}/`).toString();
}

export function ensureRedirectable(link: LinkRecord): void {
  if (!link.isActive || (link.expiresAt !== null && link.expiresAt <= new Date())) {
    throw new HttpError(410, 'LINK_UNAVAILABLE', 'This short link is disabled or expired');
  }
}

async function insertLinkWithShortCode(
  client: PoolClient,
  newLink: NewLink,
  customAlias: string | undefined
): Promise<LinkRecord> {
  const id = await createLink(client, newLink);

  if (customAlias !== undefined) {
    const link = await claimShortCode(client, id, customAlias);

    if (!link) {
      throw new HttpError(409, 'ALIAS_ALREADY_TAKEN', 'That custom alias is already in use');
    }

    return link;
  }

  for (const length of GENERATED_CODE_LENGTHS) {
    const link = await claimShortCode(
      client,
      id,
      encodeFixedLengthBase62(BigInt(id), apiConfig.BASE62_ALPHABET, length)
    );

    if (link) {
      return link;
    }
  }

  throw new HttpError(
    503,
    'SHORT_CODE_UNAVAILABLE',
    'Unable to allocate a short code, please retry'
  );
}

/**
 * Anonymous links always expire, and never later than the anonymous window,
 * whatever the caller asked for. Authenticated links only expire when the owner
 * chose an expiry.
 */
function resolveExpiry(requested: Date | null, isAnonymous: boolean): Date | null {
  if (!isAnonymous) {
    return requested;
  }

  const limit = anonymousExpiry();
  return requested !== null && requested < limit ? requested : limit;
}

function anonymousExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + apiConfig.ANONYMOUS_LINK_TTL_DAYS);
  return expiresAt;
}
