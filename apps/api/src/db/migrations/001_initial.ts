export const migration = {
  id: '001_initial',
  sql: `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE links (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      long_url TEXT NOT NULL,
      short_code VARCHAR(32),
      title VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMPTZ,
      password_hash TEXT,
      redirect_type SMALLINT NOT NULL DEFAULT 302,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT links_anonymous_expiration CHECK (NOT is_anonymous OR expires_at IS NOT NULL)
    );

    CREATE TABLE sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX links_user_id_created_at_idx ON links (user_id, created_at DESC);
    CREATE INDEX links_anonymous_expires_idx ON links (expires_at) WHERE is_anonymous = TRUE;
    CREATE UNIQUE INDEX links_short_code_idx ON links (short_code);
    CREATE INDEX sessions_user_id_idx ON sessions (user_id);
    CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
  `
};
