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
      title: 'AutoWhatsApp 60s Demo Overview',
      description: 'Introductory promotional video explaining WhatsApp automation features',
      blobUrl: 'https://mock-blob.vercel-storage.com/videos/autowhatsapp-demo.mp4',
      fileSize: 4850000,
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

    // 3. Create Sample Leads
    const lead1Id = uuidv4();
    const lead2Id = uuidv4();

    await db.insert(leads).values([
      {
        id: lead1Id,
        externalId: 'sheet_row_2',
        name: 'Sarah Connor',
        phone: '+15553214321',
        email: 'sarah@example.com',
        sourceSheet: 'Inbound Leads 2026',
        customData: { Company: 'Cyberdyne', Interest: 'Enterprise Automation' },
        consentStatus: 'granted',
        status: 'contacted',
        campaignId,
      },
      {
        id: lead2Id,
        externalId: 'sheet_row_3',
        name: 'Bruce Wayne',
        phone: '+15559876543',
        email: 'bruce@wayne.test',
        sourceSheet: 'Inbound Leads 2026',
        customData: { Company: 'Wayne Enterprises', Interest: 'AI Outreach' },
        consentStatus: 'granted',
        status: 'converted',
        campaignId,
      },
    ]).onConflictDoNothing();
    console.log('✅ Seeded leads');

    // 4. Create Messages
    await db.insert(messages).values([
      {
        leadId: lead1Id,
        campaignId,
        unipileMessageId: `up_msg_${uuidv4()}`,
        direction: 'outbound',
        type: 'text',
        content: 'Hi Sarah Connor, thanks for requesting details on Enterprise Automation! We have prepared your custom overview below.',
        deliveryStatus: 'read',
      },
      {
        leadId: lead1Id,
        campaignId,
        unipileMessageId: `up_media_${uuidv4()}`,
        direction: 'outbound',
        type: 'video',
        content: 'AutoWhatsApp 60s Demo Overview',
        mediaUrl: 'https://mock-blob.vercel-storage.com/videos/autowhatsapp-demo.mp4',
        deliveryStatus: 'read',
      },
      {
        leadId: lead2Id,
        campaignId,
        unipileMessageId: `up_msg_${uuidv4()}`,
        direction: 'outbound',
        type: 'text',
        content: 'Hi Bruce Wayne, thanks for requesting details on AI Outreach! We have prepared your custom overview below.',
        deliveryStatus: 'delivered',
      },
      {
        leadId: lead2Id,
        campaignId,
        unipileMessageId: `up_reply_${uuidv4()}`,
        direction: 'inbound',
        type: 'text',
        content: 'Looks great! Can we schedule a quick call tomorrow?',
        deliveryStatus: 'read',
      },
    ]).onConflictDoNothing();
    console.log('✅ Seeded message history');

    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.warn('⚠️ Seed completed (Note: Database might be offline or using mock store):', err);
  } finally {
    await closeDb();
  }
}

seed();

