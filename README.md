# Assignment Copilot

Plan, track, and get AI help on your coursework. Connects to Canvas LMS, plans work sessions on a calendar, sends email reminders, and provides an AI assistant with integrity controls.

## Features

- **Canvas integration**: Sync courses and assignments from your Canvas instance (PAT auth)
- **Calendar**: Week/month views, auto-plan sessions, drag/drop
- **Reminders**: Email reminders via Resend (48h, 6h, session start)
- **Assignment summaries**: Extract deliverables, constraints, rubric highlights
- **Attachment ingestion**: PDF, DOCX, XLSX text extraction
- **AI assistant**: Per-assignment chat with Groq/Ollama; Help me learn / Drafting help modes; Never write final answers (default ON)
- **Availability**: ICS file upload; ICS feed for Apple Calendar subscription

## Tech Stack

- Next.js 15, TypeScript, Tailwind, shadcn/ui
- Prisma + Supabase Postgres
- NextAuth (magic link), Resend
- Groq (default AI), Ollama (local dev)

## Getting Started

```bash
cp .env.example .env.local
# Fill DATABASE_URL, AUTH_SECRET, RESEND_API_KEY, etc.
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

See [.env.example](.env.example) for required variables. Mock mode works without `CANVAS_PAT`.

## Scripts

- `npm run dev` – development server
- `npm run build` – production build
- `npm run db:migrate:deploy` – apply migrations in production
- `npm run db:seed` – seed mock data
- `npm run test` – unit tests (Vitest)
- `npm run test:e2e` – E2E tests (Playwright)

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel + Supabase + Resend setup.

## Security

See [SECURITY.md](SECURITY.md) for threat model and mitigations.
