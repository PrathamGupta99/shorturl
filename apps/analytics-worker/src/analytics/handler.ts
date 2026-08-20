import { clickEventSchema } from '@url-shortener/shared';

import { logger } from '../logger.js';
import { deriveClient } from './enrichment.js';
import { insertClickEvent, type ClickEventDocument } from './repository.js';

export interface RawMessage {
  topic: string;
  partition: number;
  offset: string;
  value: Buffer | null;
}

/**
 * Validates, enriches, and stores one click event. Schema failures are logged
 * and skipped so a single bad message cannot stall the partition; storage
 * failures throw so Kafka redelivers the message.
 */
export async function handleClickEventMessage(message: RawMessage): Promise<void> {
  const payload = decode(message);

  if (payload === null) {
    logger.warn(
      { topic: message.topic, partition: message.partition, offset: message.offset },
      'Skipping click event with unreadable payload'
    );
    return;
  }

  const parsed = clickEventSchema.safeParse(payload);

  if (!parsed.success) {
    logger.warn(
      {
        topic: message.topic,
        partition: message.partition,
        offset: message.offset,
        issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      },
      'Skipping click event that failed schema validation'
    );
    return;
  }

  const event = parsed.data;
  const client = deriveClient(event.userAgent, event.referrer, event.ip);
  const document: ClickEventDocument = {
    eventId: event.eventId,
    shortCode: event.shortCode,
    linkId: event.linkId,
    ownerId: event.ownerId,
    timestamp: new Date(event.timestamp),
    browser: client.browser,
    os: client.os,
    device: client.device,
    country: null,
    referrer: client.referrer,
    ipHash: client.ipHash,
    userAgent: event.userAgent,
    requestId: event.requestId,
    createdAt: new Date()
  };

  const inserted = await insertClickEvent(document);

  logger.info(
    {
      eventId: event.eventId,
      shortCode: event.shortCode,
      requestId: event.requestId,
      partition: message.partition,
      offset: message.offset,
      duplicate: !inserted
    },
    inserted ? 'Stored click event' : 'Ignored duplicate click event'
  );
}

function decode(message: RawMessage): unknown {
  if (message.value === null) {
    return null;
  }

  try {
    return JSON.parse(message.value.toString('utf8'));
  } catch {
    return null;
  }
}
