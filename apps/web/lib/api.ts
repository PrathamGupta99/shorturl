import type {
  AccountAnalyticsOverview,
  AccountTimeseriesPoint,
  AnalyticsOverview,
  AuthTokens,
  AuthUser,
  BreakdownDimension,
  BreakdownEntry,
  BulkLinksSummary,
  CreateLinkRequest,
  Link,
  PaginatedLinks,
  TimeseriesPoint,
  UnlockedLink,
  UpdateLinkRequest
} from './types';

/**
 * The API also serves every short link, so this one base URL is both the API
 * host and the host that appears in generated short URLs.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
).replace(/\/$/, '');

/** An error carrying the API's machine-readable code so callers can branch on it. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | undefined;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { accept: 'application/json' };

  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (options.accessToken !== undefined) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      credentials: 'include',
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', `Cannot reach the API at ${API_BASE_URL}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = readApiError(payload);
    throw new ApiError(response.status, error.code, error.message);
  }

  return payload as T;
}

function readApiError(payload: unknown): { code: string; message: string } {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const { error }: { error: unknown } = payload;

    if (typeof error === 'object' && error !== null) {
      const { code, message } = error as { code?: unknown; message?: unknown };
      return {
        code: typeof code === 'string' ? code : 'UNKNOWN_ERROR',
        message: typeof message === 'string' ? message : 'Something went wrong'
      };
    }
  }

  return { code: 'UNKNOWN_ERROR', message: 'Something went wrong' };
}

export const api = {
  register: (email: string, password: string) =>
    request<{ user: AuthUser }>('/v1/auth/register', { method: 'POST', body: { email, password } }),

  login: (email: string, password: string) =>
    request<AuthTokens>('/v1/auth/login', { method: 'POST', body: { email, password } }),

  refresh: (refreshToken: string) =>
    request<AuthTokens>('/v1/auth/refresh', { method: 'POST', body: { refreshToken } }),

  logout: (accessToken: string, refreshToken: string) =>
    request<void>('/v1/auth/logout', { method: 'POST', body: { refreshToken }, accessToken }),

  me: (accessToken: string) => request<{ user: AuthUser }>('/v1/auth/me', { accessToken }),

  createLink: (body: CreateLinkRequest, accessToken?: string) =>
    request<{ link: Link }>('/v1/links', { method: 'POST', body, accessToken }),

  createBulkLinks: (urls: string[], accessToken?: string) =>
    request<BulkLinksSummary>('/v1/links/bulk', { method: 'POST', body: { urls }, accessToken }),

  listLinks: (accessToken: string, page = 1, pageSize = 20) =>
    request<PaginatedLinks>('/v1/links', { accessToken, query: { page, pageSize } }),

  getLink: (shortCode: string, accessToken: string) =>
    request<{ link: Link }>(`/v1/links/${shortCode}`, { accessToken }),

  updateLink: (shortCode: string, body: UpdateLinkRequest, accessToken: string) =>
    request<{ link: Link }>(`/v1/links/${shortCode}`, { method: 'PATCH', body, accessToken }),

  disableLink: (shortCode: string, accessToken: string) =>
    request<{ link: Link }>(`/v1/links/${shortCode}/disable`, { method: 'POST', accessToken }),

  deleteLink: (shortCode: string, accessToken: string) =>
    request<void>(`/v1/links/${shortCode}`, { method: 'DELETE', accessToken }),

  unlockLink: (shortCode: string, password: string) =>
    request<UnlockedLink>(`/${shortCode}/password`, { method: 'POST', body: { password } }),

  accountAnalyticsOverview: (accessToken: string) =>
    request<{ analytics: AccountAnalyticsOverview }>('/v1/analytics/overview', { accessToken }),

  accountAnalyticsTimeseries: (accessToken: string, days = 30) =>
    request<{ days: number; series: AccountTimeseriesPoint[] }>('/v1/analytics/timeseries', {
      accessToken,
      query: { days }
    }),

  analyticsOverview: (shortCode: string, accessToken: string) =>
    request<{ analytics: AnalyticsOverview }>(`/v1/links/${shortCode}/analytics`, { accessToken }),

  analyticsTimeseries: (shortCode: string, accessToken: string, days = 30) =>
    request<{ days: number; clicksOverTime: TimeseriesPoint[] }>(
      `/v1/links/${shortCode}/analytics/timeseries`,
      { accessToken, query: { days } }
    ),

  analyticsBreakdown: (
    shortCode: string,
    dimension: BreakdownDimension,
    accessToken: string,
    limit = 8
  ) =>
    request<{ dimension: string; breakdown: BreakdownEntry[] }>(
      `/v1/links/${shortCode}/analytics/${dimension}`,
      { accessToken, query: { limit } }
    )
};
