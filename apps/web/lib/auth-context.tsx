'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

import { api, ApiError } from './api';
import type { AuthTokens, AuthUser } from './types';

/**
 * Tokens live in `localStorage`, which is good enough for this demo: it keeps
 * the API stateless and survives a page reload. A production build would move
 * the refresh token into an httpOnly cookie.
 */
const STORAGE_KEY = 'url-shortener.auth';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** `true` until the stored session has been checked on first load. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Runs an API call with a valid access token, refreshing once and retrying if
   * the token has expired.
   */
  withAccessToken: <T>(call: (accessToken: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    return typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string'
      ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Held in a ref as well as storage so a refresh mid-render always sees the
  // newest tokens without waiting for a re-render.
  const session = useRef<StoredSession | null>(null);

  const persist = useCallback((tokens: StoredSession | null) => {
    session.current = tokens;

    if (tokens === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    }
  }, []);

  useEffect(() => {
    const stored = readStoredSession();
    session.current = stored;

    if (stored === null) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const restore = async (): Promise<void> => {
      try {
        const { user: current } = await api.me(stored.accessToken);
        if (!cancelled) {
          setUser(current);
        }
        return;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          return;
        }
      }

      // The access token expired while the tab was closed; the refresh token
      // usually still has days left on it.
      try {
        const tokens = await api.refresh(stored.refreshToken);
        persist(tokens);
        const { user: current } = await api.me(tokens.accessToken);
        if (!cancelled) {
          setUser(current);
        }
      } catch {
        persist(null);
      }
    };

    void restore().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [persist]);

  const startSession = useCallback(
    async (tokens: AuthTokens) => {
      persist(tokens);
      const { user: current } = await api.me(tokens.accessToken);
      setUser(current);
    },
    [persist]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      await startSession(await api.login(email, password));
    },
    [startSession]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await api.register(email, password);
      await startSession(await api.login(email, password));
    },
    [startSession]
  );

  const logout = useCallback(async () => {
    const current = session.current;

    if (current !== null) {
      // A failed logout must not trap the user in a signed-in UI, so the local
      // session is cleared either way.
      await api.logout(current.accessToken, current.refreshToken).catch(() => undefined);
    }

    persist(null);
    setUser(null);
  }, [persist]);

  const withAccessToken = useCallback(
    async <T,>(call: (accessToken: string) => Promise<T>): Promise<T> => {
      const current = session.current;

      if (current === null) {
        throw new ApiError(401, 'UNAUTHORIZED', 'You need to sign in again');
      }

      try {
        return await call(current.accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }
      }

      try {
        const tokens = await api.refresh(current.refreshToken);
        persist(tokens);
        return await call(tokens.accessToken);
      } catch (error) {
        persist(null);
        setUser(null);
        throw error instanceof ApiError
          ? error
          : new ApiError(401, 'UNAUTHORIZED', 'Your session has expired');
      }
    },
    [persist]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, register, logout, withAccessToken }),
    [user, isLoading, login, register, logout, withAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
