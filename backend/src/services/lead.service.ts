import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';
import { leads } from '../db/schema.js';
import { eq, desc, and, gte } from 'drizzle-orm';
import { campaignService, CampaignRecord } from './campaign.service.js';
import { queueService } from './queue.service.js';

export interface IngestLeadInput {
  externalId?: string;
  name: string;
  phone: string;
  email?: string;
  sourceSheet?: string;
  customData?: Record<string, unknown>;
  consentStatus?: 'granted' | 'pending' | 'revoked';
}

export interface LeadRecord {
  id: string;
  externalId: string | null;
  name: string;
  phone: string;
  email: string | null;
  sourceSheet: string | null;
  customData: Record<string, unknown>;
  consentStatus: 'granted' | 'pending' | 'revoked';
  status: 'new' | 'contacted' | 'converted' | 'opted_out' | 'failed';
  campaignId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class LeadService {
  private isMockStore: boolean;
  private mockLeads: Map<string, LeadRecord> = new Map();

  constructor(options?: { mockStore?: boolean }) {
    this.isMockStore = options?.mockStore ?? (process.env.NODE_ENV === 'test');
  }

  normalizePhone(phone: string): string {
    const rawDigits = phone.replace(/\D/g, '');
    // Auto-detect 10-digit Indian phone numbers (e.g. 9360263737) and add +91
    if (rawDigits.length === 10 && /^[6-9]/.test(rawDigits)) {
      return `+91${rawDigits}`;
    }
    // 12-digit starting with 91 (e.g. 919360263737)
    if (rawDigits.length === 12 && rawDigits.startsWith('91')) {
      return `+${rawDigits}`;
    }
    // 11-digit starting with 0 (e.g. 09360263737)
    if (rawDigits.length === 11 && rawDigits.startsWith('0') && /^[6-9]/.test(rawDigits.slice(1))) {
      return `+91${rawDigits.slice(1)}`;
    }
    // 11-digit starting with 9 followed by 10-digit Indian mobile (e.g. typo +9360263737)
    if (rawDigits.length === 11 && rawDigits.startsWith('9') && /^[6-9]/.test(rawDigits.slice(1))) {
      return `+91${rawDigits.slice(1)}`;
    }
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    return `+${cleaned}`;
  }

  async ingestBatch(inputs: IngestLeadInput[]): Promise<{
    ingested: LeadRecord[];
    duplicates: LeadRecord[];
    optedOut: LeadRecord[];
    summary: { total: number; ingested: number; duplicates: number; optedOut: number };
  }> {
    const ingested: LeadRecord[] = [];
    const duplicates: LeadRecord[] = [];
    const optedOut: LeadRecord[] = [];

    for (const input of inputs) {
      const normalizedPhone = this.normalizePhone(input.phone);
      const consentStatus = input.consentStatus || 'granted';

      // Find matching campaign
      const campaign = await campaignService.findMatchingCampaign(input.sourceSheet);

      // Check duplicates within cooldown window
      const cooldownHours = campaign?.cooldownHours ?? 24;
      const isDuplicate = await this.checkDuplicate(normalizedPhone, cooldownHours);

      if (isDuplicate) {
        duplicates.push(isDuplicate);
        continue;
      }

      // If consent is revoked
      if (consentStatus === 'revoked') {
        const lead = await this.createLeadRecord({
          ...input,
          phone: normalizedPhone,
          consentStatus: 'revoked',
          status: 'opted_out',
          campaignId: campaign?.id || null,
        });
        optedOut.push(lead);
        ingested.push(lead);
        continue;
      }

      // Valid consented lead
      const lead = await this.createLeadRecord({
        ...input,
        phone: normalizedPhone,
        consentStatus,
        status: 'new',
        campaignId: campaign?.id || null,
      });

      // Enqueue outreach if active campaign found
      if (campaign && campaign.status === 'active') {
        const renderedText = campaignService.renderTemplate(campaign.messageTemplate, {
          name: lead.name,
          phone: lead.phone,
          customData: lead.customData,
        });

        // Resolve sequence of video assets
        const videoAssetsList: Array<{ url: string; caption?: string; delaySeconds?: number }> = [];
        if (campaign.videoAssets && campaign.videoAssets.length > 0) {
          for (let i = 0; i < campaign.videoAssets.length; i++) {
            const va = campaign.videoAssets[i];
            videoAssetsList.push({
              url: va.blobUrl,
              caption: i === 0 
                ? (campaign.videoCaption || 'Pls find these sample we did for other brands')
                : (va.title ? `${va.title} 🎬` : undefined),
              delaySeconds: campaign.videoDelaySeconds,
            });
          }
        } else if (campaign.videoAsset) {
          videoAssetsList.push({
            url: campaign.videoAsset.blobUrl,
            caption: campaign.videoCaption || 'Pls find these sample we did for other brands',
            delaySeconds: campaign.videoDelaySeconds,
          });
        }

        const documentAsset = campaign.documentAsset ? {
          url: campaign.documentAsset.blobUrl,
          caption: campaign.documentCaption || 'Please refer to the PDF above for video types and pricing packages 👆',
          delaySeconds: campaign.documentDelaySeconds,
        } : undefined;

        await queueService.enqueue({
          idempotencyKey: `lead_${lead.id}_text_${campaign.id}`,
          type: 'send_text',
          leadId: lead.id,
          campaignId: campaign.id,
          payload: {
            phone: lead.phone,
            text: renderedText,
            videoAssets: videoAssetsList,
            videoAsset: videoAssetsList[0] || undefined,
            documentAsset,
          },
        });
      }

      ingested.push(lead);
    }

    return {
      ingested,
      duplicates,
      optedOut,
      summary: {
        total: inputs.length,
        ingested: ingested.length,
        duplicates: duplicates.length,
        optedOut: optedOut.length,
      },
    };
  }

  private async checkDuplicate(phone: string, cooldownHours: number): Promise<LeadRecord | null> {
    const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

    if (this.isMockStore) {
      for (const lead of this.mockLeads.values()) {
        if (lead.phone === phone && lead.createdAt >= cutoff) {
          return lead;
        }
      }
      return null;
    }

    try {
      const existing = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.phone, phone),
            gte(leads.createdAt, cutoff)
          )
        )
        .limit(1);

