'use client';

import { useCallback, useEffect, useState } from 'react';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PaginatedLinks } from '@/lib/types';

/** Loads one page of the signed-in user's links, with a manual reload hook. */
export function useLinks(page = 1, pageSize = 20) {
  const { withAccessToken } = useAuth();
  const [data, setData] = useState<PaginatedLinks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      setData(await withAccessToken((token) => api.listLinks(token, page, pageSize)));
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load your links.');
    } finally {
      setIsLoading(false);
    }
  }, [withAccessToken, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, reload: load };
}
