import type { PoolClient } from 'pg';

import { pool } from '../../db/client.js';
import { isUniqueViolation } from '../../db/errors.js';
import { HttpError } from '../../errors.js';
import {
  createSession,
  createUser,
  findSessionUserByTokenHash,
  findUserByEmail,
  revokeSession,
  type PublicUser,
  toPublicUser,
  type UserRecord
} from './repository.js';
import { hashPassword, verifyPassword } from './passwords.js';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry
} from './tokens.js';
import type { LoginInput, RegisterInput } from './schemas.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    return toPublicUser(await createUser(input.email, passwordHash));
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      throw new HttpError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists'
      );
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const user = await findUserByEmail(input.email);
  const isValid = user ? await verifyPassword(input.password, user.passwordHash) : false;

  if (!user || !isValid) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  return issueTokens(user);
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const user = await findSessionUserByTokenHash(hashRefreshToken(refreshToken));

  if (!user) {
    throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const revoked = await revokeSession(client, user.sessionId);
    if (!revoked) {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }
    const tokens = await issueTokens(user, client);
    await client.query('COMMIT');
    return tokens;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function issueTokens(user: UserRecord, existingClient?: PoolClient): Promise<AuthTokens> {
  const refreshToken = createRefreshToken();
  const accessToken = createAccessToken({ sub: user.id, email: user.email });
  const sessionWriter = async (client: PoolClient): Promise<void> =>
    createSession(client, user.id, hashRefreshToken(refreshToken), refreshTokenExpiry());

  if (existingClient) {
    await sessionWriter(existingClient);
  } else {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await sessionWriter(client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return { accessToken, refreshToken };
}
