'use client';

import { Link2Icon } from 'lucide-react';
import { useState } from 'react';

import { CreateLinkDialog } from '@/components/create-link-dialog';
import { LinksTable } from '@/components/links-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinks } from '@/hooks/use-links';

const PAGE_SIZE = 20;

export default function DashboardLinksPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, reload } = useLinks(page, PAGE_SIZE);
  const links = data?.links ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Links</h1>
          <p className="text-muted-foreground text-sm">
            {data === null
              ? 'Your short links.'
              : `${String(data.total)} link${data.total === 1 ? '' : 's'} you own. Anonymous links are never listed here.`}
          </p>
        </div>
        <CreateLinkDialog onCreated={() => void reload()} />
      </header>

      {error !== null && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden py-0">
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="bg-accent text-primary grid size-10 place-items-center rounded-full">
                <Link2Icon className="size-5" />
              </span>
              <p className="font-medium">No links yet</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                Create a short link to manage it here, add a password, or watch its click analytics.
              </p>
            </div>
          ) : (
            <LinksTable links={links} onChanged={() => void reload()} />
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
