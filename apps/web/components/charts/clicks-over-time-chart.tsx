'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { ChartTooltipBox } from '@/components/charts/chart-tooltip';
import { formatChartDate, formatCount } from '@/lib/format';
import type { TimeseriesPoint } from '@/lib/types';

/** Reads the hovered day out of Recharts' loosely typed tooltip payload. */
function hoveredPoint(payload: unknown): TimeseriesPoint | null {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const entry = (payload as Array<{ payload?: unknown }>)[0]?.payload;

  if (typeof entry !== 'object' || entry === null) {
    return null;
  }

  const { date, clicks, uniqueVisitors } = entry as {
    date?: unknown;
    clicks?: unknown;
    uniqueVisitors?: unknown;
  };

  return typeof date === 'string' && typeof clicks === 'number' && typeof uniqueVisitors === 'number'
    ? { date, clicks, uniqueVisitors }
    : null;
}

/**
 * One point per day, including zero-click days, so the x-axis stays continuous
 * and gaps in traffic are visible rather than collapsed. Unique visitors are
 * drawn over total clicks: the two lines meeting means nobody clicked twice.
 *
 * Animation is off because switching the range swaps the whole series, and the
 * entry animation replays from an empty chart on every switch.
 */
export function ClicksOverTimeChart({ data }: { data: TimeseriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />

        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          stroke="var(--border)"
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={formatCount}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          stroke="var(--border)"
          width={48}
        />

        <Tooltip
          cursor={{ stroke: 'var(--border)' }}
          content={({ active, payload }) => {
            const point = active === true ? hoveredPoint(payload) : null;

            return point === null ? null : (
              <ChartTooltipBox label={formatChartDate(point.date)}>
                <p className="font-medium">
                  {point.clicks} click{point.clicks === 1 ? '' : 's'}
                </p>
                <p className="text-muted-foreground">
                  {point.uniqueVisitors} unique visitor{point.uniqueVisitors === 1 ? '' : 's'}
                </p>
              </ChartTooltipBox>
            );
          }}
        />

        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconType="plainline"
          iconSize={12}
          formatter={(value: string) => (
            <span className="text-muted-foreground text-xs">{value}</span>
          )}
        />

        <Area
          type="monotone"
          dataKey="clicks"
          name="Clicks"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#clicksFill)"
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="uniqueVisitors"
          name="Unique visitors"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#visitorsFill)"
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
