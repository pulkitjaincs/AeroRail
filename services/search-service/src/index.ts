import './config/env.js'; 
import { initTracing } from './otel.js';
initTracing('search-service');

import { env } from './config/env.js';
import searchRoutes from './routes/search.routes.js';
import { checkNeo4jConnection, driver } from './config/neo4j.js';
import { startServer } from '@aerorail/server';
import { prisma } from '@aerorail/db';
import { redis } from '@aerorail/redis';

startServer({
  serviceName: 'search-service',
  port: env.PORT,
  routes: (app) => {
    app.use('/search', searchRoutes);
  },
  shutdownHandlers: [
    async () => { await driver.close(); },
    async () => { await prisma.$disconnect(); },
    async () => { await redis.quit(); },
  ],
});

checkNeo4jConnection().catch(console.error);
