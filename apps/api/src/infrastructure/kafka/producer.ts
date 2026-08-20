import { Kafka, Partitioners, type Producer } from 'kafkajs';

import { buildKafkaConnectionConfig, CLICK_EVENTS_TOPIC, type ClickEvent } from '@url-shortener/shared';

import { apiConfig } from '../../config.js';
import { logger } from '../../logger.js';
import { kafkaLogCreator } from './logging.js';
import { ensureClickEventsTopic } from './topics.js';

const kafka = new Kafka({
  ...buildKafkaConnectionConfig({
    brokers: apiConfig.kafkaBrokers,
    clientId: apiConfig.KAFKA_CLIENT_ID,
    username: apiConfig.KAFKA_USERNAME,
    password: apiConfig.KAFKA_PASSWORD
  }),
  retry: { retries: 3, initialRetryTime: 100 },
  logCreator: kafkaLogCreator(logger)
});

const producer: Producer = kafka.producer({
  allowAutoTopicCreation: true,
  // Named explicitly so kafkajs does not warn about its v2 partitioner change.
  createPartitioner: Partitioners.DefaultPartitioner
});
let connection: Promise<void> | undefined;

async function connectProducer(): Promise<void> {
  connection ??= (async () => {
    await ensureClickEventsTopic(kafka);
    await producer.connect();
    logger.info({ topic: CLICK_EVENTS_TOPIC }, 'Kafka producer connected');
  })().catch((error: unknown) => {
    connection = undefined;
    throw error;
  });

  await connection;
}

/**
 * Publishes a click event. Failures are logged and swallowed so that analytics
 * never blocks or breaks a redirect.
 */
export function publishClickEvent(event: ClickEvent): void {
  void (async () => {
    await connectProducer();
    await producer.send({
      topic: CLICK_EVENTS_TOPIC,
      messages: [{ key: event.shortCode, value: JSON.stringify(event) }]
    });
  })().catch((error: unknown) => {
    logger.error(
      { err: error, eventId: event.eventId, shortCode: event.shortCode },
      'Unable to publish click event to Kafka'
    );
  });
}

export async function disconnectProducer(): Promise<void> {
  if (!connection) {
    return;
  }

  connection = undefined;
  await producer.disconnect();
}
