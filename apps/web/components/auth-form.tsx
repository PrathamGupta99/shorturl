'use client';

import { Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { Logo } from '@/components/logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const COPY = {
  login: {
    title: 'Welcome back',
    description: 'Sign in to manage your links and analytics.',
    submit: 'Log in',
    switchPrompt: 'Need an account?',
    switchLabel: 'Sign up',
    switchHref: '/register'
  },
  register: {
    title: 'Create your account',
    description: 'Your links stay yours, and they never expire.',
    submit: 'Create account',
    switchPrompt: 'Already registered?',
    switchLabel: 'Log in',
    switchHref: '/login'
  }
} as const;

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const copy = COPY[mode];
  const router = useRouter();
  const { user, isLoading, login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Someone already signed in has nothing to do here.
  useEffect(() => {
    if (!isLoading && user !== null) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      router.replace('/dashboard');
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.');
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
          <CardHeader>
            <CardTitle className="text-xl">{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={error !== null}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'register' ? 'At least 8 characters' : ''}
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
                {copy.submit}
              </Button>
            </form>

            <p className="text-muted-foreground mt-4 text-center text-sm">
              {copy.switchPrompt}{' '}
              <Link href={copy.switchHref} className="text-primary hover:underline">
                {copy.switchLabel}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
