import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';
import { messages, leads } from '../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
import { UnipileService, unipileService as defaultUnipile } from './unipile.service.js';
import { leadService } from './lead.service.js';

export interface MessageRecord {
  id: string;
  leadId: string;
  campaignId: string | null;
  unipileMessageId: string | null;
  direction: 'outbound' | 'inbound';
  type: 'text' | 'video' | 'image' | 'document';
  content: string;
  mediaUrl: string | null;
  deliveryStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  rawPayload: Record<string, unknown> | null;
  timestamp: Date;
}

export interface ConversationSummary {
  leadId: string;
  leadName: string;
  leadPhone: string;
  lastMessage: MessageRecord | null;
  unreadCount: number;
}

export class InboxService {
  private unipile: UnipileService;
  private isMockStore: boolean;
  private mockMessages: Map<string, MessageRecord> = new Map();

  constructor(options?: { unipile?: UnipileService; mockStore?: boolean }) {
    this.unipile = options?.unipile || defaultUnipile;
    this.isMockStore = options?.mockStore ?? (process.env.NODE_ENV === 'test');
  }

  async updateDeliveryStatus(unipileMessageId: string, status: 'sent' | 'delivered' | 'read' | 'failed'): Promise<boolean> {
    if (this.isMockStore) {
      for (const msg of this.mockMessages.values()) {
        if (msg.unipileMessageId === unipileMessageId) {
          msg.deliveryStatus = status;
          return true;
        }
      }
      return false;
    }

    try {
      const [updated] = await db
        .update(messages)
        .set({ deliveryStatus: status })
        .where(eq(messages.unipileMessageId, unipileMessageId))
        .returning();
      return !!updated;
    } catch {
      for (const msg of this.mockMessages.values()) {
        if (msg.unipileMessageId === unipileMessageId) {
          msg.deliveryStatus = status;
          return true;
        }
      }
      return false;
    }
  }

  async recordInboundMessage(params: {
    senderPhone: string;
    unipileMessageId?: string;
    text: string;
    rawPayload?: Record<string, unknown>;
  }): Promise<MessageRecord | null> {
    const cleanPhone = leadService.normalizePhone(params.senderPhone);
    const allLeads = await leadService.listLeads();
    const matchedLead = allLeads.find(l => l.phone === cleanPhone);

    if (!matchedLead) {
      console.warn(`Inbound message received for unknown lead phone: ${cleanPhone}`);
      return null;
    }

    const newMsg: MessageRecord = {
      id: uuidv4(),
      leadId: matchedLead.id,
      campaignId: matchedLead.campaignId,
      unipileMessageId: params.unipileMessageId || `inbound_${uuidv4()}`,
      direction: 'inbound',
      type: 'text',
      content: params.text,
      mediaUrl: null,
      deliveryStatus: 'read',
      rawPayload: params.rawPayload || null,
      timestamp: new Date(),
    };

    if (this.isMockStore) {
      this.mockMessages.set(newMsg.id, newMsg);
      return newMsg;
    }

    try {
      const [inserted] = await db.insert(messages).values({
        id: newMsg.id,
        leadId: newMsg.leadId,
        campaignId: newMsg.campaignId,
        unipileMessageId: newMsg.unipileMessageId,
        direction: 'inbound',
        type: 'text',
        content: newMsg.content,
        deliveryStatus: 'read',
        rawPayload: newMsg.rawPayload,
      }).returning();

      return (inserted as unknown as MessageRecord) || newMsg;
    } catch {
      this.mockMessages.set(newMsg.id, newMsg);
      return newMsg;
    }
  }

  async sendAgentReply(leadId: string, text: string): Promise<MessageRecord> {
    const lead = await leadService.getLeadById(leadId);
    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found`);
    }

    const unipileRes = await this.unipile.sendTextMessage({
      recipientPhone: lead.phone,
      text,
    });

    const newMsg: MessageRecord = {
      id: uuidv4(),
      leadId: lead.id,
      campaignId: lead.campaignId,
      unipileMessageId: unipileRes.messageId,
      direction: 'outbound',
      type: 'text',
      content: text,
      mediaUrl: null,
      deliveryStatus: 'sent',
      rawPayload: null,
      timestamp: new Date(),
    };

    if (this.isMockStore) {
      this.mockMessages.set(newMsg.id, newMsg);
      return newMsg;
    }

    try {
      const [inserted] = await db.insert(messages).values({
        id: newMsg.id,
        leadId: newMsg.leadId,
        campaignId: newMsg.campaignId,
        unipileMessageId: newMsg.unipileMessageId,
        direction: 'outbound',
        type: 'text',
        content: newMsg.content,
        deliveryStatus: 'sent',
      }).returning();

      return (inserted as unknown as MessageRecord) || newMsg;
    } catch {
      this.mockMessages.set(newMsg.id, newMsg);
      return newMsg;
    }
  }

  async getThreadForLead(leadId: string): Promise<MessageRecord[]> {
    if (this.isMockStore) {
      const thread: MessageRecord[] = [];
      for (const msg of this.mockMessages.values()) {
        if (msg.leadId === leadId) {
          thread.push(msg);
        }
      }
      return thread.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }

    try {
      const list = await db
        .select()
        .from(messages)
        .where(eq(messages.leadId, leadId))
        .orderBy(asc(messages.timestamp));

      return list as unknown as MessageRecord[];
    } catch {
      const thread: MessageRecord[] = [];
      for (const msg of this.mockMessages.values()) {
        if (msg.leadId === leadId) {
          thread.push(msg);
        }
      }
      return thread.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
  }

  async listConversations(): Promise<ConversationSummary[]> {
    const allLeads = await leadService.listLeads();
    const conversations: ConversationSummary[] = [];

    for (const lead of allLeads) {
      const thread = await this.getThreadForLead(lead.id);
      const lastMessage = thread.length > 0 ? thread[thread.length - 1] : null;
      const unreadCount = thread.filter(m => m.direction === 'inbound' && m.deliveryStatus !== 'read').length;

      conversations.push({
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        lastMessage,
        unreadCount,
      });
    }

    // Sort by most recent message or lead creation
    return conversations.sort((a, b) => {
      const timeA = a.lastMessage?.timestamp.getTime() || 0;
      const timeB = b.lastMessage?.timestamp.getTime() || 0;
      return timeB - timeA;
    });
  }

  createMessageMock(data: Partial<MessageRecord> & { leadId: string; content: string }): MessageRecord {
    const record: MessageRecord = {
      id: data.id || uuidv4(),
      leadId: data.leadId,
      campaignId: data.campaignId || null,
      unipileMessageId: data.unipileMessageId || `mock_msg_${uuidv4()}`,
      direction: data.direction || 'outbound',
      type: data.type || 'text',
      content: data.content,
      mediaUrl: data.mediaUrl || null,
      deliveryStatus: data.deliveryStatus || 'sent',
      rawPayload: data.rawPayload || null,
      timestamp: data.timestamp || new Date(),
    };
    this.mockMessages.set(record.id, record);
    return record;
  }

  getMessageById(id: string): MessageRecord | null {
    return this.mockMessages.get(id) || null;
  }

  resetMockStore(): void {
    this.mockMessages.clear();
  }
}

export const inboxService = new InboxService();

