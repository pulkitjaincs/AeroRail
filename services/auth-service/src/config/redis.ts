import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '@aerorail/logger';

export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, keyPrefix: 'aerorail:' })
  : new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    keyPrefix: 'aerorail:',
  });

redis.on('connect', () => {
  logger.info('🔌 Connected to Redis Cloud successfully (Prefix: aerorail:)');
});

redis.on('error', (err) => {
  logger.error({ err }, '❌ Redis connection error');
});
