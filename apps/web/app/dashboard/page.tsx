'use client';

import { LinkIcon, MousePointerClickIcon, PowerIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ClicksOverTimeChart } from '@/components/charts/clicks-over-time-chart';
import { LinksCreatedChart } from '@/components/charts/links-created-chart';
import { CreateLinkDialog } from '@/components/create-link-dialog';
import { LinksTable } from '@/components/links-table';
import { StatCard } from '@/components/stat-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccountAnalytics } from '@/hooks/use-account-analytics';
import { useLinks } from '@/hooks/use-links';
import { useAuth } from '@/lib/auth-context';
import { formatCount, formatDateTime } from '@/lib/format';

/** Enough rows to fill the "recent links" panel without a second request. */
const RECENT_PAGE_SIZE = 5;

const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const { data, isLoading, error, reload } = useLinks(1, RECENT_PAGE_SIZE);
  const {
    analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    reload: reloadAnalytics
  } = useAccountAnalytics(days);

  const links = data?.links ?? [];
  const overview = analytics?.overview;

  const refresh = (): void => {
    void reload();
    void reloadAnalytics();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as {user?.email ?? 'your account'}.
          </p>
        </div>
        <CreateLinkDialog onCreated={refresh} />
      </header>

      {error !== null && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {analyticsError !== null && (
        <Alert variant="destructive">
          <AlertDescription>{analyticsError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Links you own"
          value={formatCount(overview?.totalLinks ?? 0)}
          hint="Anonymous links are never counted"
          icon={LinkIcon}
          isLoading={isLoadingAnalytics}
        />
        <StatCard
          label="Active links"
          value={formatCount(overview?.activeLinks ?? 0)}
          hint="Enabled and not expired"
          icon={PowerIcon}
          isLoading={isLoadingAnalytics}
        />
        <StatCard
          label="Total clicks"
          value={formatCount(overview?.totalClicks ?? 0)}
          hint={`${formatCount(overview?.clicksToday ?? 0)} today`}
          icon={MousePointerClickIcon}
          isLoading={isLoadingAnalytics}
        />
        <StatCard
          label="Unique visitors"
          value={formatCount(overview?.uniqueVisitors ?? 0)}
          hint="By hashed IP, across all links"
          icon={UsersIcon}
          isLoading={isLoadingAnalytics}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Traffic across all your links</CardTitle>
            <CardDescription>
              {overview?.lastClickAt == null
                ? 'No clicks recorded yet.'
                : `Last click ${formatDateTime(overview.lastClickAt)}`}
            </CardDescription>
          </div>

          <Tabs value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <TabsList>
              {RANGES.map((range) => (
                <TabsTrigger key={range.days} value={String(range.days)}>
                  {range.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {analytics === null ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <ClicksOverTimeChart data={analytics.series} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Links created</CardTitle>
          <CardDescription>
            How many short links you made each day over the same window.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {analytics === null ? (
            <Skeleton className="h-[220px]" />
          ) : (
            <LinksCreatedChart data={analytics.series} />
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle className="text-base">Recent links</CardTitle>
          <CardDescription>Your newest short links and their status.</CardDescription>
        </CardHeader>

        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-2 px-4 pb-4">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 pb-12 text-center">
              <p className="font-medium">Nothing here yet</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                Create your first short link to start collecting click analytics.
              </p>
            </div>
          ) : (
            <>
              <LinksTable links={links} onChanged={refresh} />
              <div className="border-t px-4 py-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/links">View all links</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
