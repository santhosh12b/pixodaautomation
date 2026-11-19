import { describe, it, expect } from 'vitest';
import { validateEnv } from '../src/config/env.js';
import { leads, campaigns, queueJobs, messages, mediaAssets } from '../src/db/schema.js';
import { getDb } from '../src/db/client.js';

describe('Task 1: Config and Schema Foundation', () => {
  it('should validate valid environment variables', () => {
    const validConfig = {
      NODE_ENV: 'test',
      PORT: '5000',
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/whatsapp_test',
      WEBHOOK_SECRET: 'test-secret-12345',
      CRON_SECRET: 'cron-secret-12345',
      UNIPILE_DSN: 'https://api.unipile.com:test-token',
      FRONTEND_URL: 'http://localhost:5173',
      BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test'
    };

    const parsed = validateEnv(validConfig);
    expect(parsed.PORT).toBe(5000);
    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.WEBHOOK_SECRET).toBe('test-secret-12345');
  });

  it('should reject invalid environment configuration', () => {
    const invalidConfig = {
      PORT: 'not-a-number'
    };

    expect(() => validateEnv(invalidConfig)).toThrow();
  });

  it('should export all required Drizzle schema tables with core columns', () => {
    expect(leads).toBeDefined();
    expect(leads.id).toBeDefined();
    expect(leads.phone).toBeDefined();
    expect(leads.status).toBeDefined();

    expect(campaigns).toBeDefined();
    expect(campaigns.id).toBeDefined();
    expect(campaigns.messageTemplate).toBeDefined();
    expect(campaigns.status).toBeDefined();

    expect(queueJobs).toBeDefined();
    expect(queueJobs.id).toBeDefined();
    expect(queueJobs.idempotencyKey).toBeDefined();
    expect(queueJobs.status).toBeDefined();
    expect(queueJobs.type).toBeDefined();

    expect(messages).toBeDefined();
    expect(messages.id).toBeDefined();
    expect(messages.deliveryStatus).toBeDefined();

    expect(mediaAssets).toBeDefined();
    expect(mediaAssets.id).toBeDefined();
    expect(mediaAssets.blobUrl).toBeDefined();
  });

  it('should initialize database client', () => {
    const db = getDb();
    expect(db).toBeDefined();
  });
});
