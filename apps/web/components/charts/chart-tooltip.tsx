import type { ReactNode } from 'react';

/**
 * Shared shell for chart tooltips, so every chart's hover card uses the same
 * popover surface as the rest of the UI rather than Recharts' default styling.
 */
export function ChartTooltipBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      {children}
    </div>
  );
}
