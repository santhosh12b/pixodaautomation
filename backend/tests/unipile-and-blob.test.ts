import { describe, it, expect } from 'vitest';
import { UnipileService } from '../src/services/unipile.service.js';
import { BlobService } from '../src/services/blob.service.js';

describe('Task 3: Unipile WhatsApp & Blob Services', () => {
  const unipile = new UnipileService({ mock: true });
  const blob = new BlobService({ mock: true });

  it('UnipileService should send text message successfully in mock/test mode', async () => {
    const result = await unipile.sendTextMessage({
      recipientPhone: '+1234567890',
      text: 'Hello, welcome to our WhatsApp service!',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toContain('mock_msg_');
  });

  it('UnipileService should send media/video message successfully in mock/test mode', async () => {
    const result = await unipile.sendMediaMessage({
      recipientPhone: '+1234567890',
      mediaUrl: 'https://blob.vercel-storage.com/promotions/promo.mp4',
      caption: 'Watch our demo video',
      mimeType: 'video/mp4',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('BlobService should simulate or upload video asset and return blob URL', async () => {
    const result = await blob.uploadVideo({
      fileName: 'promo-2026.mp4',
      fileBuffer: Buffer.from('mock video bytes'),
      mimeType: 'video/mp4',
    });

    expect(result.url).toBeDefined();
    expect(result.url).toContain('.mp4');
    expect(result.size).toBeGreaterThan(0);
  });
});

