import type { Kafka } from 'kafkajs';

import { CLICK_EVENTS_TOPIC, CLICK_EVENTS_TOPIC_PARTITIONS } from '@url-shortener/shared';

/**
 * Creates the click-events topic when it is missing. Both the API and the
 * worker call this at startup so neither depends on the other having run
 * first, and `createTopics` is a no-op once the topic exists.
 */
export async function ensureClickEventsTopic(kafka: Kafka): Promise<void> {
  const admin = kafka.admin();

  try {
    await admin.connect();
    const topics = await admin.listTopics();

    if (!topics.includes(CLICK_EVENTS_TOPIC)) {
      await admin.createTopics({
        topics: [{ topic: CLICK_EVENTS_TOPIC, numPartitions: CLICK_EVENTS_TOPIC_PARTITIONS }]
      });
    }
  } finally {
    await admin.disconnect();
  }
}
