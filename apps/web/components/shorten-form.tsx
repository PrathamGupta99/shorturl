'use client';

import { ChevronDownIcon, Loader2Icon, LinkIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { ShortLinkResult } from '@/components/short-link-result';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import type { CreateLinkRequest, Link } from '@/lib/types';

/**
 * The landing-page shortener. It works without an account, and sends the bearer
 * token when there is one so the resulting link is owned and never expires.
 */
export function ShortenForm() {
  const { user, withAccessToken } = useAuth();
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<Link | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const body: CreateLinkRequest = { url: url.trim() };

    if (customAlias.trim() !== '') {
      body.customAlias = customAlias.trim();
    }
    if (password !== '') {
      body.password = password;
    }

    try {
      const created =
        user === null
          ? await api.createLink(body)
          : await withAccessToken((token) => api.createLink(body, token));

      setLink(created.link);
      setUrl('');
      setCustomAlias('');
      setPassword('');
      setShowOptions(false);
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not shorten that URL. Try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <div className="bg-card flex flex-col gap-2 rounded-xl border p-2 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <LinkIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              type="url"
              inputMode="url"
              required
              placeholder="Paste a long URL, e.g. https://example.com/a/very/long/path"
              aria-label="Long URL"
              aria-invalid={error !== null}
              className="h-11 border-0 pl-9 shadow-none focus-visible:ring-0"
            />
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting} className="sm:w-auto">
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {isSubmitting ? 'Shortening' : 'Shorten URL'}
          </Button>
        </div>

        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setShowOptions((open) => !open)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            aria-expanded={showOptions}
          >
            <ChevronDownIcon
              className={cn('size-4 transition-transform', showOptions && 'rotate-180')}
            />
            Custom alias and password
          </button>

          {user === null && (
            <span className="text-muted-foreground hidden text-xs sm:inline">
              Links made without an account expire in 2 days
            </span>
          )}
        </div>

        {showOptions && (
          <div className="bg-muted/40 animate-in fade-in slide-in-from-top-1 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customAlias">Custom alias</Label>
              <Input
                id="customAlias"
                value={customAlias}
                onChange={(event) => setCustomAlias(event.target.value)}
                placeholder="my-resume"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-muted-foreground text-xs">
                3–32 characters: letters, numbers, hyphens, underscores.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkPassword">Password (optional)</Label>
              <Input
                id="linkPassword"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Require a password to open"
                autoComplete="new-password"
              />
              <p className="text-muted-foreground text-xs">
                Visitors must enter this before being redirected.
              </p>
            </div>
          </div>
        )}
      </form>

      {error !== null && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {link !== null && <ShortLinkResult link={link} />}
    </div>
  );
}
