/** Response shapes returned by the Express API, as seen by the browser. */

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Link {
  id: string;
  shortCode: string;
  shortUrl: string;
  url: string;
  title: string | null;
  isActive: boolean;
  isAnonymous: boolean;
  requiresPassword: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLinks {
  links: Link[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BulkLinkResult {
  index: number;
  url: string;
  status: 'created' | 'failed';
  link?: Link;
  error?: { code: string; message: string };
}

export interface BulkLinksSummary {
  requested: number;
  created: number;
  failed: number;
  results: BulkLinkResult[];
}

export interface UnlockedLink {
  shortCode: string;
  shortUrl: string;
  redirectUrl: string;
  unlockToken: string;
  expiresInSeconds: number;
}

export interface AnalyticsOverview {
  shortCode: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  topBrowser: string | null;
  lastClickAt: string | null;
}

/** Account-wide totals across every link the signed-in user owns. */
export interface AccountAnalyticsOverview {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  topBrowser: string | null;
  lastClickAt: string | null;
}

export interface TimeseriesPoint {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

export interface AccountTimeseriesPoint extends TimeseriesPoint {
  linksCreated: number;
}

export interface BreakdownEntry {
  value: string;
  clicks: number;
  share: number;
}

export type BreakdownDimension = 'devices' | 'browsers' | 'operating-systems' | 'referrers';

export interface CreateLinkRequest {
  url: string;
  title?: string;
  customAlias?: string;
  expiresAt?: string;
  password?: string;
}

export interface UpdateLinkRequest {
  url?: string;
  title?: string | null;
  isActive?: boolean;
  expiresAt?: string | null;
}
