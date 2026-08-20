'use client';

import { useCallback, useEffect, useState } from 'react';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  AnalyticsOverview,
  BreakdownDimension,
  BreakdownEntry,
  Link,
  TimeseriesPoint
} from '@/lib/types';

/** The breakdown panels, in the order they are rendered. */
export const BREAKDOWNS: Array<{ dimension: BreakdownDimension; title: string }> = [
  { dimension: 'browsers', title: 'Browsers' },
  { dimension: 'devices', title: 'Devices' },
  { dimension: 'operating-systems', title: 'Operating systems' },
  { dimension: 'referrers', title: 'Referrers' }
];

export interface LinkAnalytics {
  link: Link;
  overview: AnalyticsOverview;
  clicksOverTime: TimeseriesPoint[];
  breakdowns: Record<BreakdownDimension, BreakdownEntry[]>;
}

/**
 * Loads everything the analytics page shows for one owned link. The API exposes
 * the overview, the time series, and each breakdown separately, so they are
 * requested together and surfaced as one object.
 */
export function useLinkAnalytics(shortCode: string, days: number) {
  const { withAccessToken } = useAuth();
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const loaded = await withAccessToken(async (token) => {
        const [link, overview, timeseries, ...breakdowns] = await Promise.all([
          api.getLink(shortCode, token),
          api.analyticsOverview(shortCode, token),
          api.analyticsTimeseries(shortCode, token, days),
          ...BREAKDOWNS.map((entry) => api.analyticsBreakdown(shortCode, entry.dimension, token))
        ]);

        return {
          link: link.link,
          overview: overview.analytics,
          clicksOverTime: timeseries.clicksOverTime,
          breakdowns: Object.fromEntries(
            BREAKDOWNS.map((entry, index) => [entry.dimension, breakdowns[index]?.breakdown ?? []])
          ) as Record<BreakdownDimension, BreakdownEntry[]>
        };
      });

      setAnalytics(loaded);
      setNotFound(false);
    } catch (caught: unknown) {
      // A link that is missing, or owned by someone else, is reported the same
      // way by the API and gets its own empty state instead of an error banner.
      if (caught instanceof ApiError && caught.status === 404) {
        setNotFound(true);
      } else {
        setError(caught instanceof ApiError ? caught.message : 'Could not load analytics.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [withAccessToken, shortCode, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return { analytics, isLoading, error, notFound, reload: load };
}
