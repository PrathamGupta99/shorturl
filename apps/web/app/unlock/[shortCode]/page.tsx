import type { Metadata } from 'next';

import { UnlockForm } from './unlock-form';

export const metadata: Metadata = { title: 'Password required' };

export default async function UnlockPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;

  return <UnlockForm shortCode={shortCode} />;
}
