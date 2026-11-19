import express from 'express';
import { configureCors } from './middleware/cors.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(configureCors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

  // Future route mounts will go here

  // 404 and Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
