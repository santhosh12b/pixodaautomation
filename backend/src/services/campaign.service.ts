import { db } from '../db/client.js';
import { campaigns, mediaAssets } from '../db/schema.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
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
  videoAssetIds?: string[] | null;
  videoCaption: string | null;
  videoDelaySeconds: number;
  documentAssetId: string | null;
  documentCaption: string | null;
  documentDelaySeconds: number;
  cooldownHours: number;
  videoAsset?: {
    id?: string;
    blobUrl: string;
    title: string;
    mimeType?: string;
    fileSize?: number;
  } | null;
  videoAssets?: Array<{
    id: string;
    blobUrl: string;
    title: string;
    mimeType: string;
    fileSize: number;
  }> | null;
  documentAsset?: {
    id?: string;
    blobUrl: string;
    title: string;
    mimeType?: string;
    fileSize?: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CampaignService {
  private isMockStore: boolean;
  private mockCampaigns: Map<string, CampaignRecord> = new Map();
  private schemaEnsured = false;

  constructor(options?: { mockStore?: boolean }) {
    this.isMockStore = options?.mockStore ?? (process.env.NODE_ENV === 'test');
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaEnsured || this.isMockStore) return;
    try {
      await db.execute(sql`
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_asset_ids jsonb DEFAULT '[]'::jsonb;
      `);
      this.schemaEnsured = true;
    } catch (err) {
      console.warn('ensureSchema warning:', err);
    }
  }

  private async populateMediaForCampaign(camp: any): Promise<CampaignRecord> {
    if (!camp) return camp;
    const record = { ...camp };

    const assetIds = (Array.isArray(record.videoAssetIds) && record.videoAssetIds.length > 0)
      ? record.videoAssetIds
      : record.videoAssetId
        ? [record.videoAssetId]
        : [];

    if (assetIds.length > 0) {
      if (!this.isMockStore) {
        try {
          const assets = await db.query.mediaAssets.findMany({
            where: inArray(mediaAssets.id, assetIds),
          });
          const assetMap = new Map(assets.map(a => [a.id, a]));
          record.videoAssets = assetIds
            .map((id: string) => assetMap.get(id))
            .filter(Boolean);
          if (!record.videoAsset && record.videoAssets.length > 0) {
            record.videoAsset = record.videoAssets[0];
          }
        } catch (err) {
          console.warn('Failed to load media assets for campaign:', err);
          record.videoAssets = record.videoAsset ? [record.videoAsset] : [];
        }
      } else {
        record.videoAssets = assetIds.map((id: string, idx: number) => ({
          id,
          title: `Sample Video ${idx + 1}`,
          blobUrl: `https://pixodaautomation-frontend.vercel.app/sample-video-${idx + 1}.mp4`,
          fileSize: 5000000,
          mimeType: 'video/mp4',
        }));
        if (!record.videoAsset && record.videoAssets.length > 0) {
          record.videoAsset = record.videoAssets[0];
        }
      }
    } else {
      record.videoAssets = record.videoAsset ? [record.videoAsset] : [];
    }

    return record as CampaignRecord;
  }

  async findMatchingCampaign(sourceSheet?: string): Promise<CampaignRecord | null> {
    await this.ensureSchema();
    if (this.isMockStore) {
      for (const camp of this.mockCampaigns.values()) {
        if (camp.status === 'active') {
          if (!sourceSheet || !camp.sheetUrl || camp.sheetUrl === sourceSheet || camp.name.includes(sourceSheet)) {
            return this.populateMediaForCampaign(camp);
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
          documentAsset: true,
        },
        orderBy: desc(campaigns.createdAt),
      });

      if (!activeCampaigns.length) return null;

      if (sourceSheet) {
        const matched = activeCampaigns.find(c => 
          c.sheetUrl === sourceSheet || 
          c.name.toLowerCase() === sourceSheet.toLowerCase()
        );
        if (matched) return this.populateMediaForCampaign(matched);
      }

      return this.populateMediaForCampaign(activeCampaigns[0]);
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
    await this.ensureSchema();
    if (this.isMockStore) {
      return Promise.all(Array.from(this.mockCampaigns.values()).map(c => this.populateMediaForCampaign(c)));
    }

    try {
      const list = await db.query.campaigns.findMany({
        with: {
          videoAsset: true,
          documentAsset: true,
        },
        orderBy: desc(campaigns.createdAt),
      });
      return Promise.all(list.map(c => this.populateMediaForCampaign(c)));
    } catch {
      return Promise.all(Array.from(this.mockCampaigns.values()).map(c => this.populateMediaForCampaign(c)));
    }
  }

  async getCampaignById(id: string): Promise<CampaignRecord | null> {
    await this.ensureSchema();
    if (this.isMockStore) {
      const camp = this.mockCampaigns.get(id);
      return camp ? this.populateMediaForCampaign(camp) : null;
    }

    try {
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, id),
        with: {
          videoAsset: true,
          documentAsset: true,
        },
      });
      return campaign ? this.populateMediaForCampaign(campaign) : null;
    } catch {
      const camp = this.mockCampaigns.get(id);
      return camp ? this.populateMediaForCampaign(camp) : null;
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
    videoAssetIds?: string[];
    videoCaption?: string;
    videoDelaySeconds?: number;
    documentAssetId?: string;
    documentCaption?: string;
    documentDelaySeconds?: number;
    cooldownHours?: number;
  }): Promise<CampaignRecord> {
    await this.ensureSchema();
    const id = uuidv4();
    const now = new Date();

    const videoAssetIds = Array.isArray(data.videoAssetIds)
      ? data.videoAssetIds
      : (data.videoAssetId ? [data.videoAssetId] : []);
    const videoAssetId = videoAssetIds.length > 0 ? videoAssetIds[0] : (data.videoAssetId || null);

    const record: CampaignRecord = {
      id,
      name: data.name,
      description: data.description || null,
      status: data.status || 'draft',
      sheetUrl: data.sheetUrl || null,
      sheetTab: data.sheetTab || 'Sheet1',
      messageTemplate: data.messageTemplate,
      videoAssetId,
      videoAssetIds,
      videoCaption: data.videoCaption || null,
      videoDelaySeconds: data.videoDelaySeconds ?? 5,
      documentAssetId: data.documentAssetId || null,
      documentCaption: data.documentCaption || null,
      documentDelaySeconds: data.documentDelaySeconds ?? 5,
      cooldownHours: data.cooldownHours ?? 24,
      videoAsset: null,
      videoAssets: [],
      documentAsset: null,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isMockStore) {
      this.mockCampaigns.set(id, record);
      return this.populateMediaForCampaign(record);
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
        videoAssetIds: record.videoAssetIds,
        videoCaption: record.videoCaption,
        videoDelaySeconds: record.videoDelaySeconds,
        documentAssetId: record.documentAssetId,
        documentCaption: record.documentCaption,
        documentDelaySeconds: record.documentDelaySeconds,
        cooldownHours: record.cooldownHours,
      }).returning();

      return this.populateMediaForCampaign(inserted || record);
    } catch {
      this.mockCampaigns.set(id, record);
      return this.populateMediaForCampaign(record);
    }
  }

  async updateCampaign(id: string, updates: Partial<CampaignRecord> & { videoAssetIds?: string[] }): Promise<CampaignRecord | null> {
    await this.ensureSchema();
    if (updates.videoAssetIds && Array.isArray(updates.videoAssetIds)) {
      if (updates.videoAssetIds.length > 0 && !updates.videoAssetId) {
        updates.videoAssetId = updates.videoAssetIds[0];
      }
    }

    if (this.isMockStore) {
      const existing = this.mockCampaigns.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.mockCampaigns.set(id, updated);
      return this.populateMediaForCampaign(updated);
    }

    try {
      const [updated] = await db
        .update(campaigns)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(campaigns.id, id))
        .returning();

      return this.populateMediaForCampaign(updated || null);
    } catch {
      const existing = this.mockCampaigns.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.mockCampaigns.set(id, updated);
      return this.populateMediaForCampaign(updated);
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
    const videoAssetIds = Array.isArray(data.videoAssetIds)
      ? data.videoAssetIds
      : (data.videoAssetId ? [data.videoAssetId] : []);
    const videoAssetId = videoAssetIds.length > 0 ? videoAssetIds[0] : (data.videoAssetId || null);

    const record: CampaignRecord = {
      id: data.id || uuidv4(),
      name: data.name,
      description: data.description || null,
      status: data.status || 'draft',
      sheetUrl: data.sheetUrl || data.sourceSheet || null,
      sheetTab: data.sheetTab || 'Sheet1',
      messageTemplate: data.messageTemplate,
      videoAssetId,
      videoAssetIds,
      videoCaption: data.videoCaption || null,
      videoDelaySeconds: data.videoDelaySeconds ?? 5,
      documentAssetId: data.documentAssetId || null,
      documentCaption: data.documentCaption || null,
      documentDelaySeconds: data.documentDelaySeconds ?? 5,
      cooldownHours: data.cooldownHours ?? 24,
      videoAsset: data.videoAsset || null,
      videoAssets: data.videoAssets || [],
      documentAsset: data.documentAsset || null,
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
