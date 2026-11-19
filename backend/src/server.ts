import { app } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/client.js';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 WhatsApp Lead Automation API listening on http://localhost:${env.PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Allowed Frontend Origin: ${env.FRONTEND_URL}`);
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    try {
      await closeDb();
      console.log('Database connections closed. Exiting process.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database teardown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
