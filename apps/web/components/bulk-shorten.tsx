'use client';

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { CopyButton } from '@/components/copy-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatTimeUntil, truncateUrl } from '@/lib/format';
import type { BulkLinksSummary } from '@/lib/types';

/** Matches the API's own cap so the UI can warn before the request is rejected. */
const MAX_URLS = 20;

function parseUrls(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

export function BulkShorten() {
  const { user, withAccessToken } = useAuth();
  const [raw, setRaw] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BulkLinksSummary | null>(null);

  const urls = useMemo(() => parseUrls(raw), [raw]);
  const isOverLimit = urls.length > MAX_URLS;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSummary(null);
    setIsSubmitting(true);

    try {
      setSummary(
        user === null
          ? await api.createBulkLinks(urls)
          : await withAccessToken((token) => api.createBulkLinks(urls, token))
      );
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not shorten those URLs. Try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const createdUrls = (summary?.results ?? [])
    .filter((result) => result.link !== undefined)
    .map((result) => result.link?.shortUrl)
    .filter((value): value is string => value !== undefined);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk shorten</CardTitle>
          <CardDescription>
            Paste up to {MAX_URLS} URLs, one per line.{' '}
            {user === null
              ? 'No account needed — every link created here expires in 2 days.'
              : 'Every link is saved to your dashboard and never expires on its own.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="urls">URLs</Label>
              <Textarea
                id="urls"
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                rows={8}
                spellCheck={false}
                aria-invalid={isOverLimit}
                placeholder={'https://example.com/one\nhttps://example.com/two'}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs">
                <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
                  {urls.length} URL{urls.length === 1 ? '' : 's'} detected
                  {isOverLimit ? ` — remove ${String(urls.length - MAX_URLS)} to continue` : ''}
                </span>
              </div>
            </div>

            {error !== null && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting || urls.length === 0 || isOverLimit}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {isSubmitting
                ? 'Shortening'
                : `Shorten ${String(urls.length)} URL${urls.length === 1 ? '' : 's'}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {summary !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Results
              <Badge variant="success">{summary.created} created</Badge>
              {summary.failed > 0 && <Badge variant="destructive">{summary.failed} failed</Badge>}
            </CardTitle>
            <CardDescription>
              Invalid entries are reported on their own row and never block the valid ones.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {createdUrls.length > 0 && (
              <CopyButton
                value={createdUrls.join('\n')}
                label={`Copy all ${String(createdUrls.length)} short links`}
                variant="outline"
                size="sm"
              />
            )}

            <ul className="divide-y rounded-lg border">
              {summary.results.map((result) => (
                <li
                  key={result.index}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    {result.status === 'created' ? (
                      <CheckCircle2Icon className="text-success mt-0.5 size-4 shrink-0" />
                    ) : (
                      <AlertCircleIcon className="text-destructive mt-0.5 size-4 shrink-0" />
                    )}

                    <div className="min-w-0">
                      <p className="text-muted-foreground truncate text-xs" title={result.url}>
                        {truncateUrl(result.url, 56)}
                      </p>

                      {result.link !== undefined ? (
                        <a
                          href={result.link.shortUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-mono text-sm break-all hover:underline"
                        >
                          {result.link.shortUrl.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        <p className="text-destructive text-sm">
                          {result.error?.message ?? 'Could not be shortened'}
                        </p>
                      )}
                    </div>
                  </div>

                  {result.link !== undefined && (
                    <div className="flex shrink-0 items-center gap-2">
                      {result.link.expiresAt !== null && (
                        <span className="text-muted-foreground hidden text-xs sm:inline">
                          expires in {formatTimeUntil(result.link.expiresAt)}
                        </span>
                      )}
                      <CopyButton value={result.link.shortUrl} variant="ghost" size="icon-sm" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
