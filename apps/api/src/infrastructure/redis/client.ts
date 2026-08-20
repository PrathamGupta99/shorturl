import { createClient, type RedisClientType } from 'redis';

import { apiConfig } from '../../config.js';
import { logger } from '../../logger.js';

const client: RedisClientType = createClient({ url: apiConfig.REDIS_URL });
let connection: Promise<typeof client> | undefined;

client.on('error', (error: unknown) => {
  logger.error({ err: error }, 'Redis client error');
});

export async function redisClient(): Promise<RedisClientType> {
  if (!client.isOpen) {
    connection ??= client.connect().finally(() => {
      connection = undefined;
    });
    await connection;
  }

  return client;
}
