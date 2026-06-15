import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load the root .env file since it holds common configurations
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // Fallback to local service .env if present

const envSchema = z.object({
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  NEO4J_URI: z.string().url(),
  NEO4J_USERNAME: z.string(),
  NEO4J_PASSWORD: z.string(),
  NEO4J_DATABASE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables in Search Service:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

// Map variables for the global middleware/logger packages
process.env.NODE_ENV = parsed.data.NODE_ENV;
process.env.LOG_LEVEL = parsed.data.LOG_LEVEL;

export const env = parsed.data;
