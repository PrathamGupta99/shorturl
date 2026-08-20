'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartTooltipBox } from '@/components/charts/chart-tooltip';
import { formatChartDate, formatCount } from '@/lib/format';
import type { AccountTimeseriesPoint } from '@/lib/types';

interface HoveredDay {
  date: string;
  linksCreated: number;
}

/** Reads the hovered day out of Recharts' loosely typed tooltip payload. */
function hoveredDay(payload: unknown): HoveredDay | null {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const entry = (payload as Array<{ payload?: unknown }>)[0]?.payload;

  if (typeof entry !== 'object' || entry === null) {
    return null;
  }

  const { date, linksCreated } = entry as { date?: unknown; linksCreated?: unknown };

  return typeof date === 'string' && typeof linksCreated === 'number'
    ? { date, linksCreated }
    : null;
}

/**
 * Bars rather than an area: link creation is a count of discrete events on a
 * day, not a level that carries over between days.
 */
export function LinksCreatedChart({ data }: { data: AccountTimeseriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
          cursor={{ fill: 'var(--accent)' }}
          content={({ active, payload }) => {
            const day = active === true ? hoveredDay(payload) : null;

            return day === null ? null : (
              <ChartTooltipBox label={formatChartDate(day.date)}>
                <p className="font-medium">
                  {day.linksCreated} link{day.linksCreated === 1 ? '' : 's'} created
                </p>
              </ChartTooltipBox>
            );
          }}
        />

        <Bar
          dataKey="linksCreated"
          fill="var(--chart-3)"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
