import neo4j from 'neo4j-driver';
import { env } from './env.js';
import { logger } from '@aerorail/logger';

export const driver = neo4j.driver(
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
    logger.error({ error }, '❌ Failed to connect to Neo4j Database');
    return false;
  }
};
