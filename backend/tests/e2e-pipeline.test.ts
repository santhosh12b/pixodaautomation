import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { leadService } from '../src/services/lead.service.js';
import { campaignService } from '../src/services/campaign.service.js';
import { queueService } from '../src/services/queue.service.js';
import { inboxService } from '../src/services/inbox.service.js';
import { mediaService } from '../src/services/media.service.js';

describe('Task 15: Full End-to-End Automation Pipeline', () => {
  const app = createApp();

  beforeEach(() => {
    leadService.resetMockStore();
    campaignService.resetMockStore();
    inboxService.resetMockStore();
    mediaService.resetMockStore();
  });

  it('executes complete pipeline: Google Sheet -> Lead -> Text Job -> Video Job -> Webhooks -> Inbox -> Analytics', async () => {
    // 1. Upload Promotional Video
    const videoUploadRes = await request(app)
      .post('/api/media/upload')
      .send({
        title: 'Explainer Video',
        fileName: 'explainer.mp4',
        fileBase64: Buffer.from('mock video').toString('base64'),
        mimeType: 'video/mp4',
      });
    expect(videoUploadRes.status).toBe(201);
    const videoAssetId = videoUploadRes.body.asset.id;

    // 2. Create Active Campaign with promotional video attached
    const campaignRes = await request(app)
      .post('/api/campaigns')
      .send({
        name: 'AutoSheet Outreach 2026',
        sheetUrl: 'Inbound Leads Sheet',
        messageTemplate: 'Hello {{name}}! We got your request regarding {{Topic}}.',
        videoAssetId,
        videoDelaySeconds: 0,
        cooldownHours: 24,
        status: 'active',
      });
    expect(campaignRes.status).toBe(201);
    const campaignId = campaignRes.body.campaign.id;

    // 3. Google Apps Script Webhook Posts New Lead
    const sheetLeadPayload = {
      leads: [
        {
          externalId: 'row_101',
          name: 'Jessica Jones',
          phone: '+1 (555) 777-8888',
          email: 'jessica@alias.test',
          sourceSheet: 'Inbound Leads Sheet',
          consentStatus: 'granted',
          customData: {
            Topic: 'Private Investigations',
            City: 'New York',
          },
        },
      ],
    };

    const webhookRes = await request(app)
      .post('/api/leads/webhook')
      .set('X-Webhook-Secret', 'dev-webhook-secret-change-in-prod')
      .send(sheetLeadPayload);

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.summary.ingested).toBe(1);
    const lead = webhookRes.body.leads[0];
    expect(lead.phone).toBe('+15557778888');

    // 4. Verify Duplicate Prevention on re-send
    const duplicateRes = await request(app)
      .post('/api/leads/webhook')
      .set('X-Webhook-Secret', 'dev-webhook-secret-change-in-prod')
      .send(sheetLeadPayload);
    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.summary.duplicates).toBe(1);

    // 5. Trigger Queue Processing (Step 1: Text message delivery)
    const queueStep1Res = await request(app)
      .post('/api/queue/process')
      .set('X-Cron-Secret', 'dev-cron-secret-change-in-prod')
      .send({ batchSize: 10 });

    expect(queueStep1Res.status).toBe(200);
    expect(queueStep1Res.body.result.processedCount).toBeGreaterThanOrEqual(1);

    // 6. Trigger Queue Processing (Step 2: Chained Promotional Video delivery)
    // In test environment, allow immediate processing of chained video
    queueService.resetRunAtForTesting(`lead_${lead.id}_video_${campaignId}`);
    const queueStep2Res = await request(app)
      .post('/api/queue/process')
      .set('X-Cron-Secret', 'dev-cron-secret-change-in-prod')
      .send({ batchSize: 10 });
    expect(queueStep2Res.status).toBe(200);

    // 7. Check 2-Way Inbox Conversations & Thread
    const convsRes = await request(app).get('/api/inbox/conversations');
    expect(convsRes.status).toBe(200);
    expect(convsRes.body.conversations.length).toBeGreaterThanOrEqual(1);

    // 8. Lead Replies to WhatsApp
    const inboundRes = await request(app)
      .post('/api/webhooks/unipile')
      .send({
        event: 'message_received',
        data: {
          sender_id: '+15557778888',
          text: 'Thanks Jessica here, when can we start?',
        },
      });
    expect(inboundRes.status).toBe(200);

    // 9. Agent Sends Manual Reply from Dashboard
    const replyRes = await request(app)
      .post(`/api/inbox/${lead.id}/messages`)
      .send({ text: 'Hi Jessica, we can onboard you this afternoon!' });
    expect(replyRes.status).toBe(200);
    expect(replyRes.body.message.content).toContain('onboard you this afternoon');

    // 10. Dashboard Metrics & Analytics reflect all activity
    const metricsRes = await request(app).get('/api/analytics/dashboard');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.metrics.totalLeads).toBeGreaterThanOrEqual(1);

    const chartsRes = await request(app).get('/api/analytics/charts');
    expect(chartsRes.status).toBe(200);
    expect(chartsRes.body.funnel.length).toBe(5);
  });
});

