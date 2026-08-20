import { z } from 'zod';

export const CLICK_EVENTS_TOPIC = 'click-events';
export const CLICK_EVENTS_TOPIC_PARTITIONS = 3;
export const ANALYTICS_CONSUMER_GROUP = 'analytics-consumers';

export const CLICK_EVENT_TYPE = 'URL_CLICKED';
export const CLICK_EVENT_VERSION = 1;

export const clickEventSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.literal(CLICK_EVENT_TYPE),
  version: z.literal(CLICK_EVENT_VERSION),
  shortCode: z.string().min(1),
  linkId: z.string().min(1),
  ownerId: z.string().min(1).nullable(),
  timestamp: z.string().datetime(),
  userAgent: z.string().nullable(),
  referrer: z.string().nullable(),
  ip: z.string().nullable(),
  requestId: z.string().min(1)
});

export type ClickEvent = z.infer<typeof clickEventSchema>;
