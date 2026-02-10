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
   | `CRON_SECRET` | Yes | Random string for protecting cron routes. Generate: `openssl rand -base64 24` |
   | `ENCRYPTION_KEY` | Recommended | 32-character hex for encrypting tokens (e.g. Canvas PAT). Generate: `openssl rand -hex 16` |
   | `RESEND_API_KEY` | Optional | Resend API key (email reminders; currently disabled in app). |
   | `RESEND_FROM_EMAIL` | Optional | Sender email (e.g. `onboarding@resend.dev` or your domain). |
   | `AZURE_OPENAI_ENDPOINT` | Optional | Azure OpenAI endpoint (users can also set in Settings). |
   | `AZURE_OPENAI_API_KEY` | Optional | Azure OpenAI API key. |
   | `AZURE_OPENAI_DEPLOYMENT` | Optional | Deployment name (e.g. `gpt-41`). |
   | `CANVAS_BASE_URL` | Optional | `https://belmont.instructure.com` (or your Canvas URL). |

5. **Deploy**: Trigger a deploy (e.g. push to main). Vercel will run `npm run build` and `prisma generate` (via postinstall).

---

## 4. Run Migrations (Production DB)

Migrations must be run **once** against the production database (e.g. after first deploy).

**Option A – From your machine (recommended)**  
Use the **same** `DATABASE_URL` as in Vercel (Supabase Session pooler):

```bash
DATABASE_URL="postgresql://postgres.[ref]:YOUR_PASSWORD@...pooler.supabase.com:6543/postgres" npx prisma migrate deploy
```

**Option B – Vercel build**  
You can run migrations in the Vercel build step by adding to `package.json`:

```json
"scripts": {
  "build": "prisma migrate deploy && next build"
}
```

Then Prisma runs migrations before each deploy. Prefer Option A for the first run so you can confirm migrations succeed before changing the build.

**Do not run** `npm run db:seed` in production. Seed is disabled when `NODE_ENV=production`.

---

## 5. Cron Jobs (Optional)

The app defines cron routes for sync and reminders. **Vercel Pro** can run them on a schedule. On **Hobby**, use an external cron service.

- **Routes**:  
  - `GET /api/cron/sync` – Canvas sync (e.g. hourly)  
  - `GET /api/cron/reminders` – Reminders (e.g. every 15 min)  
- **Auth**: Send header: `Authorization: Bearer <CRON_SECRET>`  
- **Example (cron-job.org or similar)**:  
  - URL: `https://your-app.vercel.app/api/cron/sync`  
  - Method: GET  
  - Header: `Authorization: Bearer YOUR_CRON_SECRET`  
  - Schedule: every hour (sync) / every 15 min (reminders)

`vercel.json` is already configured with cron paths; Vercel Pro will use it if you have a Pro plan.

---

## 6. Post-Deploy Checklist

- [ ] `DATABASE_URL` in Vercel matches Supabase Session pooler (with correct password).  
- [ ] `AUTH_SECRET` and `NEXTAUTH_URL` set; `NEXTAUTH_URL` has no trailing slash.  
- [ ] `CRON_SECRET` set; cron routes return 401 without correct `Authorization` header.  
- [ ] Migrations applied: `npx prisma migrate deploy` with production `DATABASE_URL`.  
- [ ] Seed **not** run in production (it will fail by design).  
- [ ] Sign up with a real account and confirm login, dashboard, and core flows.  
- [ ] (Optional) Add Azure OpenAI env vars or configure AI in Settings.  
- [ ] (Optional) Configure cron for `/api/cron/sync` and `/api/cron/reminders` if you use them.  

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
