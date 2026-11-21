import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';
import { queueJobs, messages, leads } from '../db/schema.js';
import { eq, and, lte, asc, sql } from 'drizzle-orm';
import { UnipileService, unipileService as defaultUnipile } from './unipile.service.js';

export interface EnqueueJobParams {
  idempotencyKey: string;
  type: 'send_text' | 'send_video' | 'send_document' | 'sync_sheet';
  leadId?: string;
  campaignId?: string;
  payload: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}

export interface QueueJobRecord {
  id: string;
  idempotencyKey: string;
  type: 'send_text' | 'send_video' | 'send_document' | 'sync_sheet';
  leadId: string | null;
  campaignId: string | null;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessBatchResult {
  claimedCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
}

export class QueueService {
  private unipile: UnipileService;
  private isMockStore: boolean;
  private mockJobs: Map<string, QueueJobRecord> = new Map();

  constructor(options?: { unipile?: UnipileService; mockStore?: boolean }) {
    this.unipile = options?.unipile || defaultUnipile;
    this.isMockStore = options?.mockStore ?? (process.env.NODE_ENV === 'test');
  }

  async enqueue(params: EnqueueJobParams): Promise<QueueJobRecord> {
    const now = new Date();
    const runAt = params.runAt || now;
    const maxAttempts = params.maxAttempts || 3;

    if (this.isMockStore) {
      // Check existing idempotencyKey
      for (const job of this.mockJobs.values()) {
        if (job.idempotencyKey === params.idempotencyKey) {
          return job;
        }
      }

      const newJob: QueueJobRecord = {
        id: uuidv4(),
        idempotencyKey: params.idempotencyKey,
        type: params.type,
        leadId: params.leadId || null,
        campaignId: params.campaignId || null,
        payload: params.payload,
        status: 'pending',
        attempts: 0,
        maxAttempts,
        runAt,
        lockedAt: null,
        lockedBy: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };
      this.mockJobs.set(newJob.id, newJob);
      return newJob;
    }

    try {
      // Try insert in DB; if duplicate idempotencyKey, return existing
      const [inserted] = await db
        .insert(queueJobs)
        .values({
          idempotencyKey: params.idempotencyKey,
          type: params.type,
          leadId: params.leadId,
          campaignId: params.campaignId,
          payload: params.payload,
          status: 'pending',
          attempts: 0,
          maxAttempts,
          runAt,
        })
        .onConflictDoNothing({ target: queueJobs.idempotencyKey })
        .returning();

      if (inserted) {
        return inserted as QueueJobRecord;
      }

      // Fetch existing
      const [existing] = await db
        .select()
        .from(queueJobs)
        .where(eq(queueJobs.idempotencyKey, params.idempotencyKey));
      return existing as QueueJobRecord;
    } catch {
      // Fallback for isolated unit tests without live postgres
      return this.enqueueMock(params);
    }
  }

