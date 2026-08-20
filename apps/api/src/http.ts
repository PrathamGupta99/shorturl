import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { isValidShortCode } from '@url-shortener/shared';

import { HttpError } from './errors.js';

export function parse<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed');
    }
    throw error;
  }
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

/**
 * Accepts both generated Base62 codes and custom aliases. Anything that cannot
 * be a short code is reported as a missing link rather than a bad request, so
 * stray paths such as `/favicon.ico` never look like a validation failure.
 */
export function shortCodeParam(request: Request): string {
  const shortCode = request.params.shortCode;

  if (typeof shortCode !== 'string' || !isValidShortCode(shortCode)) {
    throw new HttpError(404, 'LINK_NOT_FOUND', 'Short link was not found');
  }

  return shortCode;
}
