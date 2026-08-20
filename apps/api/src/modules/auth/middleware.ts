import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../errors.js';
import { verifyAccessToken } from './tokens.js';

export interface AuthLocals {
  auth: {
    userId: string;
    email: string;
  };
}

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;

  if (!token) {
    next(new HttpError(401, 'UNAUTHORIZED', 'A bearer token is required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (response.locals as AuthLocals).auth = { userId: payload.sub, email: payload.email };
    next();
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', 'Access token is invalid or expired'));
  }
}

export function authenticatedUser(response: Response): AuthLocals['auth'] {
  return (response.locals as AuthLocals).auth;
}

export function optionalAuthenticatedUser(
  request: Request,
  response: Response
): AuthLocals['auth'] | null {
  const authorization = request.header('authorization');
  if (!authorization) {
    return null;
  }

  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;
  if (!token) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Bearer token is invalid');
  }

  try {
    const payload = verifyAccessToken(token);
    const user = { userId: payload.sub, email: payload.email };
    (response.locals as AuthLocals).auth = user;
    return user;
  } catch {
    throw new HttpError(401, 'UNAUTHORIZED', 'Access token is invalid or expired');
  }
}