      return (existing[0] as unknown as LeadRecord) || null;
    } catch {
      for (const lead of this.mockLeads.values()) {
        if (lead.phone === phone && lead.createdAt >= cutoff) {
          return lead;
        }
      }
      return null;
    }
  }

  private async createLeadRecord(data: Partial<LeadRecord> & { name: string; phone: string }): Promise<LeadRecord> {
    const now = new Date();
    const id = data.id || uuidv4();

    const record: LeadRecord = {
      id,
      externalId: data.externalId || null,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      sourceSheet: data.sourceSheet || null,
      customData: data.customData || {},
      consentStatus: data.consentStatus || 'granted',
      status: data.status || 'new',
      campaignId: data.campaignId || null,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isMockStore) {
      this.mockLeads.set(id, record);
      return record;
    }

    try {
      const [inserted] = await db.insert(leads).values({
        id: record.id,
        externalId: record.externalId,
        name: record.name,
        phone: record.phone,
        email: record.email,
        sourceSheet: record.sourceSheet,
        customData: record.customData,
        consentStatus: record.consentStatus,
        status: record.status,
        campaignId: record.campaignId,
      }).returning();

      return (inserted as unknown as LeadRecord) || record;
    } catch {
      this.mockLeads.set(id, record);
      return record;
    }
  }

  async listLeads(filters?: { status?: string; campaignId?: string; search?: string }): Promise<LeadRecord[]> {
    if (this.isMockStore) {
      let result = Array.from(this.mockLeads.values());
      if (filters?.status) {
        result = result.filter(l => l.status === filters.status);
      }
      if (filters?.campaignId) {
        result = result.filter(l => l.campaignId === filters.campaignId);
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        result = result.filter(l => l.name.toLowerCase().includes(query) || l.phone.includes(query));
      }
      return result;
    }

    try {
      const list = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(100);
      return list as unknown as LeadRecord[];
    } catch {
      return Array.from(this.mockLeads.values());
    }
  }

  async getLeadById(id: string): Promise<LeadRecord | null> {
    if (this.isMockStore) {
      return this.mockLeads.get(id) || null;
    }

    try {
      const [lead] = await db.select().from(leads).where(eq(leads.id, id));
      return (lead as unknown as LeadRecord) || null;
    } catch {
      return this.mockLeads.get(id) || null;
    }
  }

  async retryLeadOutreach(id: string): Promise<{ success: boolean; message: string }> {
    const lead = await this.getLeadById(id);
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.consentStatus === 'revoked') {
      throw new Error('Cannot retry outreach for opted-out lead');
    }

    const campaign = lead.campaignId ? await campaignService.getCampaignById(lead.campaignId) : await campaignService.findMatchingCampaign(lead.sourceSheet || undefined);

    if (!campaign) {
      throw new Error('No campaign available for this lead');
    }

    const renderedText = campaignService.renderTemplate(campaign.messageTemplate, {
      name: lead.name,
      phone: lead.phone,
      customData: lead.customData,
    });

    const videoAssetsList: Array<{ url: string; caption?: string; delaySeconds?: number }> = [];
    if (campaign.videoAssets && campaign.videoAssets.length > 0) {
      for (let i = 0; i < campaign.videoAssets.length; i++) {
        const va = campaign.videoAssets[i];
        videoAssetsList.push({
          url: va.blobUrl,
          caption: i === 0 
            ? (campaign.videoCaption || 'Pls find these sample we did for other brands')
            : (va.title ? `${va.title} 🎬` : undefined),
          delaySeconds: campaign.videoDelaySeconds,
        });
      }
    } else if (campaign.videoAsset) {
      videoAssetsList.push({
        url: campaign.videoAsset.blobUrl,
        caption: campaign.videoCaption || 'Pls find these sample we did for other brands',
        delaySeconds: campaign.videoDelaySeconds,
      });
    }

    const documentAsset = campaign.documentAsset ? {
      url: campaign.documentAsset.blobUrl,
      caption: campaign.documentCaption || 'Please refer to the PDF above for video types and pricing packages 👆',
      delaySeconds: campaign.documentDelaySeconds,
    } : undefined;

    // Retry job with new timestamped idempotency key
    await queueService.enqueue({
      idempotencyKey: `lead_${lead.id}_retry_${Date.now()}`,
      type: 'send_text',
      leadId: lead.id,
      campaignId: campaign.id,
      payload: {
        phone: lead.phone,
        text: renderedText,
        videoAssets: videoAssetsList,
        videoAsset: videoAssetsList[0] || undefined,
        documentAsset,
      },
    });

    return { success: true, message: 'Retry job enqueued successfully' };
  }

  resetMockStore(): void {
    this.mockLeads.clear();
  }
}

export const leadService = new LeadService();
