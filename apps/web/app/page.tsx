import { BarChart3Icon, LockIcon, ZapIcon } from 'lucide-react';
import Link from 'next/link';

import { ShortenForm } from '@/components/shorten-form';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: ZapIcon,
    title: 'Fast redirects',
    body: 'Every short code is cached in Redis, so a click resolves without touching the database.'
  },
  {
    icon: BarChart3Icon,
    title: 'Real analytics',
    body: 'Clicks stream through Kafka into MongoDB: browsers, devices, referrers, and daily totals.'
  },
  {
    icon: LockIcon,
    title: 'Password protection',
    body: 'Put a password on any link and visitors must enter it before the redirect happens.'
  }
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative mx-auto w-full max-w-3xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
            <div className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Short links.
                <span className="text-primary"> Powerful analytics.</span>
              </h1>
              <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
                Shorten any URL in one click. Add a custom alias or a password, then watch the
                clicks arrive in real time.
              </p>
            </div>

            <div className="mt-8">
              <ShortenForm />
            </div>

            <div className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <span>No account needed</span>
              <span aria-hidden>•</span>
              <span>Anonymous links last 2 days</span>
              <span aria-hidden>•</span>
              <Link href="/bulk" className="text-primary hover:underline">
                Shorten many at once
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-card rounded-xl border p-5 shadow-sm">
                <span className="bg-accent text-primary grid size-9 place-items-center rounded-lg">
                  <feature.icon className="size-4.5" />
                </span>
                <h2 className="mt-3 font-medium">{feature.title}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{feature.body}</p>
              </div>
            ))}
          </div>

          <div className="bg-card mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border p-6 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="font-medium">Want links that never expire?</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Create an account to manage your links and see full analytics for each one.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/register">Create free account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-6xl px-4 py-6 text-sm sm:px-6">
          Built with Next.js, Express, PostgreSQL, Redis, Kafka, and MongoDB.
        </div>
      </footer>
    </div>
  );
}
