import express from 'express';
import { configureCors } from './middleware/cors.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { env } from './config/env.js';
import queueRoutes from './routes/queue.routes.js';
import leadRoutes from './routes/lead.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import inboxRoutes from './routes/inbox.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import mediaRoutes from './routes/media.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(configureCors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Root health & meta endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'whatsapp-lead-automation-api',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // API Routes
  app.use('/api/queue', queueRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/inbox', inboxRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // 404 and Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
