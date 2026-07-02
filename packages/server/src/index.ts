import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from '@aerorail/logger';
import { requestId, requestLogger, errorHandler } from '@aerorail/middleware';
import { Server } from 'http';

export interface ServerOptions {
  serviceName: string;
  port: number | string;
  routes: (app: Express) => void;
  shutdownHandlers?: Array<() => Promise<void>>;
}

export const startServer = ({ serviceName, port, routes, shutdownHandlers = [] }: ServerOptions): Server => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 100, 
    standardHeaders: 'draft-7',
    legacyHeaders: false, 
  }));

  app.use(express.json());
  app.use(requestId);
  app.use(requestLogger);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: serviceName,
    });
  });

  routes(app);

  app.use(errorHandler);

  const server = app.listen(port, () => {
    logger.info({ port, env: process.env.NODE_ENV }, `🚀 ${serviceName} started successfully`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, `Received ${signal}, starting graceful shutdown...`);

    // HTTP Server close
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed.');
        resolve();
      });
    });

    // Custom shutdown handlers (e.g. Prisma, Redis, Neo4j)
    for (const handler of shutdownHandlers) {
      try {
        await handler();
      } catch (err) {
        logger.error({ err }, 'Error during shutdown handler');
      }
    }

    logger.info('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
};
