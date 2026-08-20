import { createHash } from 'node:crypto';

import { UAParser } from 'ua-parser-js';

import { workerConfig } from '../config.js';

export interface EnrichedClient {
  browser: string;
  os: string;
  device: string;
  referrer: string | null;
  ipHash: string | null;
}

const UNKNOWN = 'Unknown';

export function deriveClient(userAgent: string | null, referrer: string | null, ip: string | null): EnrichedClient {
  const parsed = userAgent === null ? null : new UAParser(userAgent).getResult();

  return {
    browser: parsed?.browser.name ?? UNKNOWN,
    os: parsed?.os.name ?? UNKNOWN,
    device: parsed === null ? UNKNOWN : deviceLabel(parsed.device.type),
    referrer: referrerDomain(referrer),
    ipHash: hashIp(ip)
  };
}

/**
 * ua-parser-js leaves `device.type` undefined for desktop browsers, so anything
 * it recognised but did not categorise is treated as a desktop client.
 */
function deviceLabel(type: string | undefined): string {
  if (!type) {
    return 'Desktop';
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function referrerDomain(referrer: string | null): string | null {
  if (referrer === null) {
    return null;
  }

  try {
    return new URL(referrer).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function hashIp(ip: string | null): string | null {
  if (ip === null) {
    return null;
  }

  return createHash('sha256').update(`${workerConfig.IP_HASH_SALT}:${ip}`).digest('hex');
}
