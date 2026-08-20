import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { config as loadEnvironment } from 'dotenv';
import { z } from 'zod';

import { MAX_SHARD_COUNT, shardRange, type ShardRange } from '@url-shortener/shared';

loadEnvironment({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  POSTGRES_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(3600),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),
  AUTHENTICATED_CREATE_RATE_LIMIT: z.coerce.number().int().min(1).default(20),
  ANONYMOUS_CREATE_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  ANONYMOUS_CREATE_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),
  BULK_CREATE_RATE_LIMIT: z.coerce.number().int().min(1).default(5),
  LOGIN_FAILURE_RATE_LIMIT: z.coerce.number().int().min(1).default(5),
  LINK_PASSWORD_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().min(1),
  KAFKA_GROUP_ID: z.string().min(1),
  /** Only required for managed Kafka (e.g. Aiven). Enables TLS + SASL/PLAIN. */
  KAFKA_USERNAME: z
    .string()
    .transform((value) => (value.trim() === '' ? undefined : value))
    .optional(),
  KAFKA_PASSWORD: z
    .string()
    .transform((value) => (value.trim() === '' ? undefined : value))
    .optional(),
  MONGODB_URI: z
    .string()
    .url()
    .refine(
      (uri) => new URL(uri).pathname.replace('/', '').length > 0,
      'must include a database name'
    ),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^\d+(ms|s|m|h|d|w|y)$/)
    .default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  LINK_UNLOCK_SECRET: z.string().min(32),
  LINK_UNLOCK_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  BULK_MAX_URLS: z.coerce.number().int().min(1).max(100).default(20),
  ANONYMOUS_LINK_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(2),
  BASE62_ALPHABET: z
    .string()
    .regex(/^[0-9A-Za-z]{62}$/)
    .refine((alphabet) => new Set(alphabet).size === 62, 'must contain each Base62 character once'),
  /** How many id-generating instances the short-code space is divided between. */
  SHARD_COUNT: z.coerce.number().int().min(1).max(MAX_SHARD_COUNT).default(5),
  /** Which of those shards this instance owns. Must be unique per instance. */
  SHARD_ID: z.coerce.number().int().min(1).default(1)
})
  .refine((env) => env.SHARD_ID <= env.SHARD_COUNT, 'SHARD_ID must not be greater than SHARD_COUNT')
  .refine(
    (env) => Boolean(env.KAFKA_USERNAME) === Boolean(env.KAFKA_PASSWORD),
    'KAFKA_USERNAME and KAFKA_PASSWORD must both be set or both be omitted'
  );

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid API environment: ${parsed.error.issues.map((issue) => issue.message).join(', ')}`
  );
}

const environment = parsed.data;

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Route-level rate limits. Every limit is a fixed window counted in Redis, and
 * every key expires after `windowSeconds`.
 */
export const rateLimits = {
  /** Authenticated link creation, counted per user. */
  authenticatedCreate: {
    name: 'create',
    limit: environment.AUTHENTICATED_CREATE_RATE_LIMIT,
    windowSeconds: environment.RATE_LIMIT_WINDOW_SECONDS
  },
  /** Anonymous link creation, counted per client IP. */
  anonymousCreate: {
    name: 'create:anon',
    limit: environment.ANONYMOUS_CREATE_RATE_LIMIT,
    windowSeconds: environment.ANONYMOUS_CREATE_RATE_LIMIT_WINDOW_SECONDS
  },
  /** Bulk link creation, counted per client IP. */
  bulkCreate: {
    name: 'bulk',
    limit: environment.BULK_CREATE_RATE_LIMIT,
    windowSeconds: environment.RATE_LIMIT_WINDOW_SECONDS
  },
  /** Failed logins only, counted per client IP. */
  loginFailure: {
    name: 'login',
    limit: environment.LOGIN_FAILURE_RATE_LIMIT,
    windowSeconds: environment.RATE_LIMIT_WINDOW_SECONDS
  },
  /** Link password attempts, counted per client IP and short code. */
  linkPassword: {
    name: 'password',
    limit: environment.LINK_PASSWORD_RATE_LIMIT,
    windowSeconds: environment.RATE_LIMIT_WINDOW_SECONDS
  }
} satisfies Record<string, RateLimitRule>;

/**
 * The block of ids this instance may issue. Ranges are contiguous and disjoint,
 * so instances never coordinate with each other to allocate an id.
 */
export const shard: ShardRange = shardRange(environment.SHARD_ID, environment.SHARD_COUNT);

export const apiConfig = {
  ...environment,
  kafkaBrokers: environment.KAFKA_BROKERS.split(',').map((broker) => broker.trim())
};
