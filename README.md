# WhatsApp Lead Automation Platform (React + Node.js)

An enterprise-ready WhatsApp Lead Automation SaaS platform built with a decoupled **React SPA (Vite)** frontend and a **Node.js Express (TypeScript)** backend designed for serverless execution on **Vercel** and local development.

---

## 🚀 Key Highlights & Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui primitives, React Router v6, TanStack Query, Recharts, Lucide React.
- **Backend:** Node.js, Express.js, TypeScript, REST architecture, Zod validation, Drizzle ORM, Neon PostgreSQL.
- **Persistent Atomic Queue:** Neon DB-backed queue using PostgreSQL `FOR UPDATE SKIP LOCKED` semantics, idempotency protection, exponential retry backoff, and dead-letter handling.
- **Two-Step Messaging:** Automated dispatch of personalized WhatsApp text messages first via **Unipile**, followed by promotional video delivery after confirmed text transmission.
- **Google Sheets Ingestion:** Ready-to-deploy **Google Apps Script** running every 60 seconds with automatic duplicate tracking and HMAC/API secret authentication.
- **WhatsApp 2-Way Inbox:** Live chat interface with real-time delivery status receipts (sent, delivered, blue read ticks), video previews, and manual agent composer.
- **Promotional Video Library:** Video asset upload and cataloging powered by **Vercel Blob**.
- **Performance Analytics:** Comprehensive Recharts visualizations for delivery rates, read receipts, and multi-stage conversion funnels.
- **Zero Next.js:** Clean, decoupled monorepo architecture.

---

## 📁 Repository Structure

```
├── backend/                        # Node.js + Express REST API
│   ├── api/
│   │   └── index.ts                # Vercel Serverless Function entry point
│   ├── src/
│   │   ├── config/env.ts           # Zod-validated environment config
│   │   ├── db/                     # Drizzle ORM schema, Neon connection pool, seed script
│   │   ├── controllers/            # Lead, Campaign, Queue, Webhook, Media, Analytics, Inbox controllers
│   │   ├── middleware/             # CORS, Webhook Auth, Error handling
│   │   ├── routes/                 # Express API routes
│   │   ├── services/               # Unipile, Vercel Blob, Persistent Queue, Campaigns, Leads, Inbox
│   │   └── server.ts               # Local Express dev listener (with graceful shutdown)
│   ├── tests/                      # Vitest test suite (9 test suites, 26 tests)
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vercel.json                 # Vercel serverless routing rewrite
│
├── frontend/                       # React 18 + Vite SPA
│   ├── src/
│   │   ├── components/             # Layout (Sidebar, Header), UI (Button, Card, Badge, Input)
│   │   │   ├── analytics/          # MetricCard, MessageVolumeChart, ConversionFunnel
│   │   │   ├── campaigns/          # CampaignModal, TemplateEditor (with variable tokens)
│   │   │   ├── inbox/              # ConversationList, ChatThread, MessageBubble
│   │   │   ├── leads/              # LeadTimeline, LeadDetailModal
│   │   │   └── media/              # VideoCard, VideoUploadModal
│   │   ├── pages/                  # Dashboard, Campaigns, Leads, Inbox, VideoLibrary, Analytics
│   │   ├── services/api.ts         # Central API client supporting VITE_API_URL
│   │   ├── types/index.ts          # Shared TypeScript interfaces
│   │   ├── App.tsx                 # React Router and TanStack Query Provider
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── vercel.json                 # Client-side SPA routing rewrite
│
└── google-apps-script/
    ├── Code.gs                     # 1-minute Google Sheets polling script
    └── README.md                   # Google Sheets trigger installation guide
```

---

## ⚡ Quick Start (Local Development)

### 1. Install Dependencies
```bash
# In backend
cd backend
npm install

# In frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` in `backend/`:
```bash
cp backend/.env.example backend/.env
```
Key variables:
- `DATABASE_URL`: Your Neon PostgreSQL connection string (`postgresql://...`)
- `WEBHOOK_SECRET`: Secret token for Google Apps Script requests
- `CRON_SECRET`: Secret token for Vercel Cron or queue worker invocation
- `UNIPILE_DSN`: Unipile WhatsApp API key (`https://api.unipile.com:token`)
- `UNIPILE_ACCOUNT_ID`: Connected Unipile WhatsApp account ID
- `FRONTEND_URL`: URL of the React frontend (`http://localhost:5173` in dev)
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token (optional for local mock mode)

### 3. Run the Development Servers
In separate terminals:
```bash
# Terminal 1: Backend API (runs on http://localhost:5000)
cd backend
npm run dev

# Terminal 2: Frontend Dashboard (runs on http://localhost:5173)
cd frontend
npm run dev
```

### 4. Seed Demo Data (Optional)
```bash
cd backend
npm run db:seed
```

---

## 🧪 Testing & Verification

The backend includes a comprehensive Vitest test suite covering all services, atomic queue operations, webhook handling, and the complete end-to-end pipeline:

```bash
cd backend
npm test
```

Build verification:
```bash
# Backend TypeScript check & compile
cd backend && npm run build

# Frontend production bundle build
cd frontend && npm run build
```

---

## ☁️ Vercel Deployment Guide

The frontend and backend are configured to be independently deployable on Vercel.

### Deploying the Backend API
1. In the Vercel Dashboard, click **New Project** and select the repository.
2. Set the **Root Directory** to `backend`.
3. Set the Environment Variables in Vercel:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `WEBHOOK_SECRET`: A secure random string for Google Apps Script requests.
   - `CRON_SECRET`: A secure random string for queue triggers.
   - `UNIPILE_DSN`: Your Unipile API endpoint and token.
   - `UNIPILE_ACCOUNT_ID`: Your Unipile WhatsApp account ID.
   - `FRONTEND_URL`: The production URL of your deployed React frontend.
   - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob read/write token.
4. Deploy. The Express app executes as a serverless function via `api/index.ts` and `vercel.json`.

#### Setting up Vercel Cron for Queue Processing
To trigger the persistent queue every minute on Vercel:
In `backend/vercel.json`, add a `crons` entry:
```json
{
  "crons": [
    {
      "path": "/api/queue/process",
      "schedule": "* * * * *"
    }
  ]
}
```
Vercel Cron automatically sends the `CRON_SECRET` header when invoking the endpoint.

### Deploying the Frontend SPA
1. In the Vercel Dashboard, click **New Project** and select the repository.
2. Set the **Root Directory** to `frontend`.
3. Set Environment Variable:
   - `VITE_API_URL`: The production URL of your deployed backend (e.g. `https://your-backend.vercel.app`).
4. Deploy. The single-page application is served statically with `vercel.json` rewrites.

---

## 📊 Google Sheets Automation Setup

1. Open your target Google Spreadsheet.
2. Open **Extensions** → **Apps Script**.
3. Paste the contents of [`google-apps-script/Code.gs`](./google-apps-script/Code.gs).
4. Update `BACKEND_URL` and `WEBHOOK_SECRET` to match your deployed backend.
5. Run `setupMinuteTrigger()`.
6. New leads added to the Google Sheet will now automatically trigger WhatsApp text and promotional video outreach without any manual intervention!

