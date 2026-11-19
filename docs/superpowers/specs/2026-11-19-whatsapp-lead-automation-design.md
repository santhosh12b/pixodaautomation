# WhatsApp Lead Automation Platform – System Design

**Date:** 2026-11-19  
**Status:** Approved  

---

## 1. Intent & The Why

Businesses acquiring leads via Google Sheets need instantaneous, automated, and compliant WhatsApp outreach without manual intervention. This platform bridges Google Sheets with WhatsApp via Unipile API by receiving leads through Google Apps Script, staging and deduplicating them in Neon PostgreSQL, evaluating campaign matching and consent, and executing a staged text + promotional video delivery sequence via a persistent database-backed job queue. 

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Automated Lead Ingestion:** Google Apps Script polls Google Sheets every minute, batch-sending newly detected leads to the backend with authentication and duplicate suppression.
- **Decoupled Architecture:** React + Vite SPA on Vercel frontend; Node.js + Express REST API on Vercel Serverless Functions + local Express development listener.
- **Zero In-Memory Queues:** Atomic, persistent job queue in Neon PostgreSQL using `FOR UPDATE SKIP LOCKED` semantics with idempotency, bounded batches, exponential backoff, and retry recovery.
- **Two-Step Messaging:** For each matched eligible lead, deliver the personalized WhatsApp text message first via Unipile; upon verified transmission, enqueue/process the promotional video message.
- **Full-Featured Dashboard:** Campaign builder, lead management with timeline logs, 2-way WhatsApp chat inbox, promotional video library, and visual analytics using Recharts and Tailwind CSS.
- **Serverless & Local Compatibility:** Backend runs cleanly on Vercel Serverless (via exported handler/route adapter) without hanging permanent listeners, while supporting `npm run dev` for local Express listeners.

### Non-Goals
- Next.js framework (strictly prohibited).
- Running permanent in-memory worker processes in Vercel production.
- Client-side storage of third-party API credentials (all Unipile, Neon, and Vercel Blob tokens stay strictly server-side).

### Anti-Goals
- Double-sending messages to leads (avoided via unique lead constraints and job idempotency keys).
- Blocking HTTP responses for lead ingestion while messages are being sent (ingestion creates jobs and returns immediately).
- Lost jobs due to serverless execution limits (handled via bounded batch sizes and transactional job claiming).

---

## 3. Technology Stack

### Frontend
- **Framework:** React 18+ with Vite
- **Language:** TypeScript
- **Styling & UI:** Tailwind CSS, Lucide React icons, Radix UI primitives / shadcn-style components
- **Routing:** React Router v6
- **Data Fetching & State:** TanStack Query v5, Axios / Fetch client with configurable `VITE_API_URL`
- **Visualization:** Recharts for metrics and funnel analytics

### Backend
- **Runtime:** Node.js (v18+) with Express.js
- **Language:** TypeScript (`tsx` for dev, `tsc` for build)
- **Database:** Neon Serverless PostgreSQL with Drizzle ORM
- **Validation:** Zod schemas for all inbound payloads and configuration
- **Cloud Storage:** Vercel Blob SDK for video asset hosting
- **Deployment Adapter:** Serverless-compatible Express app handler for Vercel (`api/index.ts` + `vercel.json`)

---

## 4. System Architecture & Workflows

### 4.1 End-to-End Pipeline
```
[Google Sheet]
      │
      ▼ (every 1 min)
[Google Apps Script]
      │ (POST /api/leads/webhook with Bearer/Secret token)
      ▼
[Express REST API - Ingestion Controller]
      │
      ├──> [Neon DB: Check duplicates by phone + campaign / sheet row]
      ├──> [Neon DB: Create or update Lead record]
      ├──> [Campaign Matching Engine & Consent Check]
      └──> [Neon DB: Enqueue Text Message Job with status 'pending']
             │
             ▼
[Job Queue Processor: POST /api/queue/process (Vercel Cron / Trigger)]
      │ (Atomic claim: SELECT ... FOR UPDATE SKIP LOCKED)
      ├──> [Claim batch of pending jobs, update status to 'processing']
      ├──> [Step A: Dispatch WhatsApp text via Unipile API]
      ├──> [Record message in DB, update job status to 'completed']
      └──> [If campaign has promotional video: Enqueue Video Job with delay]
             │
             ▼ (Next queue cycle)
      ├──> [Step B: Dispatch promotional video via Unipile API]
      └──> [Record media message in DB, update job status to 'completed']
             │
             ▼
[Unipile Webhooks: POST /api/webhooks/unipile]
      │ (Message status updates: sent, delivered, read, failed, inbound replies)
      ├──> [Update Message & Lead status in Neon DB]
      └──> [Reflected live on React Dashboard & WhatsApp Inbox]
```

---

