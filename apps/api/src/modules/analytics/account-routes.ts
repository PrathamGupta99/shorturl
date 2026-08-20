import { Router } from 'express';

import { asyncHandler, parse } from '../../http.js';
import { authenticatedUser, requireAuth } from '../auth/middleware.js';
import { timeseriesQuerySchema } from './schemas.js';
import { getAccountOverview, getAccountTimeseries } from './service.js';

/**
 * Mounted at `/v1/analytics`. Where the per-link router reports on one owned
 * short code, this one reports on every link the caller owns.
 */
export const accountAnalyticsRouter = Router();

accountAnalyticsRouter.use(requireAuth);

accountAnalyticsRouter.get(
  '/overview',
  asyncHandler(async (_request, response) => {
    const analytics = await getAccountOverview(authenticatedUser(response).userId);
    response.status(200).json({ analytics });
  })
);

accountAnalyticsRouter.get(
  '/timeseries',
  asyncHandler(async (request, response) => {
    const query = parse(timeseriesQuerySchema, request.query);
    const series = await getAccountTimeseries(authenticatedUser(response).userId, query);
    response.status(200).json({ days: query.days, series });
  })
);
