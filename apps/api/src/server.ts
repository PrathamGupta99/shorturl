import { createApp } from './app.js';
import { apiConfig, shard } from './config.js';
import { closeMongo } from './infrastructure/mongo/client.js';
import { disconnectProducer } from './infrastructure/kafka/producer.js';
import { logger } from './logger.js';

const app = createApp();

const server = app.listen(apiConfig.PORT, () => {
  logger.info(
    {
      port: apiConfig.PORT,
      shardId: shard.shardId,
      shardCount: apiConfig.SHARD_COUNT,
      idRange: `${shard.start.toString()}-${shard.end.toString()}`
    },
    'API listening'
  );
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Shutting down API');

  server.close((error) => {
    if (error) {
      logger.error(error, 'Unable to close API server cleanly');
      process.exitCode = 1;
    }

    void (async () => {
      await disconnectProducer();
      await closeMongo();
    })().catch((closeError: unknown) => {
      logger.error({ err: closeError }, 'Unable to close API dependencies cleanly');
      process.exitCode = 1;
    });
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
