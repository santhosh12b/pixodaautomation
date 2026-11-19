import cors from 'cors';
import { env } from '../config/env.js';

export function configureCors() {
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      // Check if origin matches allowed origins or vercel preview domains
      const isAllowed = allowedOrigins.includes(origin) || 
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret', 'X-Cron-Secret'],
    optionsSuccessStatus: 204,
  });
}

