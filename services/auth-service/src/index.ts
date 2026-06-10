import './config/env.js';
import { initTracing } from './otel.js';
initTracing('auth-service');

import express from 'express';
import { env } from './config/env.js';
import { logger } from '@aerorail/logger';
import { requestId, requestLogger, errorHandler } from '@aerorail/middleware';
import { authRoutes } from './routes/auth.routes.js';
import { Server } from 'http';

const app = express();

app.use(express.json());

app.use(requestId);
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
  });
});

app.use('/auth', authRoutes);

app.use(errorHandler);

const server: Server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 Auth Service started successfully');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, `Received ${signal}, starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed.');
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
