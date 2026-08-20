import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { config as loadEnvironment } from 'dotenv';
import { z } from 'zod';

import { ANALYTICS_CONSUMER_GROUP } from '@url-shortener/shared';

loadEnvironment({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    POSTGRES_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    KAFKA_BROKERS: z.string().min(1),
    KAFKA_CLIENT_ID: z.string().min(1),
    KAFKA_GROUP_ID: z.string().min(1).default(ANALYTICS_CONSUMER_GROUP),
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
      .refine((uri) => new URL(uri).pathname.replace('/', '').length > 0, 'must include a database name'),
    IP_HASH_SALT: z.string().min(16),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    BASE62_ALPHABET: z
      .string()
      .regex(/^[0-9A-Za-z]{62}$/)
      .refine((alphabet) => new Set(alphabet).size === 62, 'must contain each Base62 character once')
  })
  .refine(
    (env) => Boolean(env.KAFKA_USERNAME) === Boolean(env.KAFKA_PASSWORD),
    'KAFKA_USERNAME and KAFKA_PASSWORD must both be set or both be omitted'
  );

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid worker environment: ${parsed.error.issues.map((issue) => issue.message).join(', ')}`);
}

export const workerConfig = {
  ...parsed.data,
  kafkaBrokers: parsed.data.KAFKA_BROKERS.split(',').map((broker) => broker.trim())
};
