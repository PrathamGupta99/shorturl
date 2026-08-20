import { LockIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { linkStatus } from '@/lib/format';
import type { Link } from '@/lib/types';

const STATUS_BADGE = {
  active: { variant: 'success', label: 'Active' },
  disabled: { variant: 'secondary', label: 'Disabled' },
  expired: { variant: 'warning', label: 'Expired' }
} as const;

/** Status plus the protected marker, shown together wherever a link is listed. */
export function LinkStatusBadge({ link }: { link: Link }) {
  const status = STATUS_BADGE[linkStatus(link)];

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={status.variant}>{status.label}</Badge>
      {link.requiresPassword && (
        <Badge variant="outline" title="Password protected">
          <LockIcon />
          <span className="sr-only">Password protected</span>
        </Badge>
      )}
    </span>
  );
}
