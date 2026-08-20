import type { Link } from './types';

const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const DATE_ONLY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const NUMBER = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export function formatDateTime(value: string | null): string {
  return value === null ? '—' : DATE_TIME.format(new Date(value));
}

export function formatChartDate(isoDate: string): string {
  return DATE_ONLY.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatCount(value: number): string {
  return value < 1000 ? String(value) : NUMBER.format(value);
}

export function formatShare(share: number): string {
  return `${(share * 100).toFixed(share >= 0.1 ? 0 : 1)}%`;
}

/** Trims a long URL to something that fits a table cell without wrapping. */
export function truncateUrl(url: string, maxLength = 48): string {
  if (url.length <= maxLength) {
    return url;
  }

  const withoutScheme = url.replace(/^https?:\/\//, '');
  return withoutScheme.length <= maxLength
    ? withoutScheme
    : `${withoutScheme.slice(0, maxLength - 1)}…`;
}

export type LinkStatus = 'active' | 'disabled' | 'expired';

export function linkStatus(link: Link): LinkStatus {
  if (!link.isActive) {
    return 'disabled';
  }

  if (link.expiresAt !== null && new Date(link.expiresAt) <= new Date()) {
    return 'expired';
  }

  return 'active';
}

/** Human-readable time remaining, used for the anonymous-expiry notice. */
export function formatTimeUntil(value: string | null): string {
  const target = value === null ? Number.NaN : new Date(value).getTime();

  if (Number.isNaN(target)) {
    return 'never';
  }

  const milliseconds = target - Date.now();

  if (milliseconds <= 0) {
    return 'expired';
  }

  const hours = Math.round(milliseconds / 3_600_000);

  if (hours < 1) {
    return 'under an hour';
  }
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}
