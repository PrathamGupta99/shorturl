'use client';

import {
  ArrowLeftIcon,
  CompassIcon,
  ExternalLinkIcon,
  MousePointerClickIcon,
  SunriseIcon,
  UsersIcon
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { BreakdownChart } from '@/components/charts/breakdown-chart';
import { ClicksOverTimeChart } from '@/components/charts/clicks-over-time-chart';
import { CopyButton } from '@/components/copy-button';
import { LinkStatusBadge } from '@/components/link-status-badge';
import { StatCard } from '@/components/stat-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BREAKDOWNS, useLinkAnalytics } from '@/hooks/use-link-analytics';
import { formatCount, formatDateTime, truncateUrl } from '@/lib/format';

const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' }
];

export default function LinkAnalyticsPage() {
  const params = useParams<{ shortCode: string }>();
  const shortCode = params.shortCode;
  const [days, setDays] = useState(30);
  const { analytics, isLoading, error, notFound } = useLinkAnalytics(shortCode, days);

  if (notFound) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card>
          <CardHeader>
            <CardTitle>Link not found</CardTitle>
            <CardDescription>
              <span className="font-mono">/{shortCode}</span> does not exist, or it belongs to
              someone else.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const overview = analytics?.overview;
  const link = analytics?.link;

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">/{shortCode}</h1>
            {link !== undefined && <LinkStatusBadge link={link} />}
          </div>

          {link === undefined ? (
            <Skeleton className="mt-2 h-4 w-64" />
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">
              {link.title !== null && <span className="text-foreground">{link.title} · </span>}
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                title={link.url}
                className="hover:underline"
              >
                {truncateUrl(link.url, 56)}
              </a>
            </p>
          )}
        </div>

        {link !== undefined && (
          <div className="flex shrink-0 items-center gap-2">
            <CopyButton value={link.shortUrl} label="Copy" variant="outline" size="sm" />
            <Button variant="outline" size="sm" asChild>
              <a href={link.shortUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                Open
              </a>
            </Button>
          </div>
        )}
      </header>

      {error !== null && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total clicks"
          value={formatCount(overview?.totalClicks ?? 0)}
          icon={MousePointerClickIcon}
          isLoading={isLoading}
        />
        <StatCard
          label="Unique visitors"
          value={formatCount(overview?.uniqueVisitors ?? 0)}
          hint="By hashed IP"
          icon={UsersIcon}
          isLoading={isLoading}
        />
        <StatCard
          label="Clicks today"
          value={formatCount(overview?.clicksToday ?? 0)}
          hint="Since 00:00 UTC"
          icon={SunriseIcon}
          isLoading={isLoading}
        />
        <StatCard
          label="Top browser"
          value={overview?.topBrowser ?? '—'}
          hint="Most clicks of any browser"
          icon={CompassIcon}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Clicks over time</CardTitle>
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
            <ClicksOverTimeChart data={analytics.clicksOverTime} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {BREAKDOWNS.map(({ dimension, title }) => (
          <Card key={dimension}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics === null ? (
                <Skeleton className="h-40" />
              ) : (
                <BreakdownChart data={analytics.breakdowns[dimension]} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2">
      <Link href="/dashboard/links">
        <ArrowLeftIcon />
        All links
      </Link>
    </Button>
  );
}
