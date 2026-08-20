import { MongoServerError, type Collection } from 'mongodb';

import { mongoDatabase } from '../infrastructure/mongo/client.js';

export const CLICK_EVENTS_COLLECTION = 'click_events';

const DUPLICATE_KEY_ERROR = 11000;

export interface ClickEventDocument {
  eventId: string;
  shortCode: string;
  linkId: string;
  ownerId: string | null;
  timestamp: Date;
  browser: string;
  os: string;
  device: string;
  country: string | null;
  referrer: string | null;
  ipHash: string | null;
  userAgent: string | null;
  requestId: string;
  createdAt: Date;
}

async function clickEvents(): Promise<Collection<ClickEventDocument>> {
  const database = await mongoDatabase();
  return database.collection<ClickEventDocument>(CLICK_EVENTS_COLLECTION);
}

export async function ensureIndexes(): Promise<void> {
  const collection = await clickEvents();

  await collection.createIndexes([
    { key: { eventId: 1 }, name: 'click_events_event_id_unique', unique: true },
    { key: { shortCode: 1, timestamp: -1 }, name: 'click_events_short_code_timestamp' },
    { key: { ownerId: 1, timestamp: -1 }, name: 'click_events_owner_timestamp' }
  ]);
}

/**
 * Inserts a click event, returning false when the event was already stored.
 * The unique `eventId` index makes reprocessing a Kafka message idempotent.
 */
export async function insertClickEvent(document: ClickEventDocument): Promise<boolean> {
  const collection = await clickEvents();

  try {
    await collection.insertOne(document);
    return true;
  } catch (error: unknown) {
    if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR) {
      return false;
    }
    throw error;
  }
}
