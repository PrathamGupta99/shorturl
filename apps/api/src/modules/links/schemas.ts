import { z } from 'zod';

import {
  CUSTOM_ALIAS_MAX_LENGTH,
  CUSTOM_ALIAS_MIN_LENGTH,
  isReservedAlias,
  isValidCustomAlias
} from '@url-shortener/shared';

import { apiConfig } from '../../config.js';

/**
 * Zod still runs refinements after `.url()` has already failed, so the protocol
 * check has to tolerate a string that is not a URL at all instead of letting
 * `new URL` throw its way out as an unhandled error.
 */
function protocolOf(value: string): string | null {
  try {
    return new URL(value).protocol;
  } catch {
    return null;
  }
}

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = protocolOf(value);
    return protocol === 'http:' || protocol === 'https:';
  }, 'URL must use HTTP or HTTPS');

/**
 * Aliases are stored lower-cased so `/My-Resume` and `/my-resume` can never be
 * two different links, and reserved paths are rejected before they can shadow
 * an API route.
 */
const customAlias = z
  .string()
  .trim()
  .min(CUSTOM_ALIAS_MIN_LENGTH)
  .max(CUSTOM_ALIAS_MAX_LENGTH)
  .transform((value) => value.toLowerCase())
  .refine((value) => !isReservedAlias(value), 'Alias is reserved')
  .refine(
    isValidCustomAlias,
    'Alias may only contain letters, numbers, hyphens, and underscores, and must start and end with a letter or number'
  );

const futureDate = z.coerce
  .date()
  .refine((value) => value.getTime() > Date.now(), 'Expiry must be in the future');

/** Link passwords are only ever stored as a hash, so the length cap is bcrypt's. */
const linkPassword = z.string().min(4).max(72);

export const createLinkSchema = z.object({
  url: httpUrl,
  customAlias: customAlias.optional(),
  expiresAt: futureDate.optional(),
  password: linkPassword.optional(),
  title: z.string().trim().max(255).optional()
});

export const bulkCreateLinksSchema = z.object({
  urls: z
    .array(z.string().trim().min(1).max(2048))
    .min(1, 'At least one URL is required')
    .max(
      apiConfig.BULK_MAX_URLS,
      `At most ${apiConfig.BULK_MAX_URLS} URLs may be submitted at once`
    )
});

/** Validates one bulk item on its own so a bad URL cannot fail its neighbours. */
export const bulkItemSchema = z.object({ url: httpUrl });

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const updateLinkSchema = z
  .object({
    url: httpUrl,
    title: z.string().trim().max(255).nullable(),
    isActive: z.boolean(),
    expiresAt: z.coerce.date().nullable()
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'At least one field must be provided');

export const linkPasswordSchema = z.object({ password: z.string().min(1).max(72) });

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type BulkCreateLinksInput = z.infer<typeof bulkCreateLinksSchema>;
export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type LinkPasswordInput = z.infer<typeof linkPasswordSchema>;
