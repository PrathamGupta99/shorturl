import type { PoolClient } from 'pg';

import { encodeFixedLengthBase62 } from '@url-shortener/shared';

import { apiConfig } from '../../config.js';

export const migration = {
  id: '002_pad_short_codes',
  async up(client: PoolClient): Promise<void> {
    const links = await client.query<{ id: string }>(
      'SELECT id FROM links WHERE short_code IS NOT NULL'
    );

    for (const link of links.rows) {
      const shortCode = encodeFixedLengthBase62(BigInt(link.id), apiConfig.BASE62_ALPHABET);
      await client.query('UPDATE links SET short_code = $2, updated_at = NOW() WHERE id = $1', [
        link.id,
        shortCode
      ]);
    }
  }
};
