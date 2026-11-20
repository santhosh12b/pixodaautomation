import { pgTable, uuid, text, integer, bigint, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Leads Table
export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: text('external_id'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  sourceSheet: text('source_sheet'),
  customData: jsonb('custom_data').$type<Record<string, unknown>>().default({}),
  consentStatus: text('consent_status', { enum: ['granted', 'pending', 'revoked'] }).default('granted').notNull(),
  status: text('status', { enum: ['new', 'contacted', 'converted', 'opted_out', 'failed'] }).default('new').notNull(),
  campaignId: uuid('campaign_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('lead_phone_idx').on(table.phone),
  index('lead_status_idx').on(table.status),
  index('lead_campaign_idx').on(table.campaignId),
]);

// Campaigns Table
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'active', 'paused', 'completed'] }).default('draft').notNull(),
  sheetUrl: text('sheet_url'),
  sheetTab: text('sheet_tab'),
  messageTemplate: text('message_template').notNull(),
  videoAssetId: uuid('video_asset_id'),
  videoAssetIds: jsonb('video_asset_ids').$type<string[]>().default([]),
  videoCaption: text('video_caption'),
  videoDelaySeconds: integer('video_delay_seconds').default(5).notNull(),
  documentAssetId: uuid('document_asset_id'),
  documentCaption: text('document_caption'),
  documentDelaySeconds: integer('document_delay_seconds').default(5).notNull(),
  cooldownHours: integer('cooldown_hours').default(24).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('campaign_status_idx').on(table.status),
]);

// Media Assets (Videos & Attachments)
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  blobUrl: text('blob_url').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).default(0),
  mimeType: text('mime_type').default('video/mp4').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Queue Jobs Table (Atomic Persistent Queue)
export const queueJobs = pgTable('queue_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  idempotencyKey: text('idempotency_key').notNull(),
  type: text('type', { enum: ['send_text', 'send_video', 'send_document', 'sync_sheet'] }).notNull(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed', 'dead_letter'] }).default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  runAt: timestamp('run_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lockedBy: text('locked_by'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('queue_jobs_idempotency_idx').on(table.idempotencyKey),
  index('queue_jobs_claim_idx').on(table.status, table.runAt),
  index('queue_jobs_lead_idx').on(table.leadId),
]);

// Messages Table (WhatsApp Chat Log & Inbox)
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  unipileMessageId: text('unipile_message_id'),
  direction: text('direction', { enum: ['outbound', 'inbound'] }).notNull(),
  type: text('type', { enum: ['text', 'video', 'image', 'document'] }).default('text').notNull(),
  content: text('content').notNull(),
  mediaUrl: text('media_url'),
  deliveryStatus: text('delivery_status', { enum: ['queued', 'sent', 'delivered', 'read', 'failed'] }).default('queued').notNull(),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('msg_lead_idx').on(table.leadId),
  index('msg_unipile_id_idx').on(table.unipileMessageId),
  index('msg_status_idx').on(table.deliveryStatus),
]);

// Relations
export const leadsRelations = relations(leads, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id],
  }),
  messages: many(messages),
  queueJobs: many(queueJobs),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  videoAsset: one(mediaAssets, {
    fields: [campaigns.videoAssetId],
    references: [mediaAssets.id],
  }),
  documentAsset: one(mediaAssets, {
    fields: [campaigns.documentAssetId],
    references: [mediaAssets.id],
  }),
  leads: many(leads),
  queueJobs: many(queueJobs),
}));

export const queueJobsRelations = relations(queueJobs, ({ one }) => ({
  lead: one(leads, {
    fields: [queueJobs.leadId],
    references: [leads.id],
  }),
  campaign: one(campaigns, {
    fields: [queueJobs.campaignId],
    references: [campaigns.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  lead: one(leads, {
    fields: [messages.leadId],
    references: [leads.id],
  }),
  campaign: one(campaigns, {
    fields: [messages.campaignId],
    references: [campaigns.id],
  }),
}));

