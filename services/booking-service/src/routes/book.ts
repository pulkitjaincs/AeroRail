import { Router } from 'express';
import { prisma } from '@aerorail/db';
import { redlock } from '@aerorail/redis';
import { tatkalWindowMiddleware } from '../middleware/tatkal.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { randomUUID } from 'crypto';

const router = Router();

router.post(
  '/',
  idempotencyMiddleware,
  tatkalWindowMiddleware,
  async (req, res, next) => {
    try {
      const { train_id, date, origin_station, dest_station, passenger_id, berth_id, journey_type, quota_type, fare } = req.body;
      const user_id = 'test-user-123'; // Mock user id for now

      if (!train_id || !date || !berth_id || !passenger_id) {
        return res.status(400).json({ error: 'Missing required booking details' });
      }

      const lockKey = `lock:seat:${train_id}:${date}:${berth_id}`;
      
      let lock;
      try {
        // Acquire Redis lock for 5 seconds
        lock = await redlock.acquire([lockKey], 5000);
      } catch (err) {
        return res.status(409).json({ error: 'Seat temporarily unavailable or locked by another user' });
      }

      try {
        // Execute booking within a Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
          // 1. Check if the seat is already booked using FOR UPDATE to prevent race conditions
          // Note: Prisma does not have raw FOR UPDATE on relations easily, so we use raw SQL for the critical check
          const existingLegs = await tx.$queryRaw`
            SELECT * FROM "booking_legs"
            WHERE "train_id" = ${train_id}
              AND "berth_id" = ${berth_id}
              AND "seat_status" = 'CONFIRMED'
              AND "departure_dt"::date = ${new Date(date)}::date
            FOR UPDATE
          `;

          if (Array.isArray(existingLegs) && existingLegs.length > 0) {
            throw new Error('SEAT_ALREADY_BOOKED');
          }

          // 2. Create the booking record
          const booking_id = randomUUID();
          const pnr = `PNR${Math.floor(Math.random() * 1000000000)}`;

          const booking = await tx.bookings.create({
            data: {
              booking_id,
              pnr,
              user_id,
              journey_type: journey_type || 'ONE_WAY',
              quota_type: quota_type || 'GENERAL',
              total_fare: fare || 100,
              updated_at: new Date(),
            }
          });

          // 3. Create the booking leg (reserving the seat)
          const leg = await tx.booking_legs.create({
            data: {
              leg_id: randomUUID(),
              booking_id,
              leg_sequence: 1,
              train_id,
              origin_station,
              dest_station,
              departure_dt: new Date(date),
              arrival_dt: new Date(date), // simplistic assumption
              berth_id,
              passenger_id,
              seat_status: 'CONFIRMED',
              fare: fare || 100
            }
          });

          return { booking, leg };
        });

        // Release the Redis lock immediately upon success
        await lock.release();

        return res.status(201).json({
          message: 'Booking successful',
          pnr: result.booking.pnr,
          booking_id: result.booking.booking_id
        });
      } catch (txError: any) {
        // Release the Redis lock upon failure
        await lock.release();

        if (txError.message === 'SEAT_ALREADY_BOOKED') {
          return res.status(409).json({ error: 'Seat has just been booked by someone else' });
        }

        throw txError;
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
