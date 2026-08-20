import { pool } from './client.js';
import { migration as initialMigration } from './migrations/001_initial.js';
import { migration as padShortCodesMigration } from './migrations/002_pad_short_codes.js';
import { migration as shardIdSequencesMigration } from './migrations/003_shard_id_sequences.js';

const migrations = [initialMigration, padShortCodesMigration, shardIdSequencesMigration];

async function migrate(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of migrations) {
      const applied = await client.query<{ id: string }>(
        'SELECT id FROM schema_migrations WHERE id = $1',
        [migration.id]
      );

      if (applied.rowCount === 0) {
        if ('up' in migration) {
          await migration.up(client);
        } else {
          await client.query(migration.sql);
        }
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        console.log(`Applied migration ${migration.id}`);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void migrate().catch((error: unknown) => {
  console.error('Database migration failed', error);
  process.exitCode = 1;
});
