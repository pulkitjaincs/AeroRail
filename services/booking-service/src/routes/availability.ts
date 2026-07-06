import { Router } from 'express';
import { prisma } from '@aerorail/db';

const router = Router();

router.get('/availability', async (req, res, next) => {
  try {
    const { train_id, date, origin_station, dest_station } = req.query;

    if (!train_id || !date) {
      return res.status(400).json({ error: 'train_id and date are required' });
    }

    // Parse date to start and end of day for querying
    const queryDate = new Date(date as string);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    // Get all coaches for the train
    const coaches = await prisma.coaches.findMany({
      where: { train_id: train_id as string },
      include: { berths: true }
    });

    const allBerths = coaches.flatMap(c => c.berths);

    // Find any booking legs that overlap with this train and date
    const bookedLegs = await prisma.booking_legs.findMany({
      where: {
        train_id: train_id as string,
        departure_dt: {
          gte: startOfDay,
          lte: endOfDay
        },
        seat_status: 'CONFIRMED'
      }
    });

    const bookedBerthIds = new Set(bookedLegs.map(leg => leg.berth_id).filter(id => id !== null));

    const availableBerths = allBerths.filter(b => !bookedBerthIds.has(b.berth_id));

    res.json({
      train_id,
      date,
      total_seats: allBerths.length,
      available_seats: availableBerths.length,
      available_berths: availableBerths
    });
  } catch (error) {
    next(error);
  }
});

export default router;
