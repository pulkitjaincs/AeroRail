import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().url().optional(), // Optional for the base template
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

// Write back default values to process.env so that shared packages (like logger) can read them correctly.
process.env.NODE_ENV = parsed.data.NODE_ENV;
process.env.LOG_LEVEL = parsed.data.LOG_LEVEL;

export const env = parsed.data;
