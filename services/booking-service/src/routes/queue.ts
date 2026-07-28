import { Router } from 'express';
import { redis } from '@aerorail/redis';
import { randomUUID } from 'crypto';

const router = Router();

// Endpoint to join the queue
router.post('/join', async (req, res, next) => {
  try {
    const { user_id, train_id, date } = req.body;
    
    if (!user_id || !train_id || !date) {
      return res.status(400).json({ error: 'user_id, train_id, and date are required' });
    }

    const queueKey = `queue:${train_id}:${date}`;
    
    // Check if user is already in queue
    const existingRank = await redis.zrank(queueKey, user_id);
    if (existingRank !== null) {
      return res.json({ message: 'Already in queue', position: existingRank + 1 });
    }

    // Add user to the sorted set with current timestamp as score
    const score = Date.now();
    await redis.zadd(queueKey, score, user_id);

    // Get their position (0-indexed, so we add 1)
    const position = await redis.zrank(queueKey, user_id);

    res.status(201).json({
      message: 'Joined queue successfully',
      position: position !== null ? position + 1 : 1
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint to check queue status
router.get('/status', async (req, res, next) => {
  try {
    const { user_id, train_id, date } = req.query;

    if (!user_id || !train_id || !date) {
      return res.status(400).json({ error: 'user_id, train_id, and date are required' });
    }

    const queueKey = `queue:${train_id}:${date}`;
    const position = await redis.zrank(queueKey, user_id as string);

    if (position === null) {
      return res.status(404).json({ error: 'User not found in queue' });
    }

    // In a real system, you'd have a worker popping users off the queue and
    // moving them to an 'allowed' set. For now, we just return the position.
    res.json({
      position: position + 1,
      // If position is 1 (index 0), they are at the front of the queue
      can_book: position === 0 
    });
  } catch (error) {
    next(error);
  }
});

export default router;
