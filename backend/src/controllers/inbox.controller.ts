import { Request, Response } from 'express';
import { z } from 'zod';
import { inboxService } from '../services/inbox.service.js';

const replySchema = z.object({
  text: z.string().min(1, 'Message text is required'),
});

export async function listConversationsHandler(req: Request, res: Response) {
  const conversations = await inboxService.listConversations();
  return res.status(200).json({
    status: 'ok',
    count: conversations.length,
    conversations,
  });
}

export async function getLeadMessagesHandler(req: Request, res: Response) {
  const { leadId } = req.params;
  const messages = await inboxService.getThreadForLead(leadId);

  return res.status(200).json({
    status: 'ok',
    leadId,
    count: messages.length,
    messages,
  });
}

export async function sendLeadReplyHandler(req: Request, res: Response) {
  const { leadId } = req.params;
  const parsed = replySchema.parse(req.body);

  try {
    const message = await inboxService.sendAgentReply(leadId, parsed.text);
    return res.status(200).json({
      status: 'sent',
      message,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return res.status(400).json({
      error: 'Send Failed',
      message: errorMsg,
    });
  }
}
