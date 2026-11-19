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

export class MediaService {
  private isMockStore: boolean;
  private mockAssets: Map<string, MediaAssetRecord> = new Map();

  constructor(options?: { mockStore?: boolean }) {
    this.isMockStore = options?.mockStore ?? (process.env.NODE_ENV === 'test');
  }

  async listMedia(): Promise<MediaAssetRecord[]> {
    if (this.isMockStore) {
      return Array.from(this.mockAssets.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      const list = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
      return list as unknown as MediaAssetRecord[];
    } catch {
      return Array.from(this.mockAssets.values());
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

