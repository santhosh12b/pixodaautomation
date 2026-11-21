import { Request, Response } from 'express';
import { queueService } from '../services/queue.service.js';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { queueJobs } from '../db/schema.js';
import { desc } from 'drizzle-orm';

export async function processQueueHandler(req: Request, res: Response) {
  // Check authorization via Bearer, X-Cron-Secret, or X-Webhook-Secret
  const authHeader = req.headers.authorization;
  const cronHeader = req.headers['x-cron-secret'];
  const webhookHeader = req.headers['x-webhook-secret'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (cronHeader || webhookHeader);

  const isAuthorized = 
    !env.CRON_SECRET || 
    token === env.CRON_SECRET || 
    token === env.WEBHOOK_SECRET ||
    webhookHeader === env.WEBHOOK_SECRET ||
    (typeof authHeader === 'string' && authHeader.startsWith('Bearer tec_auth_token_'));

  if (env.NODE_ENV === 'production' && !isAuthorized) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authorization to trigger queue processing',
    });
  }

  const batchSize = Math.min(Number(req.body?.batchSize || req.query?.batchSize) || 25, 50);
  const result = await queueService.processBatch({ batchSize });

  return res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    batchSize,
    result,
  });
}

export async function getQueueStatsHandler(req: Request, res: Response) {
  const stats = await queueService.getStats();
  return res.status(200).json({
    status: 'ok',
    stats,
  });
}

export async function getQueueJobsHandler(req: Request, res: Response) {
  try {
    const jobs = await db
      .select({
        id: queueJobs.id,
        idempotencyKey: queueJobs.idempotencyKey,
        type: queueJobs.type,
        leadId: queueJobs.leadId,
        status: queueJobs.status,
        attempts: queueJobs.attempts,
        runAt: queueJobs.runAt,
        lastError: queueJobs.lastError,
        createdAt: queueJobs.createdAt,
        updatedAt: queueJobs.updatedAt,
      })
      .from(queueJobs)
      .orderBy(desc(queueJobs.createdAt))
      .limit(30);

    return res.status(200).json({
      status: 'ok',
      count: jobs.length,
      jobs,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}


