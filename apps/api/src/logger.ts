import pino from 'pino';

export const logger = pino({
  name: 'url-shortener-api',
  level: process.env.LOG_LEVEL ?? 'info'
});
