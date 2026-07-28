import { Redis } from 'ioredis';
import Redlock from 'redlock';
import { logger } from '@aerorail/logger';

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, keyPrefix: 'aerorail:' })
  : new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    keyPrefix: 'aerorail:',
  });

redis.on('connect', () => {
  logger.info('🔌 Connected to Redis Cloud successfully (Prefix: aerorail:)');
});

redis.on('error', (err) => {
  logger.error({ err }, '❌ Redis connection error');
});

export const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200,
});
