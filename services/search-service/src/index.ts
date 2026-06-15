import './config/env.js'; 
import { initTracing } from './otel.js';
initTracing('search-service');

import express from 'express';
import { env } from './config/env.js';
import { logger } from '@aerorail/logger';
import { requestId, requestLogger, errorHandler } from '@aerorail/middleware';
import searchRoutes from './routes/search.routes.js';
import { checkNeo4jConnection, driver } from './config/neo4j.js';
import { redis } from './config/redis.js';
import { Server } from 'http';

const app = express();

app.use(express.json());

app.use(requestId);
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'search-service',
  });
});

app.use('/search', searchRoutes);

app.use(errorHandler);

const server: Server = app.listen(env.PORT, async () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 Search Service started successfully');
  
  await checkNeo4jConnection();
});

const shutdown = (signal: string) => {
  logger.info({ signal }, `Received ${signal}, starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      await driver.close();
      logger.info('Neo4j driver closed.');
    } catch (err) {
      logger.error({ err }, 'Error closing Neo4j driver');
    }

    try {
      await redis.quit();
      logger.info('Redis client disconnected.');
    } catch (err) {
      logger.error({ err }, 'Error disconnecting Redis');
    }

    logger.info('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Force shutdown triggered due to hanging connections.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
