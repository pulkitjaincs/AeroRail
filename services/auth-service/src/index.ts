import './config/env.js';
import { initTracing } from './otel.js';
initTracing('auth-service');

import { env } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { startServer } from '@aerorail/server';
import { prisma } from '@aerorail/db';
import { redis } from '@aerorail/redis';

startServer({
  serviceName: 'auth-service',
  port: env.PORT,
  routes: (app) => {
    app.use('/auth', authRoutes);
  },
  shutdownHandlers: [
    async () => { await prisma.$disconnect(); },
    async () => { await redis.quit(); },
  ],
});
