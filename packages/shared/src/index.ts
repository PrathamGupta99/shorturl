import { SHORT_CODE_LENGTH } from './short-codes.js';

export * from './events.js';
export * from './kafka.js';
export * from './shards.js';
export * from './short-codes.js';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export interface HealthResponse {
  status: 'ok';
  requestId: string;
}

/**
 * Reference alphabet in plain order. The running alphabet is shuffled and comes
 * from configuration; this constant only backs the `encodeBase62` convenience
 * helper and must not be used to generate live short codes.
 */
export const BASE62_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function encodeBase62(value: bigint): string {
  return encodeBase62WithAlphabet(value, BASE62_ALPHABET);
}

export function encodeBase62WithAlphabet(value: bigint, alphabet: string): string {
  if (value < 0n) {
    throw new RangeError('Base62 can only encode non-negative values');
  }

  if (alphabet.length !== 62 || new Set(alphabet).size !== 62) {
    throw new RangeError('Base62 alphabet must contain 62 unique characters');
  }

  if (value === 0n) {
    return alphabet[0]!;
  }

  let encoded = '';
  let remainder = value;

  while (remainder > 0n) {
    const characterIndex = Number(remainder % 62n);
    encoded = alphabet[characterIndex]! + encoded;
    remainder /= 62n;
  }

  return encoded;
}

export function encodeFixedLengthBase62(
  value: bigint,
  alphabet: string,
  length = SHORT_CODE_LENGTH
): string {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new RangeError('Base62 code length must be a positive integer');
  }

  const encoded = encodeBase62WithAlphabet(value, alphabet);
  if (encoded.length > length) {
    throw new RangeError(`Value cannot be encoded in ${length} Base62 characters`);
  }

  return alphabet[0]!.repeat(length - encoded.length) + encoded;
}
