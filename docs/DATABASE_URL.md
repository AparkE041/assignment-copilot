# Fix: Can't reach database server (Supabase)

Prisma needs the **Session pooler** connection string, not the Direct connection.

## Steps

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **Project Settings** (gear icon) → **Database**.
3. Scroll to **Connection string**.
4. Select the **"Session pooler"** (or **"Connection pooling"**) tab — **not** "Direct connection".
5. Choose **URI**.
6. Copy the string. It will look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   Important: **port is 6543**, and host is `aws-0-[REGION].pooler.supabase.com`.
7. Replace `[YOUR-PASSWORD]` with your database password.  
   If the password contains special characters (e.g. `!`, `#`, `@`), URL-encode them:
   - `!` → `%21`
   - `#` → `%23`
   - `@` → `%40`
   - Or use the **"Use connection string"** copy in Supabase — it may show the encoded password.
8. In `.env.local`, set:
   ```
   DATABASE_URL="postgresql://postgres.dqewgoxotqkdvfzasgrj:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   ```
   Use your actual **region** (e.g. `us-east-1`, `eu-west-1`) and **password** from the Supabase copy.
9. Save `.env.local` and run again:
   ```bash
   npx prisma migrate deploy
   ```

## If you don't see Session pooler

- In **Database** settings, look for **Connection pooling** or **Session mode**.
- The pooler URI uses port **6543** and host `*.pooler.supabase.com`. The direct URI uses port **5432** and host `db.*.supabase.co` — don't use that one for Prisma from your machine.
