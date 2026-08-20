import { randomUUID } from 'node:crypto';

import type { Request } from 'express';

import { CLICK_EVENT_TYPE, CLICK_EVENT_VERSION, type ClickEvent } from '@url-shortener/shared';

import type { ResolvedLink } from './service.js';

function header(request: Request, name: string): string | null {
  const value = request.header(name);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function buildClickEvent(request: Request, link: ResolvedLink): ClickEvent {
  return {
    eventId: randomUUID(),
    eventType: CLICK_EVENT_TYPE,
    version: CLICK_EVENT_VERSION,
    shortCode: link.shortCode,
    linkId: link.id,
    ownerId: link.ownerId,
    timestamp: new Date().toISOString(),
    userAgent: header(request, 'user-agent'),
    referrer: header(request, 'referer') ?? header(request, 'referrer'),
    ip: request.ip ?? request.socket.remoteAddress ?? null,
    requestId: typeof request.id === 'string' ? request.id : randomUUID()
  };
}
