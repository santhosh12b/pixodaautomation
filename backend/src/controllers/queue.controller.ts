import { Request, Response } from 'express';
import { queueService } from '../services/queue.service.js';
import { env } from '../config/env.js';

export async function processQueueHandler(req: Request, res: Response) {
  // Check authorization via Bearer or X-Cron-Secret
  const authHeader = req.headers.authorization;
  const cronHeader = req.headers['x-cron-secret'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cronHeader;

  if (env.NODE_ENV === 'production' && token !== env.CRON_SECRET) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing CRON_SECRET authorization',
    });
  }

  const batchSize = Math.min(Number(req.body?.batchSize || req.query?.batchSize) || 10, 50);
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

