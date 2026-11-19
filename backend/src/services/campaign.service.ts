import { db } from '../db/client.js';
import { campaigns, mediaAssets } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface CampaignRecord {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  sheetUrl: string | null;
  sheetTab: string | null;
  messageTemplate: string;
  videoAssetId: string | null;
  videoDelaySeconds: number;
  cooldownHours: number;
  videoAsset?: {
    blobUrl: string;
    title: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CampaignService {
  private isMockStore: boolean;
  private mockCampaigns: Map<string, CampaignRecord> = new Map();

  constructor(options?: { mockStore?: boolean }) {
    this.isMockStore = options?.mockStore ?? (process.env.NODE_ENV === 'test');
  }

  async findMatchingCampaign(sourceSheet?: string): Promise<CampaignRecord | null> {
    if (this.isMockStore) {
      for (const camp of this.mockCampaigns.values()) {
        if (camp.status === 'active') {
          if (!sourceSheet || !camp.sheetUrl || camp.sheetUrl === sourceSheet || camp.name.includes(sourceSheet)) {
            return camp;
          }
        }
      }
      return null;
    }

    try {
      const activeCampaigns = await db.query.campaigns.findMany({
        where: eq(campaigns.status, 'active'),
        with: {
          videoAsset: true,
        },
        orderBy: desc(campaigns.createdAt),
      });

      if (!activeCampaigns.length) return null;

      if (sourceSheet) {
        const matched = activeCampaigns.find(c => 
          c.sheetUrl === sourceSheet || 
          c.name.toLowerCase() === sourceSheet.toLowerCase()
        );
        if (matched) return matched as unknown as CampaignRecord;
      }

      return activeCampaigns[0] as unknown as CampaignRecord;
    } catch {
      return this.findMatchingCampaignMock(sourceSheet);
    }
  }

  private findMatchingCampaignMock(sourceSheet?: string): CampaignRecord | null {
    for (const camp of this.mockCampaigns.values()) {
      if (camp.status === 'active') {
        if (!sourceSheet || !camp.sheetUrl || camp.sheetUrl === sourceSheet) {
          return camp;
        }
      }
    }
    return null;
  }

  renderTemplate(template: string, lead: { name: string; phone: string; customData?: Record<string, unknown> }): string {
    let rendered = template;
    rendered = rendered.replace(/\{\{\s*name\s*\}\}/gi, lead.name);
    rendered = rendered.replace(/\{\{\s*phone\s*\}\}/gi, lead.phone);

    if (lead.customData) {
      for (const [key, val] of Object.entries(lead.customData)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        rendered = rendered.replace(regex, String(val ?? ''));
      }
    }

    // Clean any remaining unresolved tags
    rendered = rendered.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');
    return rendered.trim();
  }

  async listCampaigns(): Promise<CampaignRecord[]> {
    if (this.isMockStore) {
      return Array.from(this.mockCampaigns.values());
    }

    try {
      const list = await db.query.campaigns.findMany({
        with: {
          videoAsset: true,
        },
        orderBy: desc(campaigns.createdAt),
      });
      return list as unknown as CampaignRecord[];
    } catch {
      return Array.from(this.mockCampaigns.values());
    }
  }

  async getCampaignById(id: string): Promise<CampaignRecord | null> {
    if (this.isMockStore) {
      return this.mockCampaigns.get(id) || null;
    }

    try {
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, id),
        with: {
          videoAsset: true,
        },
      });
      return (campaign as unknown as CampaignRecord) || null;
    } catch {
      return this.mockCampaigns.get(id) || null;
    }
  }

  async createCampaign(data: {
    name: string;
    description?: string;
    status?: 'draft' | 'active' | 'paused' | 'completed';
    sheetUrl?: string;
    sheetTab?: string;
    messageTemplate: string;
    videoAssetId?: string;
    videoDelaySeconds?: number;
    cooldownHours?: number;
  }): Promise<CampaignRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: CampaignRecord = {
      id,
      name: data.name,
      description: data.description || null,
      status: data.status || 'draft',
      sheetUrl: data.sheetUrl || null,
      sheetTab: data.sheetTab || 'Sheet1',
      messageTemplate: data.messageTemplate,
      videoAssetId: data.videoAssetId || null,
      videoDelaySeconds: data.videoDelaySeconds ?? 5,
      cooldownHours: data.cooldownHours ?? 24,
      videoAsset: null,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isMockStore) {
      this.mockCampaigns.set(id, record);
      return record;
    }

    try {
      const [inserted] = await db.insert(campaigns).values({
        id: record.id,
        name: record.name,
        description: record.description,
        status: record.status,
        sheetUrl: record.sheetUrl,
        sheetTab: record.sheetTab,
        messageTemplate: record.messageTemplate,
        videoAssetId: record.videoAssetId,
        videoDelaySeconds: record.videoDelaySeconds,
        cooldownHours: record.cooldownHours,
      }).returning();

      return (inserted as unknown as CampaignRecord) || record;
    } catch {
      this.mockCampaigns.set(id, record);
      return record;
    }
  }

  async updateCampaign(id: string, updates: Partial<CampaignRecord>): Promise<CampaignRecord | null> {
    if (this.isMockStore) {
      const existing = this.mockCampaigns.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.mockCampaigns.set(id, updated);
      return updated;
    }

    try {
      const [updated] = await db
        .update(campaigns)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(campaigns.id, id))
        .returning();

      return (updated as unknown as CampaignRecord) || null;
    } catch {
      const existing = this.mockCampaigns.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.mockCampaigns.set(id, updated);
      return updated;
    }
  }

  async deleteCampaign(id: string): Promise<boolean> {
    if (this.isMockStore) {
      return this.mockCampaigns.delete(id);
    }

    try {
      await db.delete(campaigns).where(eq(campaigns.id, id));
      return true;
    } catch {
      return this.mockCampaigns.delete(id);
    }
  }

  createCampaignMock(data: Partial<CampaignRecord> & { name: string; messageTemplate: string; sourceSheet?: string }): CampaignRecord {
    const record: CampaignRecord = {
      id: data.id || uuidv4(),
      name: data.name,
      description: data.description || null,
      status: data.status || 'draft',
      sheetUrl: data.sheetUrl || data.sourceSheet || null,
      sheetTab: data.sheetTab || 'Sheet1',
      messageTemplate: data.messageTemplate,
      videoAssetId: data.videoAssetId || null,
      videoDelaySeconds: data.videoDelaySeconds ?? 5,
      cooldownHours: data.cooldownHours ?? 24,
      videoAsset: data.videoAsset || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockCampaigns.set(record.id, record);
    return record;
  }

  resetMockStore(): void {
    this.mockCampaigns.clear();
  }
}

export const campaignService = new CampaignService();
