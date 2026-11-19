import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().optional().default(
    process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/whatsapp_dev'
  ),
  WEBHOOK_SECRET: z.string().min(1).default('dev-webhook-secret-change-in-prod'),
  CRON_SECRET: z.string().min(1).default('dev-cron-secret-change-in-prod'),
  UNIPILE_DSN: z.string().optional().default('https://api.unipile.com:mock-token'),
  UNIPILE_ACCOUNT_ID: z.string().optional().default('mock-account-id'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Environment validation error: ${errorDetails}`);
  }
  return result.data;
}

export const env = validateEnv(process.env);

