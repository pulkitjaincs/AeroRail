import './config/env.js'; // Load env variables first
import { initTracing } from './otel.js';
// Initialize tracing before any other setup
initTracing('service-template');

import express from 'express';
import { env } from './config/env.js';
import { logger } from '@aerorail/logger';
import { requestId, requestLogger, errorHandler } from '@aerorail/middleware';
import { Server } from 'http';

const app = express();

app.use(express.json());

// Apply global middlewares
app.use(requestId);
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'service-template',
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Hello from AeroRail Service Template!' });
});

// Error handling middleware (MUST be registered last)
app.use(errorHandler);

const server: Server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 Service started successfully');
});

// Graceful Shutdown
const shutdown = (signal: string) => {
  logger.info({ signal }, `Received ${signal}, starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed.');
    logger.info('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  });

  // Force exit after 10s if connections hang
  setTimeout(() => {
    logger.error('Force shutdown triggered due to hanging connections.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
