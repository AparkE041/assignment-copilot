# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` – Start Next.js development server (http://localhost:3000)
- `npm run build` – Production build
- `npm run lint` – Run ESLint

### Database
- `npx prisma migrate deploy` – Apply database migrations to Supabase
- `npm run db:seed` – Seed mock data (creates test user and sample assignments)
- `npx prisma generate` – Generate Prisma client (runs automatically postinstall)

### Testing
- `npm run test` – Run all unit tests (Vitest, once)
- `npm run test:watch` – Run unit tests in watch mode
- `npx vitest run tests/unit/<file>.test.ts` – Run a single unit test file
- `npm run test:e2e` – Run E2E tests (Playwright; auto-starts dev server)
- `npx playwright test tests/e2e/<file>.spec.ts` – Run a single E2E test file

## Architecture

### Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui (neutral base)
- Prisma ORM with Supabase Postgres + pgvector
- NextAuth v5 (beta) with Credentials provider (email/password with bcrypt)
- AI: Groq (production) or Ollama (local development)

### App Router Structure
- `src/app/(app)/` – Protected routes with shared layout (dashboard, assignments, calendar, settings). Uses `auth()` in layout to redirect unauthenticated users to `/login`
- `src/app/(app)/layout.tsx` – Main app shell with navigation and sign-out
- `src/app/login/` – Email/password authentication page with sign-up
- `src/app/api/` – Route handlers for Canvas sync, chat, planning, file extraction, cron jobs

### Data Flow
1. Canvas sync (`src/lib/canvas/sync.ts`): Fetches courses/assignments via REST API, upserts to DB preserving local-only fields (`AssignmentLocalState`)
2. Auto-planning (`src/lib/planning/auto-plan.ts`): Creates work sessions from assignment due dates and user availability
3. AI chat (`src/lib/ai/provider.ts`): Abstraction over Groq/Ollama with integrity controls (never write final answers by default)

### Security Model
- All database queries must be scoped by `userId` from session (`auth()` from `@/auth`)
- Canvas PAT stored server-side in `CanvasConnection` table; never returned in API responses
- Cron endpoints (`/api/cron/*`) require `Authorization: Bearer <CRON_SECRET>` header
- Assignment descriptions/attachments treated as untrusted; sanitized before AI context

### Testing Patterns
- Unit tests: Vitest with `environment: "node"`, located in `tests/unit/`
- E2E tests: Playwright with webserver auto-start, located in `tests/e2e/`
- Tests use `@/` path alias (configured in `vitest.config.ts`)

### Key Environment Variables
- `DATABASE_URL` – Supabase Postgres connection (Session pooler, port 6543)
- `AUTH_SECRET` – NextAuth secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` – Your app URL (http://localhost:3000 for dev)
- `GROQ_API_KEY` – Optional, for AI chat features
- `CANVAS_PAT` – Optional; omit to use mock data from seed
- `CRON_SECRET` – Required for cron endpoints in production

Note: Email reminders are currently disabled. Resend configuration is optional.

### Vercel Cron
Configured in `vercel.json`:
- `/api/cron/sync` – Hourly Canvas sync
- `/api/cron/reminders` – Every 15 minutes for email reminders

### AI Provider Abstraction
`src/lib/ai/provider.ts` exports `getProvider()` which returns Groq if `GROQ_API_KEY` is set, otherwise Ollama if `OLLAMA_BASE_URL` is set. Integrity modes: `help_me_learn` or `drafting_help`.
