import { Router, type Request, type Response } from 'express';

import { apiConfig, rateLimits } from '../../config.js';
import { HttpError } from '../../errors.js';
import { asyncHandler, parse, shortCodeParam } from '../../http.js';
import { publishClickEvent } from '../../infrastructure/kafka/producer.js';
import { clientIp, consumeRateLimit } from '../../infrastructure/redis/rate-limit.js';
import { linkPasswordSchema } from '../links/schemas.js';
import { shortUrlFor } from '../links/service.js';
import { buildClickEvent } from './click-events.js';
import { resolveShortCode, unlockShortCode } from './service.js';
import { isValidUnlockToken, UNLOCK_QUERY_PARAM, unlockCookieName } from './unlock-tokens.js';

export const redirectRouter = Router();

redirectRouter.get(
  '/:shortCode',
  asyncHandler(async (request, response) => {
    const shortCode = shortCodeParam(request);
    const link = await resolveShortCode(shortCode);

    if (link.requiresPassword && !hasUnlockToken(request, shortCode)) {
      sendPasswordChallenge(request, response, shortCode);
      return;
    }

    publishClickEvent(buildClickEvent(request, link));
    response.redirect(302, link.longUrl);
  })
);

redirectRouter.post(
  '/:shortCode/password',
  asyncHandler(async (request, response) => {
    const shortCode = shortCodeParam(request);
    // Counted per IP and short code, so guessing one link's password cannot lock
    // a visitor out of every other protected link.
    await consumeRateLimit(rateLimits.linkPassword, `${clientIp(request)}:${shortCode}`);

    const { password } = parse(linkPasswordSchema, request.body);
    const unlocked = await unlockShortCode(shortCode, password);
    const redirectUrl = unlockRedirectUrl(unlocked.shortCode, unlocked.unlockToken);

    response.cookie(unlockCookieName(unlocked.shortCode), unlocked.unlockToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: apiConfig.NODE_ENV === 'production',
      maxAge: unlocked.expiresInSeconds * 1000,
      path: `/${unlocked.shortCode}`
    });

    response.status(200).json({
      shortCode: unlocked.shortCode,
      shortUrl: shortUrlFor(unlocked.shortCode),
      redirectUrl,
      unlockToken: unlocked.unlockToken,
      expiresInSeconds: unlocked.expiresInSeconds
    });
  })
);

/**
 * A visitor proves they already passed the challenge either with the cookie set
 * when they answered it, or with the token handed back to an API client that
 * answered it on their behalf.
 */
function hasUnlockToken(request: Request, shortCode: string): boolean {
  const queryToken = request.query[UNLOCK_QUERY_PARAM];
  const cookieToken = (request.cookies as Record<string, string | undefined> | undefined)?.[
    unlockCookieName(shortCode)
  ];
  const candidates = [typeof queryToken === 'string' ? queryToken : undefined, cookieToken];

  return candidates.some((token) => token !== undefined && isValidUnlockToken(token, shortCode));
}

/**
 * Browsers are sent to the challenge page so a protected link is usable by
 * clicking it; API clients get the `401` they can act on.
 */
function sendPasswordChallenge(request: Request, response: Response, shortCode: string): void {
  if (request.accepts(['json', 'html']) === 'html') {
    response.redirect(
      302,
      new URL(`/unlock/${shortCode}`, `${apiConfig.WEB_BASE_URL}/`).toString()
    );
    return;
  }

  throw new HttpError(401, 'LINK_PASSWORD_REQUIRED', 'This short link is password protected');
}

function unlockRedirectUrl(shortCode: string, unlockToken: string): string {
  const url = new URL(shortUrlFor(shortCode));
  url.searchParams.set(UNLOCK_QUERY_PARAM, unlockToken);
  return url.toString();
}
