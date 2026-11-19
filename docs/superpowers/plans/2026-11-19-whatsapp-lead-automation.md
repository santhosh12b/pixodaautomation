# WhatsApp Lead Automation Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade WhatsApp Lead Automation Platform with a decoupled React SPA frontend (Vite, Tailwind, shadcn/ui, Recharts) and Node.js + Express backend (TypeScript, Drizzle ORM, Neon PostgreSQL) capable of Vercel serverless deployment, automating Google Sheets lead ingestion via Google Apps Script, two-step text+video WhatsApp delivery via Unipile, and persistent database job queue processing.

**Architecture:** Monorepo with independent `backend` (Express REST API with dual local dev listener and Vercel serverless adapter, Neon DB queue using `FOR UPDATE SKIP LOCKED`) and `frontend` (Vite React SPA). Ingests leads from Google Sheets, verifies consent, deduplicates, enqueues text then promotional video jobs via Unipile, and tracks statuses through real-time webhooks, live 2-way inbox, campaign builder, and analytics dashboard.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React, TanStack Query, Recharts, Express.js, Drizzle ORM, Neon PostgreSQL, Zod, Unipile API, Vercel Blob, Google Apps Script.

**Spec:** [docs/superpowers/specs/2026-11-19-whatsapp-lead-automation-design.md](file:///d:/project/whatappautomation/docs/superpowers/specs/2026-11-19-whatsapp-lead-automation-design.md)

## Global Constraints

- Do not use Next.js anywhere in the project.
- React frontend and Express backend must be independently deployable on Vercel.
- Do not run a permanent Express listener in Vercel production environment; support local dev with standard listener.
- Keep all API credentials and tokens strictly server-side.
- Neon persistent queue storage only — never rely on in-memory job queues.
- Use atomic job claiming (`FOR UPDATE SKIP LOCKED`), idempotency keys, bounded batch sizes, and retry recovery.
- Google Apps Script must poll every minute and post batch leads with authorization.

## Review Focus

1. Duplicate leads submitted within a short window must be safely deduplicated without creating duplicate outbound WhatsApp messages.
2. If text message delivery fails via Unipile, the subsequent video job must not be triggered, and the failure must be logged with retry capability.
3. Vercel serverless environment cold-starts and request timeouts must not leave orphaned locked jobs in the database queue.
4. CORS and frontend API base URL must work seamlessly in both local development (`localhost:5173` -> `localhost:5000`) and production Vercel domains.
5. Inbound WhatsApp messages received via Unipile webhook must correctly attach to the corresponding lead conversation in the 2-way inbox.

---

### Task 1: Monorepo Setup & Backend Foundations (Config, Drizzle Schema & Neon Client)

**Files:**
- Create: `package.json` (monorepo root)
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/drizzle.config.ts`
- Create: `backend/.env.example`
- Create: `backend/src/config/env.ts`
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/client.ts`
- Create: `backend/tests/config-and-schema.test.ts`

**Interfaces:**
- Produces: `env` object validated via Zod, Drizzle schema tables (`leads`, `campaigns`, `queueJobs`, `messages`, `mediaAssets`), `db` database client instance.

- [ ] **Step 1: Write test for env validation and Drizzle schema structures**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement root `package.json`, `backend/package.json`, `backend/tsconfig.json`, and dependencies**
- [ ] **Step 4: Implement `backend/src/config/env.ts` with Zod schema validation**
- [ ] **Step 5: Implement `backend/src/db/schema.ts` defining all tables, enums, relationships, and indices**
- [ ] **Step 6: Implement `backend/src/db/client.ts` supporting Neon HTTP / Pool with fallback mode for tests**
- [ ] **Step 7: Run tests to verify they pass**
- [ ] **Step 8: Commit**

---

### Task 2: Backend Express Application & Vercel Serverless Entry Point

**Files:**
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/api/index.ts`
- Create: `backend/vercel.json`
- Create: `backend/src/middleware/cors.ts`
- Create: `backend/src/middleware/error.ts`
- Create: `backend/tests/app.test.ts`

**Interfaces:**
- Consumes: `backend/src/config/env.ts`, `backend/src/db/client.ts`
- Produces: `createApp()` Express application, local server listener, Vercel serverless exported handler.

- [ ] **Step 1: Write test for Express app health check, CORS handling, and 404 handler**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement CORS middleware with configurable `FRONTEND_URL` and preflight handling**
- [ ] **Step 4: Implement error handling middleware returning standardized JSON error responses**
- [ ] **Step 5: Implement `backend/src/app.ts` assembling routes, JSON parser, and health check `/api/health`**
- [ ] **Step 6: Implement `backend/src/server.ts` (local dev server with `app.listen`)**
- [ ] **Step 7: Implement `backend/api/index.ts` and `backend/vercel.json` for Vercel Serverless Function**
- [ ] **Step 8: Run tests to verify they pass**
- [ ] **Step 9: Commit**

---

### Task 3: Unipile WhatsApp API Service & Vercel Blob Service

**Files:**
- Create: `backend/src/services/unipile.service.ts`
- Create: `backend/src/services/blob.service.ts`
- Create: `backend/tests/unipile-and-blob.test.ts`

**Interfaces:**
- Consumes: `backend/src/config/env.ts`
- Produces: `UnipileService.sendTextMessage()`, `UnipileService.sendMediaMessage()`, `UnipileService.getChats()`, `BlobService.uploadVideo()`, `BlobService.deleteVideo()`.

- [ ] **Step 1: Write unit tests with mocks for Unipile and Blob services**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `UnipileService` with methods to send text and media messages with timeout and error wrapping**
- [ ] **Step 4: Implement `BlobService` with `@vercel/blob` upload and metadata helpers**
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Commit**

---

### Task 4: Persistent Neon Database Queue Engine (Atomic Claims & Job Processing)

**Files:**
- Create: `backend/src/services/queue.service.ts`
- Create: `backend/src/controllers/queue.controller.ts`
- Create: `backend/src/routes/queue.routes.ts`
- Create: `backend/tests/queue.test.ts`

**Interfaces:**
- Consumes: `backend/src/db/schema.ts`, `backend/src/db/client.ts`, `backend/src/services/unipile.service.ts`
- Produces: `QueueService.enqueue()`, `QueueService.claimBatch()`, `QueueService.processBatch()`, `POST /api/queue/process` handler.

- [ ] **Step 1: Write test for atomic queue job claiming, retry counter increment, and idempotency key uniqueness**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `QueueService` with atomic `FOR UPDATE SKIP LOCKED` batch claiming, retry backoff, and text -> video chaining**
- [ ] **Step 4: Implement `queue.controller.ts` with `processJobs` endpoint secured by `CRON_SECRET` or API token**
- [ ] **Step 5: Register `/api/queue` routes in `app.ts`**
- [ ] **Step 6: Run tests to verify they pass**
- [ ] **Step 7: Commit**

---

### Task 5: Lead Ingestion, Campaign Matcher & Duplicate Prevention

**Files:**
- Create: `backend/src/services/campaign.service.ts`
- Create: `backend/src/services/lead.service.ts`
- Create: `backend/src/controllers/lead.controller.ts`
- Create: `backend/src/routes/lead.routes.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/tests/lead-ingestion.test.ts`

**Interfaces:**
- Consumes: `backend/src/db/schema.ts`, `backend/src/services/queue.service.ts`
- Produces: `POST /api/leads/webhook`, `GET /api/leads`, `GET /api/leads/:id`, `POST /api/leads/:id/retry`.

- [ ] **Step 1: Write tests for lead ingestion payload validation, duplicate suppression, and template rendering**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `CampaignService` to match active campaigns and render variables (`{{name}}`, `{{phone}}`, etc.)**
- [ ] **Step 4: Implement `LeadService` validating E.164 phone numbers, checking consent, preventing duplicates, and creating queue jobs**
- [ ] **Step 5: Implement `lead.controller.ts` and wire with `X-Webhook-Secret` auth middleware**
- [ ] **Step 6: Register `/api/leads` routes in `app.ts`**
- [ ] **Step 7: Run tests to verify they pass**
- [ ] **Step 8: Commit**

---

### Task 6: Unipile Webhook Handler & WhatsApp 2-Way Inbox APIs

**Files:**
- Create: `backend/src/controllers/webhook.controller.ts`
- Create: `backend/src/controllers/inbox.controller.ts`
- Create: `backend/src/routes/webhook.routes.ts`
- Create: `backend/src/routes/inbox.routes.ts`
- Create: `backend/tests/webhook-and-inbox.test.ts`

**Interfaces:**
- Consumes: `backend/src/db/schema.ts`, `backend/src/services/unipile.service.ts`
- Produces: `POST /api/webhooks/unipile`, `GET /api/inbox/conversations`, `GET /api/inbox/:leadId/messages`, `POST /api/inbox/:leadId/messages`.

- [ ] **Step 1: Write tests for inbound message webhook processing and outbound manual message sending**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `webhook.controller.ts` to update delivery statuses (`sent`, `delivered`, `read`, `failed`) and record inbound replies**
- [ ] **Step 4: Implement `inbox.controller.ts` to list conversations, conversation threads, and send manual agent replies**
- [ ] **Step 5: Register `/api/webhooks` and `/api/inbox` routes in `app.ts`**
- [ ] **Step 6: Run tests to verify they pass**
- [ ] **Step 7: Commit**

---

### Task 7: Campaigns, Video Assets & Analytics Controller APIs

**Files:**
- Create: `backend/src/controllers/campaign.controller.ts`
- Create: `backend/src/controllers/media.controller.ts`
- Create: `backend/src/controllers/analytics.controller.ts`
- Create: `backend/src/routes/campaign.routes.ts`
- Create: `backend/src/routes/media.routes.ts`
- Create: `backend/src/routes/analytics.routes.ts`
- Create: `backend/tests/campaigns-media-analytics.test.ts`

**Interfaces:**
- Consumes: `backend/src/db/schema.ts`, `backend/src/services/blob.service.ts`
- Produces: Campaign CRUD endpoints, Media Asset endpoints with Vercel Blob, Analytics summary & timeline data endpoints.

- [ ] **Step 1: Write tests for campaign creation, media cataloging, and analytics aggregations**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `campaign.controller.ts` for CRUD and status toggle**
- [ ] **Step 4: Implement `media.controller.ts` for video library management and blob URLs**
- [ ] **Step 5: Implement `analytics.controller.ts` returning dashboard KPIs, funnel stats, and daily message charts**
- [ ] **Step 6: Register `/api/campaigns`, `/api/media`, and `/api/analytics` routes in `app.ts`**
- [ ] **Step 7: Run tests to verify they pass**
- [ ] **Step 8: Commit**

---

### Task 8: Google Apps Script Integration (`Code.gs` & Documentation)

**Files:**
- Create: `google-apps-script/Code.gs`
- Create: `google-apps-script/README.md`
- Create: `backend/tests/gas-payload.test.ts`

**Interfaces:**
- Produces: Google Apps Script ready to paste into Google Sheets Script Editor with automated 1-minute time trigger, row status updating, HMAC/Bearer auth, and batching.

- [ ] **Step 1: Write test verifying Google Apps Script payload structure against backend validation schema**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `google-apps-script/Code.gs` with sheet row scanner, processed status flag column, and HTTP POST to backend**
- [ ] **Step 4: Write `google-apps-script/README.md` documenting setup, environment properties, and trigger configuration**
- [ ] **Step 5: Run tests to verify payload compatibility passes**
- [ ] **Step 6: Commit**

---

### Task 9: React Frontend Scaffolding, Styling & Layout Components

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/vercel.json`
- Create: `frontend/src/index.css`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/components/layout/AppLayout.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: Backend REST APIs
- Produces: React application with routing, theme styling, API client configured with `VITE_API_URL`, and responsive SaaS navigation.

- [ ] **Step 1: Scaffold `frontend/` dependencies, TypeScript, Vite, Tailwind, and PostCSS configurations**
- [ ] **Step 2: Implement Axios/Fetch API client in `frontend/src/services/api.ts` with error handling and TanStack Query provider**
- [ ] **Step 3: Implement foundational UI components (Button, Card, Badge, Modal, Input)**
- [ ] **Step 4: Implement responsive SaaS AppLayout with collapsible Sidebar and Header**
- [ ] **Step 5: Set up React Router with route definitions in `frontend/src/App.tsx`**
- [ ] **Step 6: Test frontend builds with `npm run build`**
- [ ] **Step 7: Commit**

---

### Task 10: React Dashboard & Analytics Views

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/pages/AnalyticsPage.tsx`
- Create: `frontend/src/components/analytics/MetricCard.tsx`
- Create: `frontend/src/components/analytics/MessageVolumeChart.tsx`
- Create: `frontend/src/components/analytics/ConversionFunnel.tsx`

**Interfaces:**
- Consumes: `GET /api/analytics/dashboard`, `GET /api/analytics/charts`
- Produces: Real-time dashboard view with summary KPI cards, Recharts visualizations, and system health status.

- [ ] **Step 1: Implement `MetricCard` with Lucide icons and trend percentage indicators**
- [ ] **Step 2: Implement `MessageVolumeChart` and `ConversionFunnel` using Recharts**
- [ ] **Step 3: Implement `DashboardPage` assembling metrics, queue health widget, and recent lead activity list**
- [ ] **Step 4: Implement `AnalyticsPage` with time-range filtering and comprehensive performance breakdown**
- [ ] **Step 5: Verify page rendering and build**
- [ ] **Step 6: Commit**

---

### Task 11: React Campaign Builder & Campaign Management Views

**Files:**
- Create: `frontend/src/pages/CampaignsPage.tsx`
- Create: `frontend/src/components/campaigns/CampaignList.tsx`
- Create: `frontend/src/components/campaigns/CampaignModal.tsx`
- Create: `frontend/src/components/campaigns/TemplateEditor.tsx`

**Interfaces:**
- Consumes: `GET /api/campaigns`, `POST /api/campaigns`, `PATCH /api/campaigns/:id`, `GET /api/media`
- Produces: Campaign list view, active/pause toggle, and multi-field campaign builder with variable token inserters.

- [ ] **Step 1: Implement `TemplateEditor` with variable badge insertion (`{{name}}`, `{{phone}}`, `{{custom_field}}`) and real-time preview**
- [ ] **Step 2: Implement `CampaignModal` for creating/editing campaigns (name, sheet source, message template, promotional video select, cooldown)**
- [ ] **Step 3: Implement `CampaignsPage` with search, filter, and quick toggle buttons**
- [ ] **Step 4: Verify page rendering and build**
- [ ] **Step 5: Commit**

---

### Task 12: React Lead Management & Activity Timeline View

**Files:**
- Create: `frontend/src/pages/LeadsPage.tsx`
- Create: `frontend/src/components/leads/LeadTable.tsx`
- Create: `frontend/src/components/leads/LeadDetailModal.tsx`
- Create: `frontend/src/components/leads/LeadTimeline.tsx`

**Interfaces:**
- Consumes: `GET /api/leads`, `GET /api/leads/:id`, `POST /api/leads/:id/retry`
- Produces: Searchable and filterable lead table, detailed lead drawer/modal, event timeline, and manual retry button.

- [ ] **Step 1: Implement `LeadTable` with pagination, status badges, consent chips, and campaign filters**
- [ ] **Step 2: Implement `LeadTimeline` visualizing step progression (Captured -> Consent Verified -> Text Sent -> Video Sent -> Read)**
- [ ] **Step 3: Implement `LeadDetailModal` displaying custom metadata and retry trigger**
- [ ] **Step 4: Implement `LeadsPage` assembling the table and modals**
- [ ] **Step 5: Verify page rendering and build**
- [ ] **Step 6: Commit**

---

### Task 13: React WhatsApp Live 2-Way Inbox

**Files:**
- Create: `frontend/src/pages/InboxPage.tsx`
- Create: `frontend/src/components/inbox/ConversationList.tsx`
- Create: `frontend/src/components/inbox/ChatThread.tsx`
- Create: `frontend/src/components/inbox/MessageBubble.tsx`
- Create: `frontend/src/components/inbox/ChatInput.tsx`

**Interfaces:**
- Consumes: `GET /api/inbox/conversations`, `GET /api/inbox/:leadId/messages`, `POST /api/inbox/:leadId/messages`
- Produces: Interactive 2-way WhatsApp inbox with live thread updates, read receipts, video playback previews, and manual message composer.

- [ ] **Step 1: Implement `MessageBubble` rendering text, video embeds, timestamps, and status checkmarks (single tick, double tick, blue tick)**
- [ ] **Step 2: Implement `ConversationList` displaying leads with unread badges and search**
- [ ] **Step 3: Implement `ChatThread` and `ChatInput` with optimistic UI updates on sending reply**
- [ ] **Step 4: Assemble `InboxPage` and connect TanStack Query polling / refetching**
- [ ] **Step 5: Verify inbox rendering and build**
- [ ] **Step 6: Commit**

---

### Task 14: React Video Library View & Vercel Blob Integration

**Files:**
- Create: `frontend/src/pages/VideoLibraryPage.tsx`
- Create: `frontend/src/components/media/VideoCard.tsx`
- Create: `frontend/src/components/media/VideoUploadModal.tsx`

**Interfaces:**
- Consumes: `GET /api/media`, `POST /api/media/upload`, `DELETE /api/media/:id`
- Produces: Video asset gallery with video preview player, file metadata, and upload interface.

- [ ] **Step 1: Implement `VideoCard` displaying video player, size, duration, and campaign usage**
- [ ] **Step 2: Implement `VideoUploadModal` with file picker, upload progress indicator, and title/description inputs**
- [ ] **Step 3: Implement `VideoLibraryPage` connecting media APIs**
- [ ] **Step 4: Verify video library rendering and build**
- [ ] **Step 5: Commit**

---

### Task 15: Database Seed, End-to-End Pipeline Verification & Deployment Readiness

**Files:**
- Create: `backend/src/db/seed.ts`
- Create: `backend/tests/e2e-pipeline.test.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: All backend and frontend modules
- Produces: Database seeder for instant local demo data, end-to-end integration test of the entire pipeline, complete deployment guide.

- [ ] **Step 1: Create `backend/src/db/seed.ts` populating sample campaigns, leads, media, and chat history**
- [ ] **Step 2: Write and run end-to-end integration test (`backend/tests/e2e-pipeline.test.ts`) validating:**
  - Google Sheet lead post -> Lead deduplication
  - Automatic campaign matching
  - Text job creation & atomic claim
  - Text sending simulation -> Video job creation
  - Webhook delivery update simulation
  - Inbox reflection and Analytics KPI update
- [ ] **Step 3: Run full backend build (`npm run build` in `backend`)**
- [ ] **Step 4: Run full frontend build (`npm run build` in `frontend`)**
- [ ] **Step 5: Create root `README.md` documenting architecture, Vercel deployment instructions, Google Apps Script setup, and environment variables**
- [ ] **Step 6: Commit**

