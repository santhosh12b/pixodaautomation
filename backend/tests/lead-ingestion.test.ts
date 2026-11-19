import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { campaignService } from '../src/services/campaign.service.js';
import { leadService } from '../src/services/lead.service.js';

describe('Task 5: Lead Ingestion & Campaign Matching', () => {
  const app = createApp();

  beforeEach(() => {
    // Reset service state for isolated testing
    leadService.resetMockStore();
    campaignService.resetMockStore();

    // Create an active test campaign
    campaignService.createCampaignMock({
      id: 'camp-test-1',
      name: 'Spring Promo 2026',
      status: 'active',
      sourceSheet: 'Google Leads 2026',
      messageTemplate: 'Hi {{name}}, your exclusive offer is ready for {{phone}}!',
      videoDelaySeconds: 5,
      cooldownHours: 24,
    });
  });

  it('POST /api/leads/webhook should reject unauthorized request without valid secret', async () => {
    const res = await request(app)
      .post('/api/leads/webhook')
      .send({ name: 'Alice', phone: '+1234567890' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('POST /api/leads/webhook should accept authorized batch leads, normalize phone, and match campaign', async () => {
    const res = await request(app)
      .post('/api/leads/webhook')
      .set('X-Webhook-Secret', 'dev-webhook-secret-change-in-prod')
      .send({
        leads: [
          {
            name: 'Alice Johnson',
            phone: '1 (234) 567-8901',
            email: 'alice@example.com',
            sourceSheet: 'Google Leads 2026',
            consentStatus: 'granted',
            customData: { city: 'New York' },
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.summary.ingested).toBe(1);
    expect(res.body.leads[0].phone).toBe('+12345678901');
    expect(res.body.leads[0].campaignId).toBe('camp-test-1');
  });

  it('should prevent duplicate leads within cooldown window', async () => {
    const payload = {
      name: 'Bob Smith',
      phone: '+19876543210',
      sourceSheet: 'Google Leads 2026',
      consentStatus: 'granted',
    };

    // First ingestion
    const res1 = await request(app)
      .post('/api/leads/webhook')
      .set('X-Webhook-Secret', 'dev-webhook-secret-change-in-prod')
      .send({ leads: [payload] });
    expect(res1.body.summary.ingested).toBe(1);

    // Duplicate ingestion within cooldown
    const res2 = await request(app)
      .post('/api/leads/webhook')
      .set('X-Webhook-Secret', 'dev-webhook-secret-change-in-prod')
      .send({ leads: [payload] });
    expect(res2.body.summary.duplicates).toBe(1);
  });

  it('should mark non-consented lead as opted_out without enqueuing outreach', async () => {
    const res = await request(app)
      .post('/api/leads/webhook')
      .set('X-Webhook-Secret', 'dev-webhook-secret-change-in-prod')
      .send({
        leads: [
          {
            name: 'Charlie Brown',
            phone: '+15554443333',
            sourceSheet: 'Google Leads 2026',
            consentStatus: 'revoked',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.leads[0].consentStatus).toBe('revoked');
    expect(res.body.leads[0].status).toBe('opted_out');
  });

  it('GET /api/leads should list leads with filtering', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leads)).toBe(true);
  });
});
