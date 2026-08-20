'use client';

import {
  BarChart3Icon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PowerIcon,
  PowerOffIcon,
  Trash2Icon
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { CopyButton } from '@/components/copy-button';
import { LinkStatusBadge } from '@/components/link-status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, truncateUrl } from '@/lib/format';
import type { Link as ShortLink } from '@/lib/types';

export function LinksTable({ links, onChanged }: { links: ShortLink[]; onChanged: () => void }) {
  const { withAccessToken } = useAuth();
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const run = async (
    shortCode: string,
    action: (token: string) => Promise<unknown>,
    successMessage: string
  ): Promise<void> => {
    setBusyCode(shortCode);

    try {
      await withAccessToken(action);
      toast.success(successMessage);
      onChanged();
    } catch (caught: unknown) {
      toast.error(caught instanceof ApiError ? caught.message : 'That action failed.');
    } finally {
      setBusyCode(null);
    }
  };

  const toggleActive = (link: ShortLink): Promise<void> =>
    link.isActive
      ? run(link.shortCode, (token) => api.disableLink(link.shortCode, token), 'Link disabled')
      : run(
          link.shortCode,
          (token) => api.updateLink(link.shortCode, { isActive: true }, token),
          'Link enabled'
        );

  const remove = (link: ShortLink): void => {
    if (!window.confirm(`Delete ${link.shortUrl}? Visitors will get a 404.`)) {
      return;
    }

    void run(link.shortCode, (token) => api.deleteLink(link.shortCode, token), 'Link deleted');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Short link</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {links.map((link) => (
          <TableRow key={link.id} data-busy={busyCode === link.shortCode ? '' : undefined}>
            <TableCell>
              <div className="flex items-center gap-1">
                <a
                  href={link.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-mono text-sm hover:underline"
                >
                  /{link.shortCode}
                </a>
                <CopyButton value={link.shortUrl} variant="ghost" size="icon-sm" />
              </div>
              {link.title !== null && (
                <p className="text-muted-foreground mt-0.5 text-xs">{link.title}</p>
              )}
            </TableCell>

            <TableCell className="max-w-[18rem]">
              <span className="text-muted-foreground text-sm" title={link.url}>
                {truncateUrl(link.url, 44)}
              </span>
            </TableCell>

            <TableCell>
              <LinkStatusBadge link={link} />
            </TableCell>

            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
              {formatDateTime(link.createdAt)}
            </TableCell>

            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon-sm" asChild title="Analytics">
                  <Link href={`/dashboard/links/${link.shortCode}`}>
                    <BarChart3Icon />
                    <span className="sr-only">Analytics for {link.shortCode}</span>
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busyCode === link.shortCode}
                      title="More actions"
                    >
                      <MoreHorizontalIcon />
                      <span className="sr-only">More actions for {link.shortCode}</span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={link.shortUrl} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon />
                        Open link
                      </a>
                    </DropdownMenuItem>

                    <DropdownMenuItem onSelect={() => void toggleActive(link)}>
                      {link.isActive ? <PowerOffIcon /> : <PowerIcon />}
                      {link.isActive ? 'Disable' : 'Enable'}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem variant="destructive" onSelect={() => remove(link)}>
                      <Trash2Icon />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
