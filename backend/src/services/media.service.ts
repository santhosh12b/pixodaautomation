import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';
import { mediaAssets } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { blobService } from './blob.service.js';

export interface MediaAssetRecord {
  id: string;
  title: string;
  description: string | null;
  blobUrl: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl: string | null;
  createdAt: Date;
}

const KNOWN_MEDIA_SIZES: Record<string, number> = {
  'https://pixodaautomation-frontend.vercel.app/sample-video-1.mp4': 5323704,
  'https://pixodaautomation-frontend.vercel.app/sample-video-2.mp4': 12611091,
  'https://pixodaautomation-frontend.vercel.app/sample-video-3.mp4': 4599809,
  'https://pixodaautomation-frontend.vercel.app/sample-video-4.mp4': 7520943,
  'https://pixodaautomation-frontend.vercel.app/the-editing-crew-packages.pdf': 672955,
  'https://pixodaautomation-frontend.vercel.app/sample-ai-video.mp4': 33349155,
};

export class MediaService {
  private isMockStore: boolean;
  private mockAssets: Map<string, MediaAssetRecord> = new Map();
  private sizesSynced = false;

  constructor(options?: { mockStore?: boolean }) {
    this.isMockStore = options?.mockStore ?? (process.env.NODE_ENV === 'test');
  }

  async syncMediaSizes(): Promise<void> {
    if (this.sizesSynced || this.isMockStore) return;
    try {
      await db.update(mediaAssets)
        .set({ fileSize: 5323704 })
        .where(eq(mediaAssets.blobUrl, 'https://pixodaautomation-frontend.vercel.app/sample-video-1.mp4'));

      await db.update(mediaAssets)
        .set({ fileSize: 12611091 })
        .where(eq(mediaAssets.blobUrl, 'https://pixodaautomation-frontend.vercel.app/sample-video-2.mp4'));

      await db.update(mediaAssets)
        .set({ fileSize: 4599809 })
        .where(eq(mediaAssets.blobUrl, 'https://pixodaautomation-frontend.vercel.app/sample-video-3.mp4'));

      await db.update(mediaAssets)
        .set({ fileSize: 7520943 })
        .where(eq(mediaAssets.blobUrl, 'https://pixodaautomation-frontend.vercel.app/sample-video-4.mp4'));

      await db.update(mediaAssets)
        .set({ fileSize: 672955 })
        .where(eq(mediaAssets.blobUrl, 'https://pixodaautomation-frontend.vercel.app/the-editing-crew-packages.pdf'));

      this.sizesSynced = true;
    } catch (err) {
      console.warn('syncMediaSizes warning:', err);
    }
  }

  async listMedia(): Promise<MediaAssetRecord[]> {
    await this.syncMediaSizes();
    let records: MediaAssetRecord[];

    if (this.isMockStore) {
      records = Array.from(this.mockAssets.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else {
      try {
        const list = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
        records = list as unknown as MediaAssetRecord[];
      } catch {
        records = Array.from(this.mockAssets.values());
      }
    }

    // Apply accurate byte sizes for known static media assets
    return records.map((record) => {
      const knownSize = KNOWN_MEDIA_SIZES[record.blobUrl];
      if (knownSize && (!record.fileSize || record.fileSize === 5000000)) {
        return { ...record, fileSize: knownSize };
      }
      return record;
    });
  }

  async createFromUrl(params: {
    title: string;
    description?: string;
    videoUrl: string;
    fileSize?: number;
    mimeType?: string;
    thumbnailUrl?: string;
  }): Promise<MediaAssetRecord> {
    const now = new Date();
    const id = uuidv4();
    const record: MediaAssetRecord = {
      id,
      title: params.title,
      description: params.description || null,
      blobUrl: params.videoUrl,
      fileSize: params.fileSize || 5000000,
      mimeType: params.mimeType || 'video/mp4',
      thumbnailUrl: params.thumbnailUrl || null,
      createdAt: now,
    };

    if (this.isMockStore) {
      this.mockAssets.set(id, record);
      return record;
    }

    try {
      const [inserted] = await db.insert(mediaAssets).values({
        id: record.id,
        title: record.title,
        description: record.description,
        blobUrl: record.blobUrl,
        fileSize: record.fileSize,
        mimeType: record.mimeType,
        thumbnailUrl: record.thumbnailUrl,
      }).returning();

      return (inserted as unknown as MediaAssetRecord) || record;
    } catch {
      this.mockAssets.set(id, record);
      return record;
    }
  }

  async uploadAndCreate(params: {
    title: string;
    description?: string;
    fileName: string;
    fileBuffer: Buffer;
    mimeType?: string;
    thumbnailUrl?: string;
  }): Promise<MediaAssetRecord> {
    const uploadResult = await blobService.uploadVideo({
      fileName: params.fileName,
      fileBuffer: params.fileBuffer,
      mimeType: params.mimeType,
    });

    const now = new Date();
    const id = uuidv4();
    const record: MediaAssetRecord = {
      id,
      title: params.title,
      description: params.description || null,
      blobUrl: uploadResult.url,
      fileSize: uploadResult.size,
      mimeType: uploadResult.mimeType,
      thumbnailUrl: params.thumbnailUrl || null,
      createdAt: now,
    };

    if (this.isMockStore) {
      this.mockAssets.set(id, record);
      return record;
    }

    try {
      const [inserted] = await db.insert(mediaAssets).values({
        id: record.id,
        title: record.title,
        description: record.description,
        blobUrl: record.blobUrl,
        fileSize: record.fileSize,
        mimeType: record.mimeType,
        thumbnailUrl: record.thumbnailUrl,
      }).returning();

      return (inserted as unknown as MediaAssetRecord) || record;
    } catch {
      this.mockAssets.set(id, record);
      return record;
    }
  }

  async deleteMedia(id: string): Promise<boolean> {
    if (this.isMockStore) {
      const asset = this.mockAssets.get(id);
      if (!asset) return false;
      await blobService.deleteVideo(asset.blobUrl);
      return this.mockAssets.delete(id);
    }

    try {
      const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
      if (asset) {
        await blobService.deleteVideo(asset.blobUrl);
        await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
        return true;
      }
      return false;
    } catch {
      return this.mockAssets.delete(id);
    }
  }

  resetMockStore(): void {
    this.mockAssets.clear();
  }
}

export const mediaService = new MediaService();

