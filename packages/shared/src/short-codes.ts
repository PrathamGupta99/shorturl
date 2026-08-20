/**
 * Rules shared by the API and the web app for the path segment that identifies
 * a short link. Generated codes are fixed-length Base62, custom aliases are the
 * human-readable alternative, and both live in the same `links.short_code`
 * column, so one pattern has to accept both.
 */

/** Width of a generated Base62 short code. */
export const SHORT_CODE_LENGTH = 6;

export const CUSTOM_ALIAS_MIN_LENGTH = 3;
export const CUSTOM_ALIAS_MAX_LENGTH = 32;

/** Matches a generated Base62 code or a custom alias. */
export const SHORT_CODE_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]{1,30})[a-zA-Z0-9]$/;

/** Matches a custom alias, which additionally has a minimum length. */
export const CUSTOM_ALIAS_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,30})[a-z0-9]$/;

/**
 * Path segments the API serves itself, or that browsers request on their own.
 * They can never be handed out as aliases because the redirect route would
 * never be reached for them.
 */
export const RESERVED_ALIASES: readonly string[] = [
  'admin',
  'api',
  'apple-touch-icon.png',
  'bulk',
  'dashboard',
  'favicon.ico',
  'health',
  'login',
  'logout',
  'me',
  'metrics',
  'register',
  'robots.txt',
  'settings',
  'sitemap.xml',
  'static',
  'unlock',
  'v1'
];

export function isReservedAlias(alias: string): boolean {
  return RESERVED_ALIASES.includes(alias.toLowerCase());
}

export function isValidShortCode(value: string): boolean {
  return value.length <= CUSTOM_ALIAS_MAX_LENGTH && SHORT_CODE_PATTERN.test(value);
}

export function isValidCustomAlias(value: string): boolean {
  return (
    value.length >= CUSTOM_ALIAS_MIN_LENGTH &&
    value.length <= CUSTOM_ALIAS_MAX_LENGTH &&
    CUSTOM_ALIAS_PATTERN.test(value) &&
    !isReservedAlias(value)
  );
}
