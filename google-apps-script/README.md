# Google Apps Script Setup Guide

This script automatically scans your Google Sheet every minute for newly inserted leads and dispatches them to the Node.js Express backend API, which queues and delivers personalized WhatsApp text and promotional video messages.

---

## 1. Sheet Requirements

Your Google Sheet must contain columns for lead data. Column headers are automatically detected case-insensitively:

| Column Header (Any of these) | Purpose | Required | Example |
|------------------------------|---------|----------|---------|
| `Name`, `Full Name`, `Contact` | Lead's Name | Yes | John Doe |
| `Phone`, `WhatsApp`, `Mobile` | E.164 or local phone number | Yes | +1 555 123 4567 |
| `Email`, `Mail` | Lead's email address | No | john@example.com |
| `Consent`, `Opt-in` | WhatsApp outreach permission (`Yes` / `No`) | No (defaults to `Yes`) | Yes |
| `Automated_Status` | Automatically created to track processed rows | Auto-created | `PROCESSED: 2026-11-19T...` |

Any additional columns (such as `Company`, `City`, `Budget`) are preserved and forwarded in `customData`, allowing you to reference them in message templates as `{{Company}}`, `{{City}}`, etc.

---

## 2. Installation Steps

1. Open your target Google Spreadsheet.
2. Click **Extensions** → **Apps Script**.
3. Replace any code in `Code.gs` with the contents of [`google-apps-script/Code.gs`](./Code.gs).
4. Update configuration values:
   - **`BACKEND_URL`**: Your deployed backend URL (e.g. `https://your-app.vercel.app/api/leads/webhook`).
   - **`WEBHOOK_SECRET`**: The secret token matching `WEBHOOK_SECRET` in your backend `.env`.
5. In the toolbar, select **`setupMinuteTrigger`** and click **Run**.
6. When prompted, grant Google authorization to read your spreadsheet and fetch external URLs.
7. Once finished, check the execution log. You will see:
   ```
   ✅ Automated 1-minute trigger installed successfully.
   ```

---

## 3. How It Works

- **Every 60 seconds**, Google Apps Script runs `processNewLeads`.
- It identifies rows where `Automated_Status` is not yet marked `PROCESSED`.
- It batches up to 25 leads per run and sends an HTTP `POST` to `/api/leads/webhook` with the `X-Webhook-Secret` header.
- Upon receiving `200 OK`, it stamps `PROCESSED: <timestamp>` into the row, preventing duplicate processing.
- The backend matches the lead to an active campaign, enqueues the WhatsApp message via Unipile, and sends promotional video followup.
