import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load root .env file since it holds common configurations
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(), // Added for Redis Cloud URL support
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_PRIVATE_KEY_PATH: z.string(),
  JWT_PUBLIC_KEY_PATH: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables in Auth Service:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

const privateKeyPath = path.resolve(process.cwd(), parsed.data.JWT_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(process.cwd(), parsed.data.JWT_PUBLIC_KEY_PATH);

let jwtPrivateKey: string;
let jwtPublicKey: string;

try {
  jwtPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
  jwtPublicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (error) {
  console.error(`❌ Failed to read JWT keys from paths:\nPrivate: ${privateKeyPath}\nPublic: ${publicKeyPath}\nError:`, error);
  process.exit(1);
}

process.env.NODE_ENV = parsed.data.NODE_ENV;
process.env.LOG_LEVEL = parsed.data.LOG_LEVEL;

export const env = {
  ...parsed.data,
  JWT_PRIVATE_KEY: jwtPrivateKey,
  JWT_PUBLIC_KEY: jwtPublicKey,
};
