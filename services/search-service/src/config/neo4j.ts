import neo4j, { Driver } from 'neo4j-driver';
import { env } from './env.js';
import { logger } from '@aerorail/logger';

export let driver: Driver = neo4j.driver(
  env.NEO4J_URI,
  neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD),
  {
    maxConnectionPoolSize: 50,
    connectionTimeout: 10000,
  }
);

export const checkNeo4jConnection = async (): Promise<boolean> => {
  try {
    await driver.verifyConnectivity();
    logger.info('🔌 Connected to Neo4j Graph Database successfully');
    return true;
  } catch (error) {
    logger.warn('⚠️ Failed to connect to cloud Neo4j instance. Falling back to local...');
    try {
      driver = neo4j.driver(
        'neo4j://localhost:7687',
        neo4j.auth.basic('neo4j', 'password'),
        {
          maxConnectionPoolSize: 50,
          connectionTimeout: 5000,
        }
      );
      await driver.verifyConnectivity();
      logger.info('🔌 Connected to local Neo4j Graph Database successfully');
      return true;
    } catch (localError) {
      logger.error({ error: localError }, '❌ Failed to connect to local Neo4j Database too');
      return false;
    }
  }
};
