import type { Metadata } from 'next';

import { BulkShorten } from '@/components/bulk-shorten';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = { title: 'Bulk shorten' };

export default function BulkPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <BulkShorten />
      </main>
    </div>
  );
}
