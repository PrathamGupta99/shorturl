import type { Request } from 'express';

import type { RateLimitRule } from '../../config.js';
import { HttpError } from '../../errors.js';
import { redisClient } from './client.js';

export function clientIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? 'unknown';
}

function key(rule: RateLimitRule, identifier: string): string {
  return `ratelimit:${rule.name}:${identifier}`;
}

async function currentCount(rule: RateLimitRule, identifier: string): Promise<number> {
  const client = await redisClient();
  const value = await client.get(key(rule, identifier));
  return value === null ? 0 : Number(value);
}

function reject(rule: RateLimitRule): never {
  throw new HttpError(
    429,
    'RATE_LIMITED',
    `Rate limit exceeded: at most ${rule.limit} requests per ${rule.windowSeconds} seconds`
  );
}

/**
 * Counts one request against a fixed Redis window and rejects with 429 once the
 * limit is passed. The counter key is given a TTL on first use, so keys expire
 * on their own without any cleanup job.
 */
export async function consumeRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  const client = await redisClient();
  const counterKey = key(rule, identifier);
  const count = await client.incr(counterKey);

  if (count === 1) {
    await client.expire(counterKey, rule.windowSeconds);
  }

  if (count > rule.limit) {
    reject(rule);
  }
}

/**
 * Rejects when a limit has already been reached, without counting this request.
 * Used for limits driven by failures, such as login attempts.
 */
export async function assertWithinRateLimit(
  rule: RateLimitRule,
  identifier: string
): Promise<void> {
  if ((await currentCount(rule, identifier)) >= rule.limit) {
    reject(rule);
  }
}

/**
 * Counts a failed attempt against a limit without rejecting the current
 * request, which already failed for its own reason.
 */
export async function recordRateLimitFailure(
  rule: RateLimitRule,
  identifier: string
): Promise<void> {
  const client = await redisClient();
  const counterKey = key(rule, identifier);
  const count = await client.incr(counterKey);

  if (count === 1) {
    await client.expire(counterKey, rule.windowSeconds);
  }
}
