import { redisClient } from '../../infrastructure/redis/client.js';
import { logger } from '../../logger.js';

export function linkCacheKey(shortCode: string): string {
  return `url:${shortCode}`;
}

/**
 * Drops the cached redirect for a short code so updates, disables, and deletes
 * never keep serving stale data. Cache problems must not fail the write that
 * already succeeded in PostgreSQL, so failures are logged and swallowed.
 */
export async function invalidateLinkCache(shortCode: string): Promise<void> {
  try {
    const client = await redisClient();
    await client.del(linkCacheKey(shortCode));
  } catch (error: unknown) {
    logger.error({ err: error, shortCode }, 'Unable to invalidate link cache');
  }
}
