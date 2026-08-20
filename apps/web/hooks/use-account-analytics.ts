'use client';

import { useCallback, useEffect, useState } from 'react';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AccountAnalyticsOverview, AccountTimeseriesPoint } from '@/lib/types';

export interface AccountAnalytics {
  overview: AccountAnalyticsOverview;
  series: AccountTimeseriesPoint[];
}

/**
 * Loads the account-wide totals and daily series behind the dashboard overview:
 * every link the signed-in user owns, rolled up rather than per link.
 */
export function useAccountAnalytics(days: number) {
  const { withAccessToken } = useAuth();
  const [analytics, setAnalytics] = useState<AccountAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      setAnalytics(
        await withAccessToken(async (token) => {
          const [overview, timeseries] = await Promise.all([
            api.accountAnalyticsOverview(token),
            api.accountAnalyticsTimeseries(token, days)
          ]);

          return { overview: overview.analytics, series: timeseries.series };
        })
      );
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load your analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [withAccessToken, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return { analytics, isLoading, error, reload: load };
}
