import { describe, it, expect, beforeEach } from 'vitest';
import { QueueService } from '../src/services/queue.service.js';
import { UnipileService } from '../src/services/unipile.service.js';

describe('Task 4: Persistent Queue Engine', () => {
  let queueService: QueueService;
  let mockUnipile: UnipileService;

  beforeEach(() => {
    mockUnipile = new UnipileService({ mock: true });
    queueService = new QueueService({ unipile: mockUnipile, mockStore: true });
  });

  it('should enqueue a job with idempotency key and prevent duplicate enqueue', async () => {
    const job1 = await queueService.enqueue({
      idempotencyKey: 'lead_1_text_camp_1',
      type: 'send_text',
      leadId: '11111111-1111-1111-1111-111111111111',
      campaignId: '22222222-2222-2222-2222-222222222222',
      payload: {
        phone: '+1234567890',
        text: 'Hi John, special offer!',
      },
    });

    expect(job1).toBeDefined();
    expect(job1.status).toBe('pending');

    // Duplicate enqueue with same idempotency key
    const job2 = await queueService.enqueue({
      idempotencyKey: 'lead_1_text_camp_1',
      type: 'send_text',
      leadId: '11111111-1111-1111-1111-111111111111',
      campaignId: '22222222-2222-2222-2222-222222222222',
      payload: {
        phone: '+1234567890',
        text: 'Hi John, special offer!',
      },
    });

    expect(job2.id).toBe(job1.id);
  });

  it('should claim batch atomically and process jobs sequentially (text then chain video)', async () => {
    // Enqueue text job
    await queueService.enqueue({
      idempotencyKey: 'lead_2_text_camp_2',
      type: 'send_text',
      leadId: 'lead-2-uuid',
      campaignId: 'camp-2-uuid',
      payload: {
        phone: '+1987654321',
        text: 'Hello from campaign 2',
        videoAsset: {
          url: 'https://blob.vercel-storage.com/promo.mp4',
          delaySeconds: 0,
        },
      },
    });

    const processResult = await queueService.processBatch({ batchSize: 5 });
    expect(processResult.processedCount).toBe(1);
    expect(processResult.successCount).toBe(1);

    // After text job finishes, video job should have been chained and enqueued
    const stats = await queueService.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.pending).toBe(1); // The chained send_video job
  });

  it('should retry failed job with exponential backoff and cap at maxAttempts', async () => {
    // Failing service
    const failingUnipile = {
      sendTextMessage: async () => {
        throw new Error('Network timeout to WhatsApp gateway');
      },
      sendMediaMessage: async () => {
        throw new Error('Media upload failed');
      },
      getChats: async () => [],
    } as unknown as UnipileService;

    const failingQueue = new QueueService({ unipile: failingUnipile, mockStore: true });

    await failingQueue.enqueue({
      idempotencyKey: 'fail_job_1',
      type: 'send_text',
      leadId: 'lead-3',
      campaignId: 'camp-3',
      maxAttempts: 2,
      payload: { phone: '+1111111111', text: 'Will fail' },
    });

    // Attempt 1
    const res1 = await failingQueue.processBatch({ batchSize: 5 });
    expect(res1.failedCount).toBe(1);
    let stats = await failingQueue.getStats();
    expect(stats.pending).toBe(1); // Set back to pending with backoff

    // Force runAt to now so it can be retried immediately in test
    failingQueue.resetRunAtForTesting('fail_job_1');

    // Attempt 2 (hits maxAttempts = 2)
    const res2 = await failingQueue.processBatch({ batchSize: 5 });
    expect(res2.failedCount).toBe(1);
    stats = await failingQueue.getStats();
    expect(stats.deadLetter).toBe(1);
  });

  it('should sequentially chain 4 sample videos followed by PDF document', async () => {
    // Enqueue initial send_text job with 4 sample videos and 1 document asset
    await queueService.enqueue({
      idempotencyKey: 'lead_multi_text_1',
      type: 'send_text',
      leadId: 'lead-multi-uuid',
      campaignId: 'camp-multi-uuid',
      payload: {
        phone: '+919360263737',
        text: 'Hi Santhosh\nThank you for enquiring with us regarding AI videos',
        videoAssets: [
          { url: 'https://blob/sample-video-1.mp4', caption: 'Pls find these sample we did for other brands', delaySeconds: 0 },
          { url: 'https://blob/sample-video-2.mp4', caption: '', delaySeconds: 0 },
          { url: 'https://blob/sample-video-3.mp4', caption: '', delaySeconds: 0 },
          { url: 'https://blob/sample-video-4.mp4', caption: '', delaySeconds: 0 },
        ],
        documentAsset: {
          url: 'https://blob/the-editing-crew-packages.pdf',
          caption: 'Please refer to the PDF above for video types and pricing packages 👆',
          delaySeconds: 0,
        },
      },
    });

    // Step 1: Text message executes -> chains Video 1
    const resText = await queueService.processBatch({ batchSize: 1 });
    expect(resText.successCount).toBe(1);
    let stats = await queueService.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.pending).toBe(1);

    // Step 2: Video 1 executes -> chains Video 2
    const resV1 = await queueService.processBatch({ batchSize: 1 });
    expect(resV1.successCount).toBe(1);
    stats = await queueService.getStats();
    expect(stats.completed).toBe(2);
    expect(stats.pending).toBe(1);

    // Step 3: Video 2 executes -> chains Video 3
    const resV2 = await queueService.processBatch({ batchSize: 1 });
    expect(resV2.successCount).toBe(1);
    stats = await queueService.getStats();
    expect(stats.completed).toBe(3);
    expect(stats.pending).toBe(1);

    // Step 4: Video 3 executes -> chains Video 4
    const resV3 = await queueService.processBatch({ batchSize: 1 });
    expect(resV3.successCount).toBe(1);
    stats = await queueService.getStats();
    expect(stats.completed).toBe(4);
    expect(stats.pending).toBe(1);

    // Step 5: Video 4 executes -> chains PDF Document
    const resV4 = await queueService.processBatch({ batchSize: 1 });
    expect(resV4.successCount).toBe(1);
    stats = await queueService.getStats();
    expect(stats.completed).toBe(5);
    expect(stats.pending).toBe(1);

    // Step 6: PDF Document executes -> sequence complete!
    const resDoc = await queueService.processBatch({ batchSize: 1 });
    expect(resDoc.successCount).toBe(1);
    stats = await queueService.getStats();
    expect(stats.completed).toBe(6);
    expect(stats.pending).toBe(0);
  });
});

