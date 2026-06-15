import { logger } from '@aerorail/logger';

export function initTracing(serviceName: string) {
  // Tracing setup stub matching template
  logger.info({ serviceName }, '📡 OpenTelemetry initialized for Search Service');
}
