import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { leadService } from '../src/services/lead.service.js';
import { inboxService } from '../src/services/inbox.service.js';

describe('Task 6: Unipile Webhooks & 2-Way Inbox', () => {
  const app = createApp();

  beforeEach(() => {
    leadService.resetMockStore();
    inboxService.resetMockStore();
  });

  it('POST /api/webhooks/unipile should process delivery status update', async () => {
    // Seed a mock message first
    const msg = inboxService.createMessageMock({
      unipileMessageId: 'up_msg_12345',
      leadId: 'lead-test-1',
      direction: 'outbound',
      type: 'text',
      content: 'Hello World',
      deliveryStatus: 'sent',
    });

    const res = await request(app)
      .post('/api/webhooks/unipile')
      .send({
        event: 'message_status',
        data: {
          message_id: 'up_msg_12345',
          status: 'read',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processed');

    const updated = inboxService.getMessageById(msg.id);
    expect(updated?.deliveryStatus).toBe('read');
  });

  it('POST /api/webhooks/unipile should record inbound lead reply', async () => {
    // Create lead with phone
    await leadService.ingestBatch([
      { name: 'Diana Prince', phone: '+15551234567', sourceSheet: 'Sheet 1' },
    ]);
    const [lead] = await leadService.listLeads();

    const res = await request(app)
      .post('/api/webhooks/unipile')
      .send({
        event: 'message_received',
        data: {
          message_id: 'inbound_up_999',
          sender_id: '+15551234567',
          text: 'I am interested, tell me more!',
        },
      });

    expect(res.status).toBe(200);

    const thread = await inboxService.getThreadForLead(lead.id);
    expect(thread.length).toBeGreaterThanOrEqual(1);
    const inbound = thread.find(m => m.direction === 'inbound');
    expect(inbound).toBeDefined();
    expect(inbound?.content).toBe('I am interested, tell me more!');
  });

  it('GET /api/inbox/conversations and POST reply should manage 2-way chat', async () => {
    await leadService.ingestBatch([
      { name: 'Bruce Wayne', phone: '+15559876543', sourceSheet: 'Sheet 1' },
    ]);
    const [lead] = await leadService.listLeads();

    // Agent sends manual reply
    const replyRes = await request(app)
      .post(`/api/inbox/${lead.id}/messages`)
      .send({ text: 'Hello Bruce, our team is available right now.' });

    expect(replyRes.status).toBe(200);
    expect(replyRes.body.status).toBe('sent');
    expect(replyRes.body.message.content).toContain('available right now');

    // List conversations
    const convRes = await request(app).get('/api/inbox/conversations');
    expect(convRes.status).toBe(200);
    expect(Array.isArray(convRes.body.conversations)).toBe(true);
    expect(convRes.body.conversations.length).toBeGreaterThanOrEqual(1);
  });
});

