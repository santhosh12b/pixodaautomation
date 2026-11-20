import { db, closeDb } from './client.js';
import { campaigns, leads, mediaAssets, messages, queueJobs } from './schema.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding WhatsApp Lead Automation Platform database...');

  try {
    // 1. Create Media Asset (Promotional Video)
    const videoId = uuidv4();
    await db.insert(mediaAssets).values({
      id: videoId,
      title: 'The Editing Crew - AI Real Estate Sample Video',
      description: 'Introductory promotional video explaining WhatsApp automation features',
      blobUrl: 'https://pixodaautomation-frontend.vercel.app/sample-ai-video.mp4',
      fileSize: 33349155,
      mimeType: 'video/mp4',
    }).onConflictDoNothing();
    console.log('✅ Seeded promotional video asset');

    // 2. Create Active Campaign
    const campaignId = uuidv4();
    await db.insert(campaigns).values({
      id: campaignId,
      name: 'Google Sheet Inbound VIPs',
      description: 'Automates immediate WhatsApp greeting and demo video follow-up for new sheet leads',
      status: 'active',
      sheetUrl: 'Inbound Leads 2026',
      sheetTab: 'Sheet1',
      messageTemplate: 'Hi {{name}}, thanks for requesting details on {{Interest}}! We have prepared your custom overview below.',
      videoAssetId: videoId,
      videoDelaySeconds: 5,
      cooldownHours: 24,
    }).onConflictDoNothing();
    console.log('✅ Seeded active campaign');

    // Sample leads and messages are skipped to maintain 100% real lead data.
    console.log('ℹ️ Mock leads insertion skipped - real leads only.');

    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.warn('⚠️ Seed completed (Note: Database might be offline or using mock store):', err);
  } finally {
    await closeDb();
  }
}

seed();