  private enqueueMock(params: EnqueueJobParams): QueueJobRecord {
    for (const job of this.mockJobs.values()) {
      if (job.idempotencyKey === params.idempotencyKey) {
        return job;
      }
    }
    const newJob: QueueJobRecord = {
      id: uuidv4(),
      idempotencyKey: params.idempotencyKey,
      type: params.type,
      leadId: params.leadId || null,
      campaignId: params.campaignId || null,
      payload: params.payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: params.maxAttempts || 3,
      runAt: params.runAt || new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockJobs.set(newJob.id, newJob);
    return newJob;
  }

  async claimBatch(batchSize: number = 10, workerId: string = `worker_${uuidv4().slice(0, 8)}`): Promise<QueueJobRecord[]> {
    const now = new Date();

    if (this.isMockStore) {
      const claimed: QueueJobRecord[] = [];
      for (const job of this.mockJobs.values()) {
        if (job.status === 'pending' && job.runAt <= now) {
          job.status = 'processing';
          job.lockedAt = now;
          job.lockedBy = workerId;
          job.updatedAt = now;
          claimed.push({ ...job });
          if (claimed.length >= batchSize) break;
        }
      }
      return claimed;
    }

    try {
      // Atomic query using PostgreSQL FOR UPDATE SKIP LOCKED
      const result = await db.execute(sql`
        WITH claimed AS (
          SELECT id FROM queue_jobs
          WHERE status = 'pending' AND run_at <= ${now}
          ORDER BY run_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE queue_jobs
        SET status = 'processing', locked_at = ${now}, locked_by = ${workerId}, updated_at = ${now}
        WHERE id IN (SELECT id FROM claimed)
        RETURNING *;
      `);

      const rows = (result.rows || []) as any[];
      return rows.map(r => ({
        id: r.id,
        idempotencyKey: r.idempotency_key || r.idempotencyKey,
        type: r.type,
        leadId: r.lead_id || r.leadId || null,
        campaignId: r.campaign_id || r.campaignId || null,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {}),
        status: r.status,
        attempts: Number(r.attempts || 0),
        maxAttempts: Number(r.max_attempts || r.maxAttempts || 3),
        runAt: new Date(r.run_at || r.runAt || now),
        lockedAt: r.locked_at ? new Date(r.locked_at) : (r.lockedAt ? new Date(r.lockedAt) : null),
        lockedBy: r.locked_by || r.lockedBy || null,
        lastError: r.last_error || r.lastError || null,
        createdAt: new Date(r.created_at || r.createdAt || now),
        updatedAt: new Date(r.updated_at || r.updatedAt || now),
      })) as QueueJobRecord[];
    } catch {
      return [];
    }
  }

  async getNextScheduledPendingDelayMs(): Promise<number | null> {
    if (this.isMockStore) {
      let minRunAt: Date | null = null;
      for (const job of this.mockJobs.values()) {
        if (job.status === 'pending') {
          if (!minRunAt || job.runAt < minRunAt) {
            minRunAt = job.runAt;
          }
        }
      }
      if (!minRunAt) return null;
      return Math.max(0, minRunAt.getTime() - Date.now());
    }

    try {
      const [nextJob] = await db
        .select({ runAt: queueJobs.runAt })
        .from(queueJobs)
        .where(eq(queueJobs.status, 'pending'))
        .orderBy(asc(queueJobs.runAt))
        .limit(1);

      if (!nextJob) return null;
      return Math.max(0, new Date(nextJob.runAt).getTime() - Date.now());
    } catch {
      return null;
    }
  }

  async processBatch(options?: { batchSize?: number; workerId?: string; maxDurationMs?: number }): Promise<ProcessBatchResult> {
    const batchSize = options?.batchSize || 10;
    const workerId = options?.workerId || `worker_${uuidv4().slice(0, 8)}`;
    const maxDurationMs = options?.maxDurationMs ?? (process.env.NODE_ENV === 'test' ? 0 : 12000);
    const startTime = Date.now();

    let totalClaimed = 0;
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    do {
      const jobs = await this.claimBatch(batchSize, workerId);
      if (jobs.length === 0) {
        if (maxDurationMs > 0 && (Date.now() - startTime < maxDurationMs)) {
          // If there is a scheduled job within 3.5s, wait briefly and claim it
          const nextDelay = await this.getNextScheduledPendingDelayMs();
          if (nextDelay !== null && nextDelay >= 0 && nextDelay <= 3500 && (Date.now() - startTime + nextDelay < maxDurationMs)) {
            await new Promise(resolve => setTimeout(resolve, nextDelay + 100));
            continue;
          }
        }
        break;
      }

      for (const job of jobs) {
        try {
          await this.executeJob(job);
          await this.markJobCompleted(job.id);
          totalSuccess++;
        } catch (err) {
          totalFailed++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          await this.handleJobFailure(job, errorMessage);
        }
        totalProcessed++;
      }
      totalClaimed += jobs.length;

      // In test mode, don't loop
      if (process.env.NODE_ENV === 'test' || maxDurationMs === 0) {
        break;
      }
    } while (Date.now() - startTime < maxDurationMs);

    return {
      claimedCount: totalClaimed,
      processedCount: totalProcessed,
      successCount: totalSuccess,
      failedCount: totalFailed,
    };
  }