## 5. Database Schema (Drizzle ORM + PostgreSQL)

1. **`leads` Table:**
   - `id`: UUID (Primary Key)
   - `externalId`: Text (Google Sheet row identifier or external ref)
   - `name`: Text
   - `phone`: Text (E.164 normalized)
   - `email`: Text (optional)
   - `sourceSheet`: Text
   - `customData`: JSONB (key-value attributes for template interpolation)
   - `consentStatus`: Enum (`granted`, `pending`, `revoked`)
   - `status`: Enum (`new`, `contacted`, `converted`, `opted_out`, `failed`)
   - `campaignId`: UUID (foreign key -> `campaigns.id`)
   - `createdAt`, `updatedAt`: Timestamps

2. **`campaigns` Table:**
   - `id`: UUID (Primary Key)
   - `name`: Text
   - `description`: Text
   - `status`: Enum (`draft`, `active`, `paused`, `completed`)
   - `sheetUrl`: Text
   - `sheetTab`: Text
   - `messageTemplate`: Text (supports `{{name}}`, `{{phone}}`, `{{custom_field}}`)
   - `videoAssetId`: UUID (foreign key -> `media_assets.id`, optional)
   - `videoDelaySeconds`: Integer (default 5)
   - `cooldownHours`: Integer (prevent duplicate contacts within X hours)
   - `createdAt`, `updatedAt`: Timestamps

3. **`queue_jobs` Table (Persistent Queue with Atomic Claiming):**
   - `id`: UUID (Primary Key)
   - `idempotencyKey`: Text (Unique index, e.g. `lead_{id}_text_{campaignId}`)
   - `type`: Enum (`send_text`, `send_video`, `sync_sheet`)
   - `leadId`: UUID (foreign key -> `leads.id`)
   - `campaignId`: UUID (foreign key -> `campaigns.id`)
   - `payload`: JSONB (message content, media URLs, recipient)
   - `status`: Enum (`pending`, `processing`, `completed`, `failed`, `dead_letter`)
   - `attempts`: Integer (default 0)
   - `maxAttempts`: Integer (default 3)
   - `runAt`: Timestamp (support delayed scheduling)
   - `lockedAt`: Timestamp (optional, for stale lock timeout)
   - `lockedBy`: Text (instance or worker worker ID)
   - `lastError`: Text (optional)
   - `createdAt`, `updatedAt`: Timestamps

4. **`messages` Table (WhatsApp History & 2-Way Inbox):**
   - `id`: UUID (Primary Key)
   - `leadId`: UUID (foreign key -> `leads.id`)
   - `campaignId`: UUID (optional, foreign key -> `campaigns.id`)
   - `unipileMessageId`: Text (index)
   - `direction`: Enum (`outbound`, `inbound`)
   - `type`: Enum (`text`, `video`, `image`, `document`)
   - `content`: Text
   - `mediaUrl`: Text (optional)
   - `deliveryStatus`: Enum (`queued`, `sent`, `delivered`, `read`, `failed`)
   - `rawPayload`: JSONB
   - `timestamp`: Timestamp

5. **`media_assets` Table (Video Library & Vercel Blob):**
   - `id`: UUID (Primary Key)
   - `title`: Text
   - `description`: Text
   - `blobUrl`: Text
   - `fileSize`: BigInt
   - `mimeType`: Text
   - `thumbnailUrl`: Text (optional)
   - `createdAt`: Timestamp

---

## 6. Monorepo Organization

```
/
├── backend/
│   ├── api/
│   │   └── index.ts               # Vercel serverless entrypoint
│   ├── src/
│   │   ├── config/                # Environment variables, Zod schema
│   │   ├── controllers/           # Route handlers (leads, campaigns, queue, webhooks, analytics, inbox)
│   │   ├── db/                    # Drizzle schema, connection pool, migrations
│   │   ├── middleware/            # Auth, CORS, validation, error handler
│   │   ├── routes/                # Express router definitions
│   │   ├── services/              # Queue service, Unipile client, Campaign matcher, Blob storage
│   │   ├── types/                 # Shared TypeScript interfaces
│   │   └── server.ts              # Local Express development server listener
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   └── vercel.json
├── frontend/
│   ├── src/
│   │   ├── components/            # UI components (shadcn/ui, layout, sidebar, navbar)
│   │   ├── pages/                 # Dashboard, Campaigns, Leads, Inbox, VideoLibrary, Analytics, Settings
│   │   ├── services/              # API client (Axios/TanStack Query queries & mutations)
│   │   ├── types/                 # Frontend interfaces
│   │   ├── App.tsx                # React Router root
│   │   └── main.tsx               # Vite entry
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── vercel.json
└── google-apps-script/
    ├── Code.gs                    # Production-ready Google Sheets polling script
    └── README.md                  # Setup & Trigger configuration instructions
```

