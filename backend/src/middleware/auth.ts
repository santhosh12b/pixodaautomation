import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const headerSecret = req.headers['x-webhook-secret'];
  const authHeader = req.headers.authorization;
  const querySecret = req.query.secret;

  const providedSecret = 
    (typeof headerSecret === 'string' ? headerSecret : null) ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
    (typeof querySecret === 'string' ? querySecret : null);

  if (!providedSecret || providedSecret !== env.WEBHOOK_SECRET) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing webhook secret',
    });
  }

  next();
}
