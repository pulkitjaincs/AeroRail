import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service.js';
import { BadRequestError } from '@aerorail/errors';
import { z } from 'zod';

const searchSchema = z.object({
  from: z.string().min(2).max(10).toUpperCase(),
  to: z.string().min(2).max(10).toUpperCase(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  class: z.string().optional().transform((val) => val?.toUpperCase()),
});

const availabilitySchema = z.object({
  trainNumber: z.string().min(1),
  class: z.string().toUpperCase(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = searchSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new BadRequestError('Invalid query parameters: ' + JSON.stringify(parsed.error.format()));
      }

      const { from, to, date, class: classCode } = parsed.data;
      if (from === to) {
        throw new BadRequestError('Origin and Destination stations cannot be the same');
      }

      const results = await SearchService.searchTrains(from, to, date, classCode);
      
      res.json({
        data: results,
        meta: {
          request_id: req.headers['x-request-id'] || null,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
        errors: null,
      });
    } catch (error) {
      next(error);
    }
  }

  static async availability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = availabilitySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new BadRequestError('Invalid query parameters: ' + JSON.stringify(parsed.error.format()));
      }

      const { trainNumber, class: classCode, date } = parsed.data;
      const count = await SearchService.getAvailability(trainNumber, classCode, date);

      res.json({
        data: {
          trainNumber,
          class: classCode,
          date,
          availableSeats: count,
        },
        meta: {
          request_id: req.headers['x-request-id'] || null,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
        errors: null,
      });
    } catch (error) {
      next(error);
    }
  }
}
