'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartTooltipBox } from '@/components/charts/chart-tooltip';
import { formatCount, formatShare } from '@/lib/format';
import type { BreakdownEntry } from '@/lib/types';

/** Categorical colours, reused in order so every breakdown reads the same way. */
const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)'
] as const;

function colorAt(index: number): string {
  return COLORS[index % COLORS.length] ?? COLORS[0];
}

/** Reads the hovered row out of Recharts' loosely typed tooltip payload. */
function hoveredEntry(payload: unknown): BreakdownEntry | null {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const entry = (payload as Array<{ payload?: unknown }>)[0]?.payload;

  if (typeof entry !== 'object' || entry === null) {
    return null;
  }

  const { value, clicks, share } = entry as { value?: unknown; clicks?: unknown; share?: unknown };

  return typeof value === 'string' && typeof clicks === 'number' && typeof share === 'number'
    ? { value, clicks, share }
    : null;
}

/**
 * Horizontal bars, because dimension labels ("Mobile Safari", a referrer domain)
 * are text and would be unreadable rotated under vertical bars.
 */
export function BreakdownChart({ data }: { data: BreakdownEntry[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground grid h-40 place-items-center text-sm">
        No clicks recorded yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="value"
          width={116}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          stroke="transparent"
        />

        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
          content={({ active, payload }) => {
            const entry = active === true ? hoveredEntry(payload) : null;

            return entry === null ? null : (
              <ChartTooltipBox label={entry.value}>
                <p className="font-medium">
                  {formatCount(entry.clicks)} click{entry.clicks === 1 ? '' : 's'}
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · {formatShare(entry.share)}
                  </span>
                </p>
              </ChartTooltipBox>
            );
          }}
        />

        <Bar dataKey="clicks" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((entry, index) => (
            <Cell key={entry.value} fill={colorAt(index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
