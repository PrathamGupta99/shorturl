import jwt from 'jsonwebtoken';

import { apiConfig } from '../../config.js';

/**
 * Proof that a visitor has already answered the password challenge for one
 * short code. The token is short-lived and scoped to a single code, so it can
 * safely travel in a redirect URL or a cookie.
 */
interface UnlockTokenPayload {
  sub: string;
  linkId: string;
}

export const UNLOCK_QUERY_PARAM = 'unlock';

export function unlockCookieName(shortCode: string): string {
  return `unlock_${shortCode}`;
}

export function createUnlockToken(shortCode: string, linkId: string): string {
  return jwt.sign(
    { sub: shortCode, linkId } satisfies UnlockTokenPayload,
    apiConfig.LINK_UNLOCK_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: apiConfig.LINK_UNLOCK_TTL_SECONDS
    }
  );
}

/** A token only unlocks the exact short code it was issued for. */
export function isValidUnlockToken(token: string, shortCode: string): boolean {
  try {
    const decoded = jwt.verify(token, apiConfig.LINK_UNLOCK_SECRET, { algorithms: ['HS256'] });
    return typeof decoded !== 'string' && decoded.sub === shortCode;
  } catch {
    return false;
  }
}
