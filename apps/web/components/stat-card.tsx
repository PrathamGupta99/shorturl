import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  isLoading = false
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  icon: LucideIcon;
  isLoading?: boolean;
}) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">{label}</span>
          <Icon className="text-muted-foreground size-4" />
        </div>

        {isLoading ? (
          <Skeleton className="mt-2 h-8 w-20" />
        ) : (
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        )}

        {hint !== undefined && !isLoading && (
          <p className="text-muted-foreground mt-1 truncate text-xs">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
