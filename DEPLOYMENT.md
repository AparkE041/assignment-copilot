# Assignment Copilot – Deployment Guide

Deploy to **Vercel** with **Supabase** (Postgres). Optional: Resend (email), Azure OpenAI (AI features).

---

## 1. Prerequisites

- [Supabase](https://supabase.com) account  
- [Vercel](https://vercel.com) account  
- (Optional) [Resend](https://resend.com) for email  
- (Optional) [Azure AI Foundry](https://ai.azure.com) for chat/tutor/syllabus AI  

---

## 2. Supabase – Database

1. **Create a project** at [supabase.com](https://supabase.com) → New project.  
2. **Save the database password**; you’ll need it for the connection string.  
3. **Enable pgvector**: in Supabase → **SQL Editor** → New query, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   Run the query.  
4. **Get the connection string**:  
   - **Project Settings** (gear) → **Database**  
   - Under **Connection string**, choose **URI**  
   - Use the **Session pooler** string (port **6543** for Supabase pooler)  
   - Copy it and replace `[YOUR-PASSWORD]` with your database password  
   - Example:  
     `postgresql://postgres.[ref]:YOUR_PASSWORD@aws-0-[region].pooler.supabase.com:6543/postgres`  
5. **Production = empty DB**: Do **not** run `npm run db:seed` in production. Seed is for local dev only and will error in production. Users sign up and create their own data.

---

## 3. Vercel – App

1. **Push your code** to GitHub (or GitLab/Bitbucket).  
2. **Import the project** in [Vercel](https://vercel.com) → Add New → Project → select the repo.  
3. **Framework**: Next.js (auto-detected). Root directory: `.` (or your app root).  
4. **Environment variables** – add these in Vercel → Project → Settings → Environment Variables (apply to **Production**, and **Preview** if you use preview deployments):

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `DATABASE_URL` | Yes | Supabase Postgres connection string (Session pooler, with real password). |
   | `AUTH_SECRET` | Yes | Secret for NextAuth. Generate: `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | Yes | Production URL, e.g. `https://your-app.vercel.app` (no trailing slash). |
   | `CRON_SECRET` | Yes (if cron enabled) | Random string for protecting cron routes. Generate: `openssl rand -base64 24` |
   | `ENCRYPTION_KEY` | Recommended | Hex key for encrypting stored secrets (Canvas token, Azure key). Generate: `openssl rand -hex 16` |
   | `RESEND_API_KEY` | Optional | Resend API key (email reminders; currently disabled in app). |
   | `RESEND_FROM_EMAIL` | Optional | Sender email (e.g. `onboarding@resend.dev` or your domain). |
   | `AZURE_OPENAI_ENDPOINT` | Optional | Azure OpenAI endpoint (users can also set in Settings). |
   | `AZURE_OPENAI_API_KEY` | Optional | Azure OpenAI API key. |
   | `AZURE_OPENAI_DEPLOYMENT` | Optional | Deployment name (e.g. `gpt-41`). |
   | `CANVAS_BASE_URL` | Optional | Your Canvas base URL (e.g. `https://your-school.instructure.com`). |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Enable Google OAuth login. |
   | `GITHUB_ID` / `GITHUB_SECRET` | Optional | Enable GitHub OAuth login. |

5. **Deploy**: Trigger a deploy (e.g. push to main). Vercel will run `npm run build` and `prisma generate` (via postinstall).

---

## 4. Run Migrations (Production DB)

Run migrations as an explicit deployment step (recommended) using the same `DATABASE_URL` as Vercel:

```bash
DATABASE_URL="postgresql://postgres.[ref]:YOUR_PASSWORD@...pooler.supabase.com:6543/postgres" npm run db:migrate:deploy
```

Why: the app `build` script no longer runs migrations. This avoids flaky deploys caused by transient database connectivity during build.

**Do not run** `npm run db:seed` in production. Seed is disabled when `NODE_ENV=production`.

---

## 5. Cron Jobs (Optional)

The app defines cron routes for sync and reminders. Cron jobs are supported on all Vercel plans, but **Hobby has scheduling limits**:

- Minimum interval: **once per day**
- Timing precision: **hourly window** (e.g. `1:00` may run between `1:00` and `1:59`)

- **Routes**:  
  - `GET /api/cron/sync` – Canvas sync (e.g. hourly)  
  - `GET /api/cron/reminders` – Reminders (e.g. every 15 min)  
- **Auth**: Send header: `Authorization: Bearer <CRON_SECRET>`  
- **Hobby recommendation**: keep Vercel cron for low-frequency daily tasks, and use an external scheduler for hourly/15-min cadence.
- **Example (cron-job.org or similar)**:  
  - URL: `https://your-app.vercel.app/api/cron/sync`  
  - Method: GET  
  - Header: `Authorization: Bearer YOUR_CRON_SECRET`  
  - Schedule: every hour (sync) / every 15 min (reminders)

`vercel.json` in this repo is already set to once-daily schedules, which are Hobby-compatible.

---

## 6. Post-Deploy Checklist

- [ ] `DATABASE_URL` in Vercel matches Supabase Session pooler (with correct password).  
- [ ] `AUTH_SECRET` and `NEXTAUTH_URL` set; `NEXTAUTH_URL` has no trailing slash.  
- [ ] `ENCRYPTION_KEY` set (recommended) before storing Canvas or Azure credentials.  
- [ ] `CRON_SECRET` set if cron routes are enabled; routes return 401 without correct `Authorization` header.  
- [ ] Migrations applied: `npm run db:migrate:deploy` with production `DATABASE_URL`.  
- [ ] Seed **not** run in production (it will fail by design).  
- [ ] Sign up with a real account and confirm login, dashboard, and core flows.  
- [ ] (Optional) Add Azure OpenAI env vars or configure AI in Settings.  
- [ ] (Optional) Configure cron for `/api/cron/sync` and `/api/cron/reminders` if you use them.  
- [ ] Check `GET /api/health` returns `{ "ok": true }` in production.  
- [ ] In app Settings, review **Deployment Readiness** and resolve any blocking checks.  

---

## 7. Security Summary

- **Secrets**: All secrets in env vars; never committed. See `SECURITY.md`.  
- **Headers**: App sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.  
- **Auth**: NextAuth with JWT; credentials provider; session scoped by user.  
- **Data**: All API routes check session; queries scoped by `userId`.  
- **Cron**: Protected by `CRON_SECRET`.  

---

## 8. Clearing Production Data

Production has **no** seed data. To “reset”:

- **Full reset**: Create a new Supabase project and point `DATABASE_URL` to it; run migrations again.  
- **Per-user**: Users can delete their own data via the app (or you can add admin tools).  
- **DB wipe**: If you must wipe the same DB, run Prisma migrations in a custom script that truncates tables in dependency order (not recommended; prefer a new project for a clean slate).  

---

## 9. Local Development (Recap)

```bash
cp .env.example .env.local
# Edit .env.local: DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, etc.
npm install
npx prisma migrate dev
npm run db:seed   # dev only; creates test user + sample data
npm run dev
```

Use `http://localhost:3000` as `NEXTAUTH_URL` in `.env.local`. Seed is allowed only when `NODE_ENV !== "production"`.
