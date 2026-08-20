'use client';

import { LockIcon, Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Logo } from '@/components/logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, api } from '@/lib/api';

/**
 * The challenge the API redirects browsers to when a short link is password
 * protected. A correct password returns a short-lived unlock token, and the
 * browser then follows the redirect URL that carries it.
 */
export function UnlockForm({ shortCode }: { shortCode: string }) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const unlocked = await api.unlockLink(shortCode, password);
      // A full navigation, not a client route change: the destination is the
      // API's redirect, not a page in this app.
      window.location.href = unlocked.redirectUrl;
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not check that password. Try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center hover:opacity-80">
          <Logo className="text-lg" />
        </Link>

        <Card>
          <CardHeader className="text-center">
            <span className="bg-accent text-primary mx-auto grid size-11 place-items-center rounded-full">
              <LockIcon className="size-5" />
            </span>
            <CardTitle className="mt-2">This link is protected</CardTitle>
            <CardDescription>
              Enter the password for <span className="text-foreground font-mono">/{shortCode}</span>{' '}
              to continue.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkPassword">Password</Label>
                <Input
                  id="linkPassword"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoFocus
                  autoComplete="off"
                  aria-invalid={error !== null}
                />
              </div>

              {error !== null && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2Icon className="animate-spin" />}
                {isSubmitting ? 'Checking' : 'Unlock and continue'}
              </Button>
            </form>

            <p className="text-muted-foreground mt-4 text-center text-xs">
              Repeated wrong attempts are rate limited.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