  private async executeJob(job: QueueJobRecord): Promise<void> {
    const phone = String(job.payload.phone || '');
    if (!phone) {
      throw new Error('Payload missing phone number');
    }

    const leadId = job.leadId || (job as any).lead_id || null;
    const campaignId = job.campaignId || (job as any).campaign_id || null;

    if (job.type === 'send_text') {
      const text = String(job.payload.text || '');
      // Support sending multi-line templates as separate WhatsApp messages
      const textMessages = (Array.isArray(job.payload.texts) && job.payload.texts.length > 0)
        ? (job.payload.texts as string[])
        : text.split('\n').map(t => t.trim()).filter(Boolean);

      const toSend = textMessages.length > 0 ? textMessages : [text];

      for (let i = 0; i < toSend.length; i++) {
        const msgText = toSend[i];
        if (i > 0 && !this.isMockStore) {
          // 1 second pause between text messages for natural sequential delivery
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const response = await this.unipile.sendTextMessage({
          recipientPhone: phone,
          text: msgText,
        });

        // Record message in DB
        if (!this.isMockStore && leadId) {
          try {
            await db.insert(messages).values({
              id: uuidv4(),
              leadId,
              campaignId,
              unipileMessageId: response.messageId,
              direction: 'outbound',
              type: 'text',
              content: msgText,
              deliveryStatus: 'sent',
            });
          } catch (dbErr) {
            console.warn('DB recording message warning:', dbErr);
          }
        }
      }

      if (!this.isMockStore && leadId) {
        try {
          // Update lead status to contacted
          await db.update(leads)
            .set({ status: 'contacted', updatedAt: new Date() })
            .where(eq(leads.id, leadId));
        } catch (dbErr) {
          console.warn('DB updating lead status warning:', dbErr);
        }
      }

      // Check if video sequence or document chaining is required
      const rawVideoAssets = job.payload.videoAssets as Array<{ url: string; caption?: string; delaySeconds?: number }> | undefined;
      const rawVideoAsset = job.payload.videoAsset as { url?: string; caption?: string; delaySeconds?: number } | undefined;

      const videoAssets: Array<{ url: string; caption?: string; delaySeconds?: number }> = 
        (Array.isArray(rawVideoAssets) && rawVideoAssets.length > 0)
          ? rawVideoAssets
          : (rawVideoAsset && rawVideoAsset.url)
            ? [{ url: rawVideoAsset.url, caption: rawVideoAsset.caption, delaySeconds: rawVideoAsset.delaySeconds }]
            : [];

      const documentAsset = job.payload.documentAsset as { url?: string; caption?: string; delaySeconds?: number } | undefined;

      if (videoAssets.length > 0) {
        const firstVideo = videoAssets[0];
        const remainingVideos = videoAssets.slice(1);
        const delayMs = Math.min((firstVideo.delaySeconds ?? 2), 3) * 1000;
        const videoRunAt = new Date(Date.now() + delayMs);
        const dispatchSuffix = job.payload.dispatchId ? `_${job.payload.dispatchId}` : '';

        await this.enqueue({
          idempotencyKey: `lead_${leadId}_video_0_${campaignId}${dispatchSuffix}`,
          type: 'send_video',
          leadId: leadId || undefined,
          campaignId: campaignId || undefined,
          payload: {
            phone,
            videoUrl: firstVideo.url,
            caption: firstVideo.caption || String(job.payload.videoCaption || 'Pls find these sample we did for other brands'),
            videoIndex: 0,
            remainingVideos,
            documentAsset,
            dispatchId: job.payload.dispatchId,
          },
          runAt: videoRunAt,
        });
      } else if (documentAsset && documentAsset.url) {
        const delayMs = Math.min((documentAsset.delaySeconds ?? 2), 3) * 1000;
        const docRunAt = new Date(Date.now() + delayMs);
        const dispatchSuffix = job.payload.dispatchId ? `_${job.payload.dispatchId}` : '';
        await this.enqueue({
          idempotencyKey: `lead_${leadId}_doc_${campaignId}${dispatchSuffix}`,
          type: 'send_document',
          leadId: leadId || undefined,
          campaignId: campaignId || undefined,
          payload: {
            phone,
            documentUrl: documentAsset.url,
            caption: documentAsset.caption || 'Please refer to the PDF above for video types and pricing packages 👆',
            dispatchId: job.payload.dispatchId,
          },
          runAt: docRunAt,
        });
      }
    } else if (job.type === 'send_video') {
      const videoUrl = String(job.payload.videoUrl || '');
      const caption = String(job.payload.caption || '');

      // If an introductory caption was configured for this video (e.g. "Pls find these sample we did for other brands"),
      // deliver it FIRST as a separate text message so it appears above the video, rather than inside the video caption bubble.
      if (caption && caption.trim()) {
        const textRes = await this.unipile.sendTextMessage({
          recipientPhone: phone,
          text: caption.trim(),
        });

        if (!this.isMockStore && leadId) {
          try {
            await db.insert(messages).values({
              id: uuidv4(),
              leadId,
              campaignId,
              unipileMessageId: textRes.messageId,
              direction: 'outbound',
              type: 'text',
              content: caption.trim(),
              deliveryStatus: 'sent',
            });
          } catch (dbErr) {
            console.warn('DB recording text message warning:', dbErr);
          }
        }

        if (!this.isMockStore) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Deliver video cleanly without embedded caption
      const response = await this.unipile.sendMediaMessage({
        recipientPhone: phone,
        mediaUrl: videoUrl,
        caption: '',
        mimeType: 'video/mp4',
      });

      if (!this.isMockStore && leadId) {
        try {
          await db.insert(messages).values({
            id: uuidv4(),
            leadId,
            campaignId,
            unipileMessageId: response.messageId,
            direction: 'outbound',
            type: 'video',
            content: '',
            mediaUrl: videoUrl,
            deliveryStatus: 'sent',
          });
        } catch (dbErr) {
          console.warn('DB recording video message warning:', dbErr);
        }
      }

      // Check if there are remaining videos in sequence
      const remainingVideos = (Array.isArray(job.payload.remainingVideos)
        ? job.payload.remainingVideos
        : []) as Array<{ url: string; caption?: string; delaySeconds?: number }>;

      const documentAsset = job.payload.documentAsset as { url?: string; caption?: string; delaySeconds?: number } | undefined;

      if (remainingVideos.length > 0) {
        const nextVideo = remainingVideos[0];
        const nextRemaining = remainingVideos.slice(1);
        const currentIndex = Number(job.payload.videoIndex ?? 0);
        const nextIndex = currentIndex + 1;
        const delayMs = Math.min((nextVideo.delaySeconds ?? 2), 3) * 1000;
        const nextVideoRunAt = new Date(Date.now() + delayMs);
        const dispatchSuffix = job.payload.dispatchId ? `_${job.payload.dispatchId}` : '';

        await this.enqueue({
          idempotencyKey: `lead_${leadId}_video_${nextIndex}_${campaignId}${dispatchSuffix}`,
          type: 'send_video',
          leadId: leadId || undefined,
          campaignId: campaignId || undefined,
          payload: {
            phone,
            videoUrl: nextVideo.url,
            caption: nextVideo.caption || '',
            videoIndex: nextIndex,
            remainingVideos: nextRemaining,
            documentAsset,
            dispatchId: job.payload.dispatchId,
          },
          runAt: nextVideoRunAt,
        });
      } else if (documentAsset && documentAsset.url) {
        // All sample videos have completed! Chain the PDF document step!
        const delayMs = Math.min((documentAsset.delaySeconds ?? 2), 3) * 1000;
        const docRunAt = new Date(Date.now() + delayMs);
        const dispatchSuffix = job.payload.dispatchId ? `_${job.payload.dispatchId}` : '';
        await this.enqueue({
          idempotencyKey: `lead_${leadId}_doc_${campaignId}${dispatchSuffix}`,
          type: 'send_document',
          leadId: leadId || undefined,
          campaignId: campaignId || undefined,
          payload: {
            phone,
            documentUrl: documentAsset.url,
            caption: documentAsset.caption || 'Please refer to the PDF above for video types and pricing packages 👆',
            dispatchId: job.payload.dispatchId,
          },
          runAt: docRunAt,
        });
      }
    } else if (job.type === 'send_document') {
      const documentUrl = String(job.payload.documentUrl || '');
      const caption = String(job.payload.caption || '');

      const response = await this.unipile.sendMediaMessage({
        recipientPhone: phone,
        mediaUrl: documentUrl,
        caption,
        mimeType: 'application/pdf',
      });

      if (!this.isMockStore && leadId) {
        try {
          await db.insert(messages).values({
            id: uuidv4(),
            leadId,
            campaignId,
            unipileMessageId: response.messageId,
            direction: 'outbound',
            type: 'document',
            content: caption || '',
            mediaUrl: documentUrl,
            deliveryStatus: 'sent',
          });
        } catch (dbErr) {
          console.warn('DB recording document message warning:', dbErr);
        }
      }
    }
  }

  private async markJobCompleted(jobId: string): Promise<void> {
    const now = new Date();
    if (this.isMockStore) {
      const job = this.mockJobs.get(jobId);
      if (job) {
        job.status = 'completed';
        job.lockedAt = null;
        job.lockedBy = null;
        job.updatedAt = now;
      }
      return;
    }

    try {
      await db.update(queueJobs)
        .set({
          status: 'completed',
          lockedAt: null,
          lockedBy: null,
          updatedAt: now,
        })
        .where(eq(queueJobs.id, jobId));
    } catch {
      // Fallback
    }
  }

  private async handleJobFailure(job: QueueJobRecord, errorMessage: string): Promise<void> {
    const attempts = job.attempts + 1;
    const isExhausted = attempts >= job.maxAttempts;
    const now = new Date();

    // Exponential backoff: 30s, 60s, 120s...
    const backoffSeconds = Math.pow(2, attempts) * 15;
    const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);
    const newStatus = isExhausted ? 'dead_letter' : 'pending';

    if (this.isMockStore) {
      const mockJob = this.mockJobs.get(job.id);
      if (mockJob) {
        mockJob.attempts = attempts;
        mockJob.status = newStatus;
        mockJob.lastError = errorMessage;
        mockJob.runAt = nextRunAt;
        mockJob.lockedAt = null;
        mockJob.lockedBy = null;
        mockJob.updatedAt = now;
      }
      return;
    }

    try {
      await db.update(queueJobs)
        .set({
          attempts,
          status: newStatus,
          lastError: errorMessage,
          runAt: nextRunAt,
          lockedAt: null,
          lockedBy: null,
          updatedAt: now,
        })
        .where(eq(queueJobs.id, job.id));
    } catch {
      // Fallback
    }
  }

  async getStats(): Promise<{ pending: number; processing: number; completed: number; failed: number; deadLetter: number }> {
    if (this.isMockStore) {
      let pending = 0;
      let processing = 0;
      let completed = 0;
      let failed = 0;
      let deadLetter = 0;

      for (const job of this.mockJobs.values()) {
        if (job.status === 'pending') pending++;
        else if (job.status === 'processing') processing++;
        else if (job.status === 'completed') completed++;
        else if (job.status === 'failed') failed++;
        else if (job.status === 'dead_letter') deadLetter++;
      }
      return { pending, processing, completed, failed, deadLetter };
    }

    try {
      const rows = await db
        .select({
          status: queueJobs.status,
          count: sql<number>`count(*)::int`,
        })
        .from(queueJobs)
        .groupBy(queueJobs.status);

      const stats = { pending: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0 };
      for (const row of rows) {
        if (row.status === 'pending') stats.pending = Number(row.count);
        else if (row.status === 'processing') stats.processing = Number(row.count);
        else if (row.status === 'completed') stats.completed = Number(row.count);
        else if (row.status === 'failed') stats.failed = Number(row.count);
        else if (row.status === 'dead_letter') stats.deadLetter = Number(row.count);
      }
      return stats;
    } catch {
      return { pending: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0 };
    }
  }

  resetRunAtForTesting(idempotencyKey: string): void {
    if (this.isMockStore) {
      for (const job of this.mockJobs.values()) {
        if (job.idempotencyKey === idempotencyKey) {
          job.runAt = new Date(Date.now() - 1000);
        }
      }
    }
  }
}

export const queueService = new QueueService();

