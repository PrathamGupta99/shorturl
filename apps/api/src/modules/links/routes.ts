import { Router } from 'express';

import { rateLimits } from '../../config.js';
import { asyncHandler, parse, shortCodeParam } from '../../http.js';
import { clientIp, consumeRateLimit } from '../../infrastructure/redis/rate-limit.js';
import { analyticsRouter } from '../analytics/routes.js';
import { authenticatedUser, optionalAuthenticatedUser, requireAuth } from '../auth/middleware.js';
import {
  bulkCreateLinksSchema,
  createLinkSchema,
  listLinksQuerySchema,
  updateLinkSchema
} from './schemas.js';
import {
  createBulkLinks,
  createShortLink,
  deleteLink,
  disableLink,
  getOwnedLink,
  listUserLinks,
  toPublicLink,
  updateLink
} from './service.js';

export const linksRouter = Router();

linksRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    const user = optionalAuthenticatedUser(request, response);

    if (user) {
      await consumeRateLimit(rateLimits.authenticatedCreate, user.userId);
    } else {
      await consumeRateLimit(rateLimits.anonymousCreate, clientIp(request));
    }

    const link = await createShortLink(parse(createLinkSchema, request.body), user?.userId ?? null);
    response.status(201).json({ link });
  })
);

/**
 * Open to everyone. A signed-in caller owns every link in the batch and is
 * throttled per user, so one shared IP cannot exhaust a colleague's quota;
 * an anonymous batch is throttled per IP and each entry expires on its own.
 */
linksRouter.post(
  '/bulk',
  asyncHandler(async (request, response) => {
    const user = optionalAuthenticatedUser(request, response);

    await consumeRateLimit(rateLimits.bulkCreate, user?.userId ?? clientIp(request));

    const summary = await createBulkLinks(
      parse(bulkCreateLinksSchema, request.body),
      user?.userId ?? null
    );
    response.status(201).json(summary);
  })
);

linksRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (request, response) => {
    const page = await listUserLinks(
      authenticatedUser(response).userId,
      parse(listLinksQuerySchema, request.query)
    );
    response.status(200).json(page);
  })
);

linksRouter.get(
  '/:shortCode',
  requireAuth,
  asyncHandler(async (request, response) => {
    const link = await getOwnedLink(shortCodeParam(request), authenticatedUser(response).userId);
    response.status(200).json({ link: toPublicLink(link) });
  })
);

linksRouter.patch(
  '/:shortCode',
  requireAuth,
  asyncHandler(async (request, response) => {
    const link = await updateLink(
      shortCodeParam(request),
      authenticatedUser(response).userId,
      parse(updateLinkSchema, request.body)
    );
    response.status(200).json({ link });
  })
);

linksRouter.post(
  '/:shortCode/disable',
  requireAuth,
  asyncHandler(async (request, response) => {
    const link = await disableLink(shortCodeParam(request), authenticatedUser(response).userId);
    response.status(200).json({ link });
  })
);

linksRouter.delete(
  '/:shortCode',
  requireAuth,
  asyncHandler(async (request, response) => {
    await deleteLink(shortCodeParam(request), authenticatedUser(response).userId);
    response.status(204).send();
  })
);

linksRouter.use('/:shortCode/analytics', analyticsRouter);
