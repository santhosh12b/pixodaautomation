import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { campaignService } from '../src/services/campaign.service.js';
import { leadService } from '../src/services/lead.service.js';

describe('Task 7: Campaigns, Media Assets & Analytics APIs', () => {
  const app = createApp();

  beforeEach(() => {
    campaignService.resetMockStore();
    leadService.resetMockStore();
  });

  it('POST /api/campaigns and GET /api/campaigns should manage campaigns', async () => {
    const createRes = await request(app)
      .post('/api/campaigns')
      .send({
        name: 'Summer Splash 2026',
        description: 'Automated summer outreach',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/123',
        messageTemplate: 'Hi {{name}}, claim your discount!',
        videoDelaySeconds: 10,
        cooldownHours: 48,
        status: 'active',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.campaign.id).toBeDefined();
    expect(createRes.body.campaign.name).toBe('Summer Splash 2026');

    // List
    const listRes = await request(app).get('/api/campaigns');
    expect(listRes.status).toBe(200);
    expect(listRes.body.campaigns.length).toBeGreaterThanOrEqual(1);

    // Toggle status PATCH
    const patchRes = await request(app)
      .patch(`/api/campaigns/${createRes.body.campaign.id}`)
      .send({ status: 'paused' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.campaign.status).toBe('paused');
  });

  it('POST /api/media/upload and GET /api/media should manage promotional video library', async () => {
    const uploadRes = await request(app)
      .post('/api/media/upload')
      .send({
        title: 'Product Walkthrough',
        description: '2 min explainer',
        fileName: 'demo.mp4',
        fileBase64: Buffer.from('mock video bytes').toString('base64'),
        mimeType: 'video/mp4',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.asset.blobUrl).toBeDefined();

    const listRes = await request(app).get('/api/media');
    expect(listRes.status).toBe(200);
    expect(listRes.body.assets.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/analytics/dashboard and /api/analytics/charts should return metrics for dashboard & charts', async () => {
    const dashRes = await request(app).get('/api/analytics/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.metrics).toBeDefined();
    expect(dashRes.body.metrics.totalLeads).toBeDefined();
    expect(dashRes.body.metrics.deliveryRate).toBeDefined();

    const chartRes = await request(app).get('/api/analytics/charts');
    expect(chartRes.status).toBe(200);
    expect(Array.isArray(chartRes.body.dailyVolume)).toBe(true);
    expect(Array.isArray(chartRes.body.funnel)).toBe(true);
  });
});
