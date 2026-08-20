import { Kafka } from 'kafkajs';

import { buildKafkaConnectionConfig, CLICK_EVENTS_TOPIC } from '@url-shortener/shared';

import { handleClickEventMessage } from './analytics/handler.js';
import { ensureIndexes } from './analytics/repository.js';
import { workerConfig } from './config.js';
import { kafkaLogCreator } from './infrastructure/kafka/logging.js';
import { ensureClickEventsTopic } from './infrastructure/kafka/topics.js';
import { closeMongo } from './infrastructure/mongo/client.js';
import { logger } from './logger.js';

const kafka = new Kafka({
  ...buildKafkaConnectionConfig({
    brokers: workerConfig.kafkaBrokers,
    clientId: `${workerConfig.KAFKA_CLIENT_ID}-analytics-worker`,
    username: workerConfig.KAFKA_USERNAME,
    password: workerConfig.KAFKA_PASSWORD
  }),
  logCreator: kafkaLogCreator(logger)
});

const consumer = kafka.consumer({ groupId: workerConfig.KAFKA_GROUP_ID });

async function start(): Promise<void> {
  await ensureIndexes();
  // The worker may start before the API has ever published, so it creates the
  // topic itself rather than crashing on an unknown topic.
  await ensureClickEventsTopic(kafka);
  await consumer.connect();
  await consumer.subscribe({ topic: CLICK_EVENTS_TOPIC, fromBeginning: true });

  logger.info(
    { groupId: workerConfig.KAFKA_GROUP_ID, topic: CLICK_EVENTS_TOPIC },
    'Analytics worker consuming click events'
  );

  // kafkajs commits the offset only after eachMessage resolves, so a thrown
  // storage error makes Kafka redeliver the message instead of losing it.
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await handleClickEventMessage({
        topic,
        partition,
        offset: message.offset,
        value: message.value
      });
    }
  });
}

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Shutting down analytics worker');

  void (async () => {
    await consumer.disconnect();
    await closeMongo();
  })().catch((error: unknown) => {
    logger.error({ err: error }, 'Unclean analytics worker shutdown');
    process.exitCode = 1;
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

void start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Unable to start analytics worker');
  process.exitCode = 1;
});
