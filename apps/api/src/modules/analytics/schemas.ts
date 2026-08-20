import { z } from 'zod';

export const timeseriesQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30)
});

export const breakdownQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export type TimeseriesQuery = z.infer<typeof timeseriesQuerySchema>;
export type BreakdownQuery = z.infer<typeof breakdownQuerySchema>;
