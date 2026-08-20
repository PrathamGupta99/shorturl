import { MongoClient, type Db } from 'mongodb';

import { apiConfig } from '../../config.js';
import { logger } from '../../logger.js';

const client = new MongoClient(apiConfig.MONGODB_URI);
let connection: Promise<Db> | undefined;

export async function mongoDatabase(): Promise<Db> {
  connection ??= client
    .connect()
    .then((connected) => {
      logger.info('API connected to MongoDB');
      return connected.db();
    })
    .catch((error: unknown) => {
      connection = undefined;
      throw error;
    });

  return connection;
}

export async function closeMongo(): Promise<void> {
  connection = undefined;
  await client.close();
}
