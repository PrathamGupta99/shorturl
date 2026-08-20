import pino from 'pino';

export const logger = pino({
  name: 'analytics-worker',
  level: process.env.LOG_LEVEL ?? 'info'
});
