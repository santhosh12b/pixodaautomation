import { Request, Response } from 'express';
import { inboxService } from '../services/inbox.service.js';

export async function unipileWebhookHandler(req: Request, res: Response) {
  const body = req.body || {};
  const event = body.event || body.type;
  const data = body.data || body;

  try {
    // 1. Message delivery status updates (sent, delivered, read, failed)
    if (event === 'message_status' || event === 'message.status' || data.status) {
      const messageId = data.message_id || data.id || data.unipile_message_id;
      const status = data.status?.toLowerCase();

      if (messageId && ['sent', 'delivered', 'read', 'failed'].includes(status)) {
        await inboxService.updateDeliveryStatus(messageId, status as 'sent' | 'delivered' | 'read' | 'failed');
      }
    }

    // 2. Inbound messages from leads
    if (event === 'message_received' || event === 'message.received' || event === 'new_message') {
      const senderPhone = data.sender_id || data.from || data.sender?.phone_number;
      const text = data.text || data.content || data.message || '';
      const messageId = data.message_id || data.id;

      if (senderPhone && text) {
        await inboxService.recordInboundMessage({
          senderPhone,
          unipileMessageId: messageId,
          text,
          rawPayload: body,
        });
      }
    }

    return res.status(200).json({ status: 'processed' });
  } catch (err) {
    console.error('Error handling Unipile webhook:', err);
    return res.status(200).json({ status: 'ignored', error: String(err) });
  }
}
