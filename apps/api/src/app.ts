import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { pinoHttp } from 'pino-http';

import { apiConfig } from './config.js';
import { HttpError } from './errors.js';
import { logger } from './logger.js';
import { accountAnalyticsRouter } from './modules/analytics/account-routes.js';
import { authRouter } from './modules/auth/routes.js';
import { linksRouter } from './modules/links/routes.js';
import { redirectRouter } from './modules/redirects/routes.js';

function requestIdFor(request: Request): string {
  return typeof request.id === 'string' ? request.id : 'unknown';
}

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    pinoHttp({
      logger,
      genReqId: (request: IncomingMessage, response: ServerResponse): string => {
        const requestId = request.headers['x-request-id'];
        const id = typeof requestId === 'string' ? requestId : randomUUID();
        response.setHeader('x-request-id', id);
        return id;
      }
    })
  );
  // Credentials are allowed so the browser can carry the link-unlock cookie
  // when the web app and the API share a site.
  app.use(cors({ origin: apiConfig.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/v1/auth', authRouter);
  app.use('/v1/analytics', accountAnalyticsRouter);
  app.use('/v1/links', linksRouter);

  app.get('/health', (request, response) => {
    response.status(200).json({ status: 'ok', requestId: requestIdFor(request) });
  });

  app.use(redirectRouter);

  app.use((_request, _response, next) => {
    next(new HttpError(404, 'NOT_FOUND', 'Route not found'));
  });

  app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
    void _next;
    const knownError = error instanceof HttpError ? error : undefined;
    const statusCode = knownError?.statusCode ?? 500;
    const code = knownError?.code ?? 'INTERNAL_SERVER_ERROR';
    const message = knownError?.message ?? 'Internal server error';
    const requestId = requestIdFor(request);

    request.log.error({ err: error, requestId }, 'Request failed');
    response.status(statusCode).json({ error: { code, message, requestId } });
  });

  return app;
}
