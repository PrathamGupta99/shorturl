import { Router } from 'express';

import { rateLimits } from '../../config.js';
import { HttpError } from '../../errors.js';
import { asyncHandler, parse } from '../../http.js';
import {
  assertWithinRateLimit,
  clientIp,
  recordRateLimitFailure
} from '../../infrastructure/redis/rate-limit.js';
import { authenticatedUser, requireAuth } from './middleware.js';
import { findUserById, revokeSessionByTokenHash, toPublicUser } from './repository.js';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './schemas.js';
import { login, refresh, register } from './service.js';
import { hashRefreshToken } from './tokens.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (request, response) => {
    const user = await register(parse(registerSchema, request.body));
    response.status(201).json({ user });
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (request, response) => {
    const ip = clientIp(request);
    // Only failed logins count against the limit, so a busy legitimate user is
    // never locked out by their own successful sign-ins.
    await assertWithinRateLimit(rateLimits.loginFailure, ip);

    try {
      const tokens = await login(parse(loginSchema, request.body));
      response.status(200).json(tokens);
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 401) {
        await recordRateLimitFailure(rateLimits.loginFailure, ip);
      }
      throw error;
    }
  })
);

authRouter.post(
  '/refresh',
  asyncHandler(async (request, response) => {
    const { refreshToken } = parse(refreshSchema, request.body);
    const tokens = await refresh(refreshToken);
    response.status(200).json(tokens);
  })
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (request, response) => {
    const { refreshToken } = parse(logoutSchema, request.body);
    await revokeSessionByTokenHash(
      authenticatedUser(response).userId,
      hashRefreshToken(refreshToken)
    );
    response.status(204).send();
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (_request, response) => {
    const user = await findUserById(authenticatedUser(response).userId);
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'User no longer exists');
    }
    response.status(200).json({ user: toPublicUser(user) });
  })
);
