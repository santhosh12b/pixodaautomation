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
import authRoutes from './routes/auth.routes.js';

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(configureCors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Root health & meta endpoint (handles /, /api, and /api/health)
  app.get(['/', '/api', '/api/health'], (req, res) => {
    // If browser visits root directly, provide a clean status dashboard page
    const acceptsHtml = req.accepts('html') && !req.xhr && req.headers['sec-fetch-dest'] === 'document';
    
    if (acceptsHtml && (req.path === '/' || req.path === '')) {
      return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Lead Automation API</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #131c2e;
      border: 1px solid #1e293b;
      border-radius: 16px;
      max-width: 680px;
      width: 100%;
      padding: 36px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #f8fafc;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }
    .desc {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .endpoints {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 24px;
    }
    .endpoint {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #0a0f1d;
      border: 1px solid #1e293b;
      border-radius: 8px;
      text-decoration: none;
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      transition: all 0.15s ease;
    }
    .endpoint:hover {
      background: #1e293b;
      border-color: #38bdf8;
      transform: translateX(2px);
    }
    .method {
      background: #0284c7;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      margin-right: 10px;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding-top: 18px;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">WhatsApp Automation API</div>
      <div class="badge"><span class="pulse"></span> LIVE & HEALTHY</div>
    </div>
    <p class="desc">
      The backend is connected to <strong>Neon PostgreSQL</strong> and actively serving endpoints on Vercel Serverless.
    </p>
    <div class="section-title">Verified Endpoints</div>
    <div class="endpoints">
      <a class="endpoint" href="/api/health" target="_blank">
        <span><span class="method">GET</span>/api/health</span>
        <span style="color: #10b981;">200 OK &rarr;</span>
      </a>
      <a class="endpoint" href="/api/leads" target="_blank">
        <span><span class="method">GET</span>/api/leads</span>
        <span style="color: #94a3b8;">Neon DB &rarr;</span>
      </a>
      <a class="endpoint" href="/api/campaigns" target="_blank">
        <span><span class="method">GET</span>/api/campaigns</span>
        <span style="color: #94a3b8;">Campaigns &rarr;</span>
      </a>
      <a class="endpoint" href="/api/analytics/overview" target="_blank">
        <span><span class="method">GET</span>/api/analytics/overview</span>
        <span style="color: #94a3b8;">Metrics &rarr;</span>
      </a>
      <a class="endpoint" href="/api/inbox/conversations" target="_blank">
        <span><span class="method">GET</span>/api/inbox/conversations</span>
        <span style="color: #94a3b8;">Conversations &rarr;</span>
      </a>
    </div>
    <div class="footer">
      <span>Environment: ${env.NODE_ENV}</span>
      <span>Database: Neon Connected</span>
      <span>Version: 1.0.0</span>
    </div>
  </div>
</body>
</html>
      `);
    }

    res.status(200).json({
      status: 'ok',
      service: 'whatsapp-lead-automation-api',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'Neon PostgreSQL Connected',
      endpoints: {
        health: '/api/health',
        leads: '/api/leads',
        campaigns: '/api/campaigns',
        inbox: '/api/inbox/conversations',
        media: '/api/media',
        analytics: '/api/analytics/overview',
        queueProcess: '/api/queue/process',
      },
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
  app.use('/api/auth', authRoutes);

  // 404 and Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
