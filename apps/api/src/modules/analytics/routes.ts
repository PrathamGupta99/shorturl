import { Router } from 'express';

import { asyncHandler, parse, shortCodeParam } from '../../http.js';
import { authenticatedUser, requireAuth } from '../auth/middleware.js';
import type { BreakdownDimension } from './repository.js';
import { breakdownQuerySchema, timeseriesQuerySchema } from './schemas.js';
import { getBreakdown, getOverview, getTimeseries } from './service.js';

/**
 * Mounted under `/v1/links/:shortCode/analytics`. Every route requires
 * authentication and only ever reads analytics for a link the caller owns.
 */
export const analyticsRouter = Router({ mergeParams: true });

analyticsRouter.use(requireAuth);

analyticsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const overview = await getOverview(shortCodeParam(request), authenticatedUser(response).userId);
    response.status(200).json({ analytics: overview });
  })
);

analyticsRouter.get(
  '/timeseries',
  asyncHandler(async (request, response) => {
    const query = parse(timeseriesQuerySchema, request.query);
    const series = await getTimeseries(
      shortCodeParam(request),
      authenticatedUser(response).userId,
      query
    );
    response.status(200).json({ days: query.days, clicksOverTime: series });
  })
);

const BREAKDOWNS: Array<{ path: string; dimension: BreakdownDimension }> = [
  { path: '/devices', dimension: 'device' },
  { path: '/browsers', dimension: 'browser' },
  { path: '/operating-systems', dimension: 'os' },
  { path: '/referrers', dimension: 'referrer' }
];

for (const { path, dimension } of BREAKDOWNS) {
  analyticsRouter.get(
    path,
    asyncHandler(async (request, response) => {
      const query = parse(breakdownQuerySchema, request.query);
      const breakdown = await getBreakdown(
        shortCodeParam(request),
        authenticatedUser(response).userId,
        dimension,
        query
      );
      response.status(200).json({ dimension, breakdown });
    })
  );
}
