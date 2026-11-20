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
  private baseUrl: string = 'https://api52.unipile.com:18234';
  private apiKey: string = '';
  private accountId: string;
  private isMock: boolean;

  constructor(options?: { mock?: boolean; dsn?: string; apiKey?: string; accountId?: string }) {
    this.isMock = options?.mock ?? (
      env.NODE_ENV === 'test' || 
      (!process.env.UNIPILE_API_KEY && (!env.UNIPILE_DSN || env.UNIPILE_DSN.includes('mock')))
    );

    const dsn = options?.dsn || process.env.UNIPILE_DSN || env.UNIPILE_DSN || 'https://api52.unipile.com:18234';
    this.accountId = options?.accountId || process.env.UNIPILE_ACCOUNT_ID || env.UNIPILE_ACCOUNT_ID || 'XtNydP-1SqCjFa49UP-KeA';
    this.apiKey = options?.apiKey || process.env.UNIPILE_API_KEY || (env as Record<string, any>).UNIPILE_API_KEY || '';

    let base = dsn.trim();
    if (base && !base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`;
    }
    this.baseUrl = base || 'https://api52.unipile.com:18234';
  }

  private formatRecipient(phone: string): string {
    const clean = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    return clean.includes('@') ? clean : `${clean}@s.whatsapp.net`;
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

    const attendeeId = this.formatRecipient(params.recipientPhone);
    const payload = {
      account_id: params.accountId || this.accountId,
      text: params.text,
      attendees_ids: [attendeeId],
    };

    const response = await fetch(`${this.baseUrl}/api/v1/chats`, {
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

    const data = await response.json() as Record<string, any>;
    return {
      success: true,
      messageId: data.id || data.message_id || `up_${uuidv4()}`,
      chatId: data.chat_id || data.id,
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

    const attendeeId = this.formatRecipient(params.recipientPhone);
    const caption = params.caption || '';

    try {
      // Fetch media blob from URL or public CDN
      const mediaRes = await fetch(params.mediaUrl);
      if (mediaRes.ok) {
        const arrayBuffer = await mediaRes.arrayBuffer();
        const mimeType = params.mimeType || mediaRes.headers.get('content-type') || 'application/octet-stream';
        const filename = params.mediaUrl.split('/').pop()?.split('?')[0] || (mimeType.includes('pdf') ? 'document.pdf' : 'video.mp4');
        const blob = new Blob([arrayBuffer], { type: mimeType });

        const formData = new FormData();
        if (caption) formData.append('text', caption);
        formData.append('attachments', blob, filename);
        formData.append('account_id', params.accountId || this.accountId);
        formData.append('attendees_ids[]', attendeeId);

        const response = await fetch(`${this.baseUrl}/api/v1/chats`, {
          method: 'POST',
          headers: {
            'X-API-KEY': this.apiKey,
            'Accept': 'application/json',
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json() as Record<string, any>;
          return {
            success: true,
            messageId: data.id || data.message_id || `up_media_${uuidv4()}`,
            chatId: data.chat_id || data.id,
            raw: data,
          };
        }
      }
    } catch (attachmentErr) {
      console.warn('FormData attachment send failed, falling back to URL payload:', attachmentErr);
    }

    // Fallback to text + URL link
    const mediaText = caption ? `${caption}\n\n${params.mediaUrl}` : params.mediaUrl;
    const payload = {
      account_id: params.accountId || this.accountId,
      text: mediaText,
      attendees_ids: [attendeeId],
    };

    const response = await fetch(`${this.baseUrl}/api/v1/chats`, {
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

    const data = await response.json() as Record<string, any>;
    return {
      success: true,
      messageId: data.id || data.message_id || `up_media_${uuidv4()}`,
      chatId: data.chat_id || data.id,
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
