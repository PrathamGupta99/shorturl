'use client';

import { LayoutDashboardIcon, LogOutIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';

export function SiteHeader() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const signOut = async (): Promise<void> => {
    await logout();
    router.push('/');
  };

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="hover:opacity-80">
          <Logo />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/bulk">Bulk shorten</Link>
          </Button>

          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : user === null ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboardIcon />
                  Dashboard
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void signOut()}
                aria-label="Log out"
                title={`Log out ${user.email}`}
              >
                <LogOutIcon />
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
