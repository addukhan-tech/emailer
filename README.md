# Emailer by Reforgex

Professional email outreach platform — built with Next.js 14, Supabase, and Vercel.

---

## Features

- **Projects** — each project has its own SMTP config, email template, and schedule
- **Any SMTP provider** — Gmail, business email (Outlook, Zoho, custom), any SMTP
- **Leads management** — manual entry, CSV import, Google Sheets import, live sync
- **Pinned status column** — always visible; shows sent/pending/failed + date
- **Follow-ups** — 0–4 follow-ups per lead, custom delay (1–5 days), custom content
- **Smart scheduling** — daily / weekly / monthly at your chosen time
- **Batch control** — send 1, 2, 3, 5, 10, 20, 50, or all leads per batch
- **Interval control** — N minutes between batches
- **Daily limit** — stop after N emails per day, auto-resume next day
- **Employee logins** — each user has their own account, sessions persist
- **Analytics** — per-project stats, monthly breakdown
- **Google Sheets live sync** — new rows auto-add as leads via Apps Script webhook

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend + API | Next.js 14 App Router |
| Database + Auth | Supabase (PostgreSQL) |
| Email sending | Nodemailer (any SMTP) |
| Scheduling | Vercel Cron Jobs (every minute) |
| Hosting | Vercel (free tier works) |

---

## Setup Guide

### Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Go to **SQL Editor** → paste entire contents of `supabase-schema.sql` → Run
3. Copy your **Project URL** and **anon key** from Settings → API

### Step 2 — Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=any_random_string_you_choose
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Step 3 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com).

Add the same environment variables in Vercel Dashboard → Settings → Environment Variables.

### Step 4 — Configure Vercel Cron

The `vercel.json` already configures cron to run every minute.
Add this header in Vercel Dashboard → Settings → Cron Jobs:
- Secret: same value as `CRON_SECRET`

### Step 5 — Create your account

1. Visit `your-app.vercel.app/auth/login`
2. Click "Create account" — first account becomes admin
3. Invite employees by sharing the URL — they create their own accounts

---

## SMTP Configuration Examples

### Gmail
```
Host: smtp.gmail.com
Port: 587 (TLS) or 465 (SSL)
User: your@gmail.com
Pass: App password (not your main password)
      Go to Google Account → Security → App passwords
```

### Business Email (cPanel / Hosting)
```
Host: mail.yourdomain.com
Port: 587 (TLS) or 465 (SSL)
User: you@yourdomain.com
Pass: your email password
```

### Outlook / Microsoft 365
```
Host: smtp.office365.com
Port: 587
User: you@company.com
Pass: your password
SSL: No (uses STARTTLS)
```

### Zoho Mail
```
Host: smtp.zoho.com
Port: 587 (TLS) or 465 (SSL)
User: you@yourdomain.com
Pass: your password
```

### Brevo (SendinBlue)
```
Host: smtp-relay.brevo.com
Port: 587
User: your login email
Pass: SMTP API key (from Brevo dashboard)
```

---

## Google Sheets Live Sync

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Paste this code (replace placeholders):

```javascript
function onFormSubmit(e) {
  var row = e.values;
  var headers = e.range.getSheet()
    .getRange(1, 1, 1, row.length).getValues()[0];
  var data = {};
  headers.forEach(function(h, i) { data[h] = row[i]; });

  UrlFetchApp.fetch(
    'https://your-app.vercel.app/api/sheets-webhook',
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        project_id: 'YOUR_PROJECT_ID_FROM_URL',
        secret: 'any_secret_you_set',
        row: data
      })
    }
  );
}
```

4. Go to **Triggers** → Add trigger → `onFormSubmit` → On form submit (or On spreadsheet change)
5. Your sheet must have an `email` column

---

## Email Templates

Use these variables in subject/body — they get replaced with lead data:

| Variable | Replaced with |
|---|---|
| `{{name}}` | Lead's name |
| `{{email}}` | Lead's email |
| `{{company}}` | Value in `company` column |
| `{{any_column}}` | Any custom column you added |

HTML is fully supported in the email body.

---

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
  app/
    auth/login/        — Login & signup page
    dashboard/         — Dashboard with stats
    projects/          — Projects list
    projects/new/      — Create project (4-step wizard)
    projects/[id]/
      leads/           — Lead management per project
      settings/        — Edit project settings
    leads/             — All leads across all projects
    followups/         — Follow-up queue
    analytics/         — Stats and charts
    schedule/          — Schedule overview
    settings/          — Account settings
    api/
      projects/        — CRUD API
      leads/           — Leads API
      cron/            — Vercel cron handler
      sheets-webhook/  — Google Sheets sync receiver
  components/
    layout/Sidebar     — Navigation sidebar
  lib/
    supabase/          — Client & server Supabase clients
    email.ts           — Email sending engine (Nodemailer)
    utils.ts           — Helper functions
    actions/auth.ts    — Server actions
  types/               — TypeScript types
```
