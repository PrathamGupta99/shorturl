import type { Collection, Filter } from 'mongodb';

import { mongoDatabase } from '../../infrastructure/mongo/client.js';

const CLICK_EVENTS_COLLECTION = 'click_events';

export interface ClickEventDocument {
  eventId: string;
  shortCode: string;
  linkId: string;
  ownerId: string | null;
  timestamp: Date;
  browser: string;
  os: string;
  device: string;
  country: string | null;
  referrer: string | null;
  ipHash: string | null;
  userAgent: string | null;
  requestId: string;
}

/** Dimensions that may be grouped on by the breakdown endpoints. */
export type BreakdownDimension = 'device' | 'browser' | 'os' | 'referrer';

export interface DimensionCount {
  value: string | null;
  clicks: number;
}

export interface OverviewTotals {
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  topBrowser: string | null;
  lastClickAt: Date | null;
}

async function clickEvents(): Promise<Collection<ClickEventDocument>> {
  const database = await mongoDatabase();
  return database.collection<ClickEventDocument>(CLICK_EVENTS_COLLECTION);
}

interface OverviewFacets {
  totals: Array<{ totalClicks: number }>;
  unique: Array<{ count: number }>;
  today: Array<{ count: number }>;
  topBrowser: Array<{ _id: string; clicks: number }>;
  lastClick: Array<{ timestamp: Date }>;
}

/**
 * The same totals are reported for a single link and for every link an account
 * owns, so both scopes run one pipeline that differs only in its match stage.
 */
async function aggregateTotals(
  match: Filter<ClickEventDocument>,
  startOfToday: Date
): Promise<OverviewTotals> {
  const collection = await clickEvents();
  const [facets] = await collection
    .aggregate<OverviewFacets>([
      { $match: match },
      {
        $facet: {
          totals: [{ $group: { _id: null, totalClicks: { $sum: 1 } } }],
          unique: [
            { $match: { ipHash: { $ne: null } } },
            { $group: { _id: '$ipHash' } },
            { $count: 'count' }
          ],
          today: [{ $match: { timestamp: { $gte: startOfToday } } }, { $count: 'count' }],
          topBrowser: [
            { $group: { _id: '$browser', clicks: { $sum: 1 } } },
            { $sort: { clicks: -1, _id: 1 } },
            { $limit: 1 }
          ],
          lastClick: [
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
            { $project: { _id: 0, timestamp: 1 } }
          ]
        }
      }
    ])
    .toArray();

  return {
    totalClicks: facets?.totals[0]?.totalClicks ?? 0,
    uniqueVisitors: facets?.unique[0]?.count ?? 0,
    clicksToday: facets?.today[0]?.count ?? 0,
    topBrowser: facets?.topBrowser[0]?._id ?? null,
    lastClickAt: facets?.lastClick[0]?.timestamp ?? null
  };
}

export async function aggregateOverview(
  shortCode: string,
  startOfToday: Date
): Promise<OverviewTotals> {
  return aggregateTotals({ shortCode }, startOfToday);
}

export async function aggregateOwnerOverview(
  ownerId: string,
  startOfToday: Date
): Promise<OverviewTotals> {
  return aggregateTotals({ ownerId }, startOfToday);
}

export interface DailyCount {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

/**
 * Unique visitors are counted per day rather than summed from the daily totals,
 * because one visitor returning on several days is one visitor on each of them
 * but must never be double counted inside a single day.
 */
async function aggregateDaily(
  match: Filter<ClickEventDocument>,
  since: Date
): Promise<DailyCount[]> {
  const collection = await clickEvents();
  return collection
    .aggregate<DailyCount>([
      { $match: { ...match, timestamp: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: 'UTC' } },
          clicks: { $sum: 1 },
          visitors: { $addToSet: '$ipHash' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          clicks: 1,
          uniqueVisitors: {
            $size: {
              $filter: { input: '$visitors', cond: { $ne: ['$$this', null] } }
            }
          }
        }
      }
    ])
    .toArray();
}

export async function aggregateDailyClicks(shortCode: string, since: Date): Promise<DailyCount[]> {
  return aggregateDaily({ shortCode }, since);
}

export async function aggregateOwnerDailyClicks(
  ownerId: string,
  since: Date
): Promise<DailyCount[]> {
  return aggregateDaily({ ownerId }, since);
}

export async function countClicks(shortCode: string): Promise<number> {
  const collection = await clickEvents();
  return collection.countDocuments({ shortCode });
}

export async function aggregateDimension(
  shortCode: string,
  dimension: BreakdownDimension,
  limit: number
): Promise<DimensionCount[]> {
  const collection = await clickEvents();
  const grouped = await collection
    .aggregate<{ _id: string | null; clicks: number }>([
      { $match: { shortCode } },
      { $group: { _id: `$${dimension}`, clicks: { $sum: 1 } } },
      { $sort: { clicks: -1, _id: 1 } },
      { $limit: limit }
    ])
    .toArray();

  return grouped.map((row) => ({ value: row._id, clicks: row.clicks }));
}
