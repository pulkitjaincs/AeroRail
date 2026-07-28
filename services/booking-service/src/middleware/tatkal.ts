import { Request, Response, NextFunction } from 'express';
import { logger } from '@aerorail/logger';

export const tatkalWindowMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { quota_type } = req.body;
  
  // If not tatkal, bypass
  if (quota_type !== 'TATKAL') {
    return next();
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Tatkal opens exactly at 10 AM (10:00:00). 
  // Let's assume it closes at 12 PM for this example.
  if (currentHour < 10) {
    logger.warn('Tatkal booking attempted before window open');
    return res.status(403).json({ error: 'Tatkal booking window opens at 10:00 AM' });
  }

  next();
};
