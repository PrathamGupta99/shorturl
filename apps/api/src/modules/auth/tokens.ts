import { createHash, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import { apiConfig } from '../../config.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

type JwtExpiry = Exclude<SignOptions['expiresIn'], undefined>;

export function createAccessToken(user: AccessTokenPayload): string {
  return jwt.sign(user, apiConfig.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: apiConfig.JWT_ACCESS_TTL as JwtExpiry
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, apiConfig.JWT_ACCESS_SECRET, {
    algorithms: ['HS256']
  });

  if (
    typeof decoded === 'string' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.email !== 'string'
  ) {
    throw new Error('Invalid access token payload');
  }

  return { sub: decoded.sub, email: decoded.email };
}

export function createRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setUTCDate(expiry.getUTCDate() + apiConfig.JWT_REFRESH_TTL_DAYS);
  return expiry;
}
