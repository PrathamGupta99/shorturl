import { apiConfig } from '../../config.js';
import { HttpError } from '../../errors.js';
import { redisClient } from '../../infrastructure/redis/client.js';
import { verifyPassword } from '../auth/passwords.js';
import { linkCacheKey } from '../links/cache.js';
import { findLinkByShortCode, type LinkRecord } from '../links/repository.js';
import { ensureRedirectable } from '../links/service.js';
import { createUnlockToken } from './unlock-tokens.js';

interface CachedLink {
  id: string;
  ownerId: string | null;
  longUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  requiresPassword: boolean;
}

export interface ResolvedLink {
  id: string;
  ownerId: string | null;
  shortCode: string;
  longUrl: string;
  requiresPassword: boolean;
  cacheHit: boolean;
}

export interface UnlockedLink {
  shortCode: string;
  unlockToken: string;
  expiresInSeconds: number;
}

export async function resolveShortCode(shortCode: string): Promise<ResolvedLink> {
  const cached = await readCachedLink(shortCode);

  if (cached) {
    ensureCachedLinkIsRedirectable(cached);
    return {
      id: cached.id,
      ownerId: cached.ownerId ?? null,
      shortCode,
      longUrl: cached.longUrl,
      requiresPassword: cached.requiresPassword,
      cacheHit: true
    };
  }

  const link = await findLinkByShortCode(shortCode);
  if (!link) {
    throw new HttpError(404, 'LINK_NOT_FOUND', 'Short link was not found');
  }

  ensureRedirectable(link);
  await cacheLink(link);
  return {
    id: link.id,
    ownerId: link.userId,
    shortCode: link.shortCode,
    longUrl: link.longUrl,
    requiresPassword: link.passwordHash !== null,
    cacheHit: false
  };
}

/**
 * Validates a submitted link password and, when it matches, issues the
 * short-lived token that lets the next redirect through.
 *
 * Unknown codes, unprotected codes, and wrong passwords all fail identically so
 * the endpoint never reveals which short codes exist.
 */
export async function unlockShortCode(shortCode: string, password: string): Promise<UnlockedLink> {
  const link = await findLinkByShortCode(shortCode);
  const isValid = link?.passwordHash ? await verifyPassword(password, link.passwordHash) : false;

  if (!link || !isValid) {
    throw new HttpError(401, 'INVALID_LINK_PASSWORD', 'That password is not correct');
  }

  ensureRedirectable(link);

  return {
    shortCode: link.shortCode,
    unlockToken: createUnlockToken(link.shortCode, link.id),
    expiresInSeconds: apiConfig.LINK_UNLOCK_TTL_SECONDS
  };
}

async function readCachedLink(shortCode: string): Promise<CachedLink | null> {
  const client = await redisClient();
  const cached = await client.get(linkCacheKey(shortCode));

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as CachedLink;
  } catch {
    await client.del(linkCacheKey(shortCode));
    return null;
  }
}

function ensureCachedLinkIsRedirectable(link: CachedLink): void {
  const expiresAt = link.expiresAt === null ? null : new Date(link.expiresAt);
  if (!link.isActive || (expiresAt !== null && expiresAt <= new Date())) {
    throw new HttpError(410, 'LINK_UNAVAILABLE', 'This short link is disabled or expired');
  }
}

async function cacheLink(link: LinkRecord): Promise<void> {
  const client = await redisClient();
  const expirySeconds = cacheExpiry(link.expiresAt);
  const cached: CachedLink = {
    id: link.id,
    ownerId: link.userId,
    longUrl: link.longUrl,
    isActive: link.isActive,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    requiresPassword: link.passwordHash !== null
  };

  await client.set(linkCacheKey(link.shortCode), JSON.stringify(cached), { EX: expirySeconds });
}

function cacheExpiry(expiresAt: Date | null): number {
  if (!expiresAt) {
    return apiConfig.REDIS_CACHE_TTL_SECONDS;
  }

  const secondsUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  return Math.max(1, Math.min(apiConfig.REDIS_CACHE_TTL_SECONDS, secondsUntilExpiry));
}
