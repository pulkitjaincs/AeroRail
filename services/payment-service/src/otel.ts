import { logger } from '@aerorail/logger';

export function initTracing(serviceName: string) {
  logger.info({ serviceName }, 'Initializing OpenTelemetry tracing (stub)...');
  // OpenTelemetry SDK implementation will be configured here later
}
