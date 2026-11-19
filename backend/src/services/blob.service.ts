import { put, del } from '@vercel/blob';
import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

export interface UploadVideoParams {
  fileName: string;
  fileBuffer: Buffer;
  mimeType?: string;
}

export interface UploadResult {
  url: string;
  size: number;
  mimeType: string;
  pathname: string;
}

export class BlobService {
  private isMock: boolean;

  constructor(options?: { mock?: boolean }) {
    this.isMock = options?.mock ?? (!env.BLOB_READ_WRITE_TOKEN || env.NODE_ENV === 'test');
  }

  async uploadVideo(params: UploadVideoParams): Promise<UploadResult> {
    const cleanFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `videos/${Date.now()}-${uuidv4().slice(0, 8)}-${cleanFileName}`;

    if (this.isMock) {
      return {
        url: `https://mock-blob.vercel-storage.com/${pathname}`,
        size: params.fileBuffer.length || 1024 * 1024 * 5, // fallback 5MB
        mimeType: params.mimeType || 'video/mp4',
        pathname,
      };
    }

    const blob = await put(pathname, params.fileBuffer, {
      access: 'public',
      contentType: params.mimeType || 'video/mp4',
      token: env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      url: blob.url,
      size: params.fileBuffer.length,
      mimeType: params.mimeType || 'video/mp4',
      pathname: blob.pathname,
    };
  }

  async deleteVideo(urlOrPath: string): Promise<boolean> {
    if (this.isMock) {
      return true;
    }

    try {
      await del(urlOrPath, { token: env.BLOB_READ_WRITE_TOKEN });
      return true;
    } catch (err) {
      console.error('Failed to delete blob video:', err);
      return false;
    }
  }
}

export const blobService = new BlobService();
