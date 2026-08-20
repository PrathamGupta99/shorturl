import { logLevel, type logCreator } from 'kafkajs';
import type { Logger } from 'pino';

const PINO_LEVELS: Record<number, 'error' | 'warn' | 'info' | 'debug'> = {
  [logLevel.NOTHING]: 'debug',
  [logLevel.ERROR]: 'error',
  [logLevel.WARN]: 'warn',
  [logLevel.INFO]: 'info',
  [logLevel.DEBUG]: 'debug'
};

/**
 * Routes kafkajs' own logs through pino so Kafka problems land in the same
 * structured log stream as everything else.
 */
export function kafkaLogCreator(logger: Logger): logCreator {
  return () =>
    ({ level, log: { message, ...rest } }) => {
      logger[PINO_LEVELS[level] ?? 'info']({ kafka: rest }, message);
    };
}
