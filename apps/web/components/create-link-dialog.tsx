'use client';

import { Loader2Icon, PlusIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CreateLinkRequest } from '@/lib/types';

/**
 * Creates an owned link. Unlike the landing-page form this one also accepts a
 * title and an expiry date, both of which only make sense for links a user can
 * come back and manage.
 */
export function CreateLinkDialog({ onCreated }: { onCreated: () => void }) {
  const { withAccessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = (): void => {
    setUrl('');
    setTitle('');
    setCustomAlias('');
    setPassword('');
    setExpiresAt('');
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const body: CreateLinkRequest = { url: url.trim() };

    if (title.trim() !== '') {
      body.title = title.trim();
    }
    if (customAlias.trim() !== '') {
      body.customAlias = customAlias.trim();
    }
    if (password !== '') {
      body.password = password;
    }
    if (expiresAt !== '') {
      // `datetime-local` has no timezone, so it is read as local time and sent
      // as the matching instant.
      body.expiresAt = new Date(expiresAt).toISOString();
    }

    try {
      const { link } = await withAccessToken((token) => api.createLink(body, token));
      toast.success('Short link created', { description: link.shortUrl });
      reset();
      setIsOpen(false);
      onCreated();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create that link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Create short link
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create short link</DialogTitle>
          <DialogDescription>
            Links you create while signed in belong to you and never expire unless you set a date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="createUrl">Destination URL</Label>
            <Input
              id="createUrl"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              autoFocus
              placeholder="https://example.com/a/very/long/path"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="createTitle">Title (optional)</Label>
            <Input
              id="createTitle"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Spring campaign"
              maxLength={255}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="createAlias">Custom alias</Label>
              <Input
                id="createAlias"
                value={customAlias}
                onChange={(event) => setCustomAlias(event.target.value)}
                placeholder="my-resume"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="createPassword">Password</Label>
              <Input
                id="createPassword"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Optional"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="createExpiry">Expires at (optional)</Label>
            <Input
              id="createExpiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              After this moment the link returns 410 Gone instead of redirecting.
            </p>
          </div>

          {error !== null && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              Create link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
