'use client';

import { ClockIcon, ExternalLinkIcon, LockIcon } from 'lucide-react';

import { CopyButton } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatTimeUntil, truncateUrl } from '@/lib/format';
import type { Link } from '@/lib/types';

/**
 * Shows a freshly created short link. Anonymous links carry a visible expiry
 * notice, because the visitor cannot manage or renew them later.
 */
export function ShortLinkResult({ link }: { link: Link }) {
  return (
    <div className="bg-card animate-in fade-in slide-in-from-bottom-2 rounded-xl border p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary font-mono text-base font-medium break-all hover:underline"
          >
            {link.shortUrl.replace(/^https?:\/\//, '')}
          </a>
          <p className="text-muted-foreground mt-1 truncate text-sm" title={link.url}>
            {truncateUrl(link.url, 64)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CopyButton value={link.shortUrl} label="Copy" variant="default" size="sm" />
          <Button variant="outline" size="sm" asChild>
            <a href={link.shortUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              Open
            </a>
          </Button>
        </div>
      </div>

      {(link.expiresAt !== null || link.requiresPassword) && (
        <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs">
          {link.expiresAt !== null && (
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-3.5" />
              {link.isAnonymous ? (
                <>Expires in {formatTimeUntil(link.expiresAt)} — sign up to keep links forever</>
              ) : (
                <>Expires {formatDateTime(link.expiresAt)}</>
              )}
            </span>
          )}
          {link.requiresPassword && (
            <span className="inline-flex items-center gap-1.5">
              <LockIcon className="size-3.5" />
              Visitors must enter the password
            </span>
          )}
        </div>
      )}
    </div>
  );
}
