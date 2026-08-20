import { SHORT_CODE_LENGTH } from './short-codes.js';

/**
 * Total number of ids a fixed-length Base62 code can represent. A 6-character
 * code covers 62^6 = 56,800,235,584 ids.
 */
export const SHORT_CODE_SPACE = 62n ** BigInt(SHORT_CODE_LENGTH);

export interface ShardRange {
  /** 1-based shard number, matching the `SHARD_ID` env var. */
  shardId: number;
  /** First id this shard may issue, inclusive. */
  start: bigint;
  /** Last id this shard may issue, inclusive. */
  end: bigint;
  /** How many ids the shard owns. */
  size: bigint;
}

export const MAX_SHARD_COUNT = 64;

/**
 * Splits the whole short-code space into `shardCount` contiguous blocks and
 * returns the block belonging to `shardId`.
 *
 * Each id-generating instance owns one block, so two instances can never mint
 * the same id and no per-insert coordination between them is needed. Boundaries
 * come from integer division of the total space, which keeps the blocks equal
 * to within one id and leaves no gaps between them.
 */
export function shardRange(shardId: number, shardCount: number): ShardRange {
  assertShardConfig(shardId, shardCount);

  const index = BigInt(shardId - 1);
  const count = BigInt(shardCount);
  const start = (index * SHORT_CODE_SPACE) / count;
  const end = ((index + 1n) * SHORT_CODE_SPACE) / count - 1n;

  return { shardId, start, end, size: end - start + 1n };
}

/** Every shard's range, in order. Useful for migrations and for diagnostics. */
export function allShardRanges(shardCount: number): ShardRange[] {
  return Array.from({ length: shardCount }, (_unused, index) => shardRange(index + 1, shardCount));
}

export function assertShardConfig(shardId: number, shardCount: number): void {
  if (!Number.isSafeInteger(shardCount) || shardCount < 1 || shardCount > MAX_SHARD_COUNT) {
    throw new RangeError(`Shard count must be an integer between 1 and ${MAX_SHARD_COUNT}`);
  }

  if (!Number.isSafeInteger(shardId) || shardId < 1 || shardId > shardCount) {
    throw new RangeError(`Shard id must be an integer between 1 and the shard count (${shardCount})`);
  }
}

/** Name of the PostgreSQL sequence that issues ids for one shard. */
export function shardSequenceName(shardId: number): string {
  return `link_id_seq_${String(shardId)}`;
}
