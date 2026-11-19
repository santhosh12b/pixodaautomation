import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

export interface SendTextMessageParams {
  recipientPhone: string;
  text: string;
  accountId?: string;
}

export interface SendMediaMessageParams {
  recipientPhone: string;
  mediaUrl: string;
  caption?: string;
  mimeType?: string;
  accountId?: string;
}

export interface UnipileSendResponse {
  success: boolean;
  messageId: string;
  chatId?: string;
  raw?: unknown;
}

export class UnipileService {
  private baseUrl: string = 'https://api.unipile.com';
  private apiKey: string = '';
  private accountId: string;
  private isMock: boolean;

  constructor(options?: { mock?: boolean; dsn?: string; accountId?: string }) {
    this.isMock = options?.mock ?? (
      env.NODE_ENV === 'test' || 
      !env.UNIPILE_DSN || 
      env.UNIPILE_DSN.includes('mock') || 
      env.UNIPILE_DSN.includes('test')
    );

    const dsn = options?.dsn || env.UNIPILE_DSN || '';
    this.accountId = options?.accountId || env.UNIPILE_ACCOUNT_ID || 'mock-whatsapp-acc';

    if (dsn.includes(':')) {
      const parts = dsn.split(':');
      // Format https://domain:token
      if (parts.length >= 3) {
        this.baseUrl = `${parts[0]}:${parts[1]}`;
        this.apiKey = parts.slice(2).join(':');
      } else {
        this.baseUrl = parts[0];
        this.apiKey = parts[1];
      }
    } else {
      this.apiKey = dsn;
    }
  }

  async sendTextMessage(params: SendTextMessageParams): Promise<UnipileSendResponse> {
    if (this.isMock) {
      return {
        success: true,
        messageId: `mock_msg_${uuidv4()}`,
        chatId: `mock_chat_${params.recipientPhone.replace(/\D/g, '')}`,
        raw: { status: 'sent', mock: true },
      };
    }

    const payload = {
      account_id: params.accountId || this.accountId,
      text: params.text,
      attendees_ids: [params.recipientPhone],
    };

    const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Unipile sendTextMessage failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as { id?: string; chat_id?: string };
    return {
      success: true,
      messageId: data.id || `up_${uuidv4()}`,
      chatId: data.chat_id,
      raw: data,
    };
  }

  async sendMediaMessage(params: SendMediaMessageParams): Promise<UnipileSendResponse> {
    if (this.isMock) {
      return {
        success: true,
        messageId: `mock_media_msg_${uuidv4()}`,
        chatId: `mock_chat_${params.recipientPhone.replace(/\D/g, '')}`,
        raw: { status: 'sent', mediaUrl: params.mediaUrl, mock: true },
      };
    }

    const payload = {
      account_id: params.accountId || this.accountId,
      text: params.caption || '',
      attendees_ids: [params.recipientPhone],
      attachments: [
        {
          url: params.mediaUrl,
          mimetype: params.mimeType || 'video/mp4',
        },
      ],
    };

    const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Unipile sendMediaMessage failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as { id?: string; chat_id?: string };
    return {
      success: true,
      messageId: data.id || `up_media_${uuidv4()}`,
      chatId: data.chat_id,
      raw: data,
    };
  }

  async getChats(): Promise<Array<{ id: string; name: string; unreadCount: number }>> {
    if (this.isMock) {
      return [
        { id: 'mock_chat_1', name: 'Demo Lead WhatsApp', unreadCount: 0 },
      ];
    }

    const response = await fetch(`${this.baseUrl}/api/v1/chats?account_id=${this.accountId}`, {
      headers: {
        'X-API-KEY': this.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Unipile getChats failed (${response.status})`);
    }

    const data = await response.json() as { items?: Array<{ id: string; name: string; unread_count: number }> };
    return (data.items || []).map(c => ({
      id: c.id,
      name: c.name,
      unreadCount: c.unread_count || 0,
    }));
  }
}

export const unipileService = new UnipileService();

