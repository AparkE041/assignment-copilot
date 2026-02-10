# Security Notes & Threat Model

## Production Checklist

- [ ] `AUTH_SECRET` set to a strong random value (e.g. `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` set to production URL (no trailing slash)
- [ ] `CRON_SECRET` set; cron routes require `Authorization: Bearer <CRON_SECRET>`
- [ ] `DATABASE_URL` uses TLS; Supabase session pooler recommended
- [ ] Do **not** run `npm run db:seed` in production (seed is dev-only)
- [ ] `ENCRYPTION_KEY` set to 32-byte hex if storing sensitive tokens at rest

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Token leakage | Canvas PAT and Azure keys stored server-side only; never exposed in API responses or client |
| Prompt injection | Canvas HTML treated as untrusted; sanitized before AI context |
| Data leakage | RAG scope limited to current assignment; all queries scoped by `userId` |
| Cron abuse | Cron routes validate `CRON_SECRET` header |
| Session hijacking | NextAuth JWT; secure session; secure cookies in production |
| Clickjacking | `X-Frame-Options: DENY` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |

## Token Security

- Canvas PAT stored in `CanvasConnection.accessToken` (server-only)
- Azure API keys stored in `AiSettings` or env; never logged or returned
- Optional: encrypt tokens at rest with `ENCRYPTION_KEY`
- Never log or return tokens in API responses

## Prompt Injection Defenses

- Assignment descriptions and attachments are treated as untrusted
- Content passed to AI is truncated and clearly marked as context
- Integrity rules in system prompt restrict output (e.g., no final answers)

## Data Isolation

- All queries scoped by `userId` from session
- No cross-user assignment or chat access
