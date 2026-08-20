import {
  countActiveLinksForUser,
  countLinksCreatedPerDay,
  countLinksForUser
} from '../links/repository.js';
import { getOwnedLink } from '../links/service.js';
import {
  aggregateDailyClicks,
  aggregateDimension,
  aggregateOverview,
  aggregateOwnerDailyClicks,
  aggregateOwnerOverview,
  countClicks,
  type BreakdownDimension
} from './repository.js';
import type { BreakdownQuery, TimeseriesQuery } from './schemas.js';

export interface AnalyticsOverview {
  shortCode: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  topBrowser: string | null;
  lastClickAt: Date | null;
}

export interface TimeseriesPoint {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

export interface BreakdownEntry {
  value: string;
  clicks: number;
  share: number;
}

/** Account-wide totals across every link the user owns. */
export interface AccountAnalyticsOverview {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  topBrowser: string | null;
  lastClickAt: Date | null;
}

export interface AccountTimeseriesPoint extends TimeseriesPoint {
  linksCreated: number;
}

/** Labels used when an event carries no value for a dimension. */
const EMPTY_LABELS: Record<BreakdownDimension, string> = {
  device: 'Unknown',
  browser: 'Unknown',
  os: 'Unknown',
  referrer: 'Direct'
};

export async function getOverview(shortCode: string, userId: string): Promise<AnalyticsOverview> {
  await getOwnedLink(shortCode, userId);
  const totals = await aggregateOverview(shortCode, startOfUtcDay(new Date()));

  return { shortCode, ...totals };
}

/**
 * Returns one point per day for the requested window, including days with no
 * clicks so the dashboard chart has a continuous x-axis.
 */
export async function getTimeseries(
  shortCode: string,
  userId: string,
  query: TimeseriesQuery
): Promise<TimeseriesPoint[]> {
  await getOwnedLink(shortCode, userId);

  const since = windowStart(query.days);
  const daily = new Map(
    (await aggregateDailyClicks(shortCode, since)).map((row) => [row.date, row])
  );

  return eachDay(since, query.days).map((date) => ({
    date,
    clicks: daily.get(date)?.clicks ?? 0,
    uniqueVisitors: daily.get(date)?.uniqueVisitors ?? 0
  }));
}

export async function getBreakdown(
  shortCode: string,
  userId: string,
  dimension: BreakdownDimension,
  query: BreakdownQuery
): Promise<BreakdownEntry[]> {
  await getOwnedLink(shortCode, userId);

  // Shares are relative to every click on the link, not only the rows that fit
  // inside the requested limit.
  const [rows, total] = await Promise.all([
    aggregateDimension(shortCode, dimension, query.limit),
    countClicks(shortCode)
  ]);

  return rows.map((row) => ({
    value: row.value ?? EMPTY_LABELS[dimension],
    clicks: row.clicks,
    share: total === 0 ? 0 : Math.round((row.clicks / total) * 10000) / 10000
  }));
}

/**
 * Totals for the whole account. Link counts come from Postgres and click totals
 * from the click events Mongo stores against `ownerId`, so a link that has been
 * deleted still contributes the clicks it collected while it existed.
 */
export async function getAccountOverview(userId: string): Promise<AccountAnalyticsOverview> {
  const [totalLinks, activeLinks, totals] = await Promise.all([
    countLinksForUser(userId),
    countActiveLinksForUser(userId),
    aggregateOwnerOverview(userId, startOfUtcDay(new Date()))
  ]);

  return { totalLinks, activeLinks, ...totals };
}

/**
 * One point per day combining the two stores: clicks and visitors from Mongo,
 * links created from Postgres.
 */
export async function getAccountTimeseries(
  userId: string,
  query: TimeseriesQuery
): Promise<AccountTimeseriesPoint[]> {
  const since = windowStart(query.days);
  const [clicks, created] = await Promise.all([
    aggregateOwnerDailyClicks(userId, since),
    countLinksCreatedPerDay(userId, since)
  ]);

  const daily = new Map(clicks.map((row) => [row.date, row]));
  const links = new Map(created.map((row) => [row.date, row.linksCreated]));

  return eachDay(since, query.days).map((date) => ({
    date,
    clicks: daily.get(date)?.clicks ?? 0,
    uniqueVisitors: daily.get(date)?.uniqueVisitors ?? 0,
    linksCreated: links.get(date) ?? 0
  }));
}

/** Start of the UTC day `days - 1` days ago, so the window includes today. */
function windowStart(days: number): Date {
  const since = startOfUtcDay(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return since;
}

/** Every `YYYY-MM-DD` in the window, so gaps in traffic render as zeroes. */
function eachDay(since: Date, days: number): string[] {
  return Array.from({ length: days }, (_unused, offset) => {
    const day = new Date(since);
    day.setUTCDate(day.getUTCDate() + offset);
    return day.toISOString().slice(0, 10);
  });
}

function startOfUtcDay(date: Date): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}
