import { Request, Response, NextFunction } from 'express';
import { redis } from '@aerorail/redis';
import { logger } from '@aerorail/logger';

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'idempotency-key header is required' });
  }

  try {
    const cachedResponse = await redis.get(`idempotency:${idempotencyKey}`);

    if (cachedResponse) {
      logger.info({ idempotencyKey }, 'Returning cached idempotent response');
      const parsed = JSON.parse(cachedResponse);
      return res.status(parsed.status).json(parsed.body);
    }

    // Intercept the response to save it in Redis
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Save response to redis for 24 hours
      const responseData = {
        status: res.statusCode,
        body
      };
      
      redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(responseData))
        .catch((err: any) => logger.error({ err }, 'Failed to save idempotency key to Redis'));

      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};
