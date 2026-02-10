# Assignment Copilot – Step-by-Step Setup

**Email reminder notifications are disabled.** You do not need a custom domain.  
You only need Resend for **magic-link login** (Resend’s free test domain is enough).

Follow every step below in order.

---

## Step 1: Check your machine

1. Open **Terminal** (Mac) or **Command Prompt** / **PowerShell** (Windows).
2. Run:
   ```bash
   node -v
   ```
   You should see something like `v20.x.x` or `v18.x.x`. If you see “command not found”, install Node.js from [nodejs.org](https://nodejs.org) (LTS version).
3. Run:
   ```bash
   npm -v
   ```
   You should see a number like `10.x.x`. npm is installed with Node.js.

---

## Step 2: Create a Supabase account and project

1. Open your browser and go to: **https://supabase.com**
2. Click **Start your project** (or **Sign in** if you already have an account).
3. Sign in with **GitHub** or **Email** and complete sign-up if needed.
4. After sign-in you’ll see the Supabase **Dashboard**.
5. Click **New project**.
6. Fill in:
   - **Organization:** leave the default (or create one if asked).
   - **Name:** type `assignment-copilot` (or any name).
   - **Database Password:** choose a strong password and **write it down**. You will need it in Step 4.
   - **Region:** pick one close to you (e.g. East US).
7. Click **Create new project**.
8. Wait 1–2 minutes until the project status is **Active** (green). Do not leave the page until it’s ready.

---

## Step 3: Get your database connection string

1. In the Supabase project, look at the **left sidebar**.
2. Click the **gear icon** at the bottom left (**Project Settings**).
3. In the left menu under **Project Settings**, click **Database**.
4. Scroll to the section **Connection string**.
5. You’ll see several tabs: **URI**, **JDBC**, **DotNet**, etc. Click **URI**.
6. You’ll see a string that looks like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
7. Click **Copy** (or select the whole string and copy it).
8. Open **Notes** or any text editor and paste it.  
   Find the part that says `[YOUR-PASSWORD]`.  
   Replace **only** `[YOUR-PASSWORD]` with the **actual database password** you set in Step 2.  
   Do not add spaces or quotes.  
   Example: if the password is `MySecret123`, the string should contain `:MySecret123@` in that spot.
9. Copy this **final** string (with the real password). You’ll use it as `DATABASE_URL` in Step 7.

---

## Step 4: Enable pgvector in Supabase

1. In the Supabase left sidebar, click **SQL Editor**.
2. Click **New query**.
3. In the big text box, type exactly:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Click **Run** (or press the run button).
5. You should see a green success message. If you see an error, double-check the SQL and try again.

---

## Step 5: Get Resend (for magic-link login only)

You do **not** need a custom domain. Resend’s test domain is enough for login.

1. Go to **https://resend.com** in your browser.
2. Click **Sign up** (or **Log in** if you have an account). Sign up with **email** or **Google**.
3. After sign-in you’ll see the Resend dashboard.
4. In the left sidebar, click **API Keys**.
5. Click **Create API Key**.
6. **Name:** type `Assignment Copilot` (or anything).
7. Leave **Permission** as **Sending access** (default).
8. Click **Add**.
9. A key will appear (starts with `re_`). Click **Copy** and paste it into Notes. You won’t see it again.
10. For “from” address we’ll use Resend’s test domain: **`onboarding@resend.dev`**. You don’t need to create or verify a domain.  
    You’ll put this in `.env.local` as `RESEND_FROM_EMAIL` in Step 7.

---

## Step 6: Open the project folder

1. Open **Terminal** (or your IDE’s terminal).
2. Go to the project folder. Type (adjust the path if your project is elsewhere):
   ```bash
   cd /Users/andrewerhardt/AssignmentCopilot
   ```
3. Press Enter. Your prompt should now show this folder as the current directory.

---

## Step 7: Create and fill your env file

1. In the same terminal, run:
   ```bash
   cp .env.example .env.local
   ```
   This creates a file named `.env.local` from the example.
2. Open the project in your editor (e.g. Cursor / VS Code).
3. In the file list, open **`.env.local`**.
4. You’ll see lines like `DATABASE_URL="..."`, `AUTH_SECRET="..."`, etc. Edit **each** of these:

   **DATABASE_URL**  
   - Replace the entire value with the **full** Supabase connection string from Step 3 (the one with your real password).  
   - It must start with `postgresql://` and contain your password.  
   - Example:
     ```
     DATABASE_URL="postgresql://postgres.abcdefghij:MySecret123@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
     ```

   **AUTH_SECRET**  
   - In the terminal, run:
     ```bash
     openssl rand -base64 32
     ```
   - Copy the output (one long line of characters).
   - In `.env.local`, replace the placeholder value for `AUTH_SECRET` with that line.  
   - Example:
     ```
     AUTH_SECRET="K7x9mN2pQ4rS6tU8vW0yZ1aB3cD5eF7gH9jL"
     ```

   **NEXTAUTH_URL**  
   - Set it to exactly:
     ```
     NEXTAUTH_URL="http://localhost:3000"
     ```
   - (No trailing slash.)

   **RESEND_API_KEY**  
   - Paste the Resend API key you copied in Step 5 (the one starting with `re_`).  
   - Example:
     ```
     RESEND_API_KEY="re_123abc456def..."
     ```

   **RESEND_FROM_EMAIL**  
   - Set it to Resend’s test address (no domain setup needed):
     ```
     RESEND_FROM_EMAIL="onboarding@resend.dev"
     ```

5. Leave these as-is for now (or fill later if you use them):
   - `CANVAS_PAT` – leave empty to use **mock** Canvas data.
   - `AZURE_OPENAI_*` – only if you want the AI chat (optional; see **Optional: AI chat** below).
   - `ENCRYPTION_KEY` – default is fine.
   - `CRON_SECRET` – optional for local dev.
6. Save **`.env.local`** (Cmd+S / Ctrl+S).

---

## Step 8: Install dependencies

1. In the terminal (still in the project folder), run:
   ```bash
   npm install
   ```
2. Wait for it to finish (can take a minute). You should see “added XXX packages” and no red errors.
3. At the end, `prisma generate` runs automatically (Prisma client is generated).

---

## Step 9: Apply database migrations

1. In the same terminal, run:
   ```bash
   npx prisma migrate deploy
   ```
2. It will read `DATABASE_URL` from `.env.local` and create all tables in Supabase.
3. You should see lines like:
   - `Applying migration 20250208000000_init`
   - `Applying migration 20250208000001_add_calendar_feed_secret`
4. If you see **“Can’t reach database server”**:
   - Check that `DATABASE_URL` in `.env.local` is the **full** string from Step 3.
   - Make sure you replaced `[YOUR-PASSWORD]` with your real database password (no quotes, no spaces).
   - In Supabase, under **Project Settings → Database**, confirm the project is **Active** and use the **Session pooler** URI (port **6543**).

---

## Step 10: Seed the database (recommended)

1. In the terminal, run:
   ```bash
   npm run db:seed
   ```
2. This creates a test user and mock courses/assignments so the app has data without a real Canvas token.
3. You should see: `Seed completed successfully` and lines like `User: student@example.edu`, `Courses: 3`, `Assignments: 5`.

---

## Step 11: Start the app

1. In the terminal, run:
   ```bash
   npm run dev
   ```
2. Wait until you see something like:
   ```
   ▲ Next.js 16.x.x
   - Local:        http://localhost:3000
   ```
3. Leave this terminal open. Do not press Ctrl+C.

---

## Step 12: Log in in the browser

1. Open your browser and go to: **http://localhost:3000**
2. You should see the Assignment Copilot home page.
3. Click **Sign in** (or go to **http://localhost:3000/login**).
4. In the **Email** field, type **your real email address** (the one you can open).
5. Click **Send magic link**.
6. Open your email inbox. Look for an email from **onboarding@resend.dev** (or whatever you set as `RESEND_FROM_EMAIL`). Subject is usually “Sign in to Assignment Copilot” or similar.
7. If you don’t see it, check **Spam**.
8. In the email, click the **Sign in** (or magic link) button.
9. The browser will open back to the app and you’ll be logged in.

You can now use:
- **Dashboard** – click **Sync Canvas** to load mock assignments (no Canvas token needed).
- **Assignments** – list and open assignments.
- **Calendar** – plan sessions; use **Auto-plan sessions** after syncing.
- **Settings** – add a Canvas token later or import an ICS file.

---

## Optional: Use real Canvas data

1. In the app, go to **Settings**.
2. Log in to your school's Canvas in another tab (for example: `https://your-school.instructure.com`).
3. In Canvas: click your **profile/avatar** (top left) → **Settings** → in the left menu **Approved Integrations** → **New Access Token**.
4. Purpose: e.g. `Assignment Copilot`. Expiry: optional. Click **Generate token**.
5. Copy the token.
6. Back in the app **Settings**, paste it into **Personal Access Token** and click **Save token**.
7. Go to **Dashboard** and click **Sync Canvas**. Your real courses and assignments will load.

---

## Optional: AI chat (Azure OpenAI / AI Foundry)

1. Go to **https://ai.azure.com** and sign in with your Azure account.
2. Create a **Foundry project** (or use an existing one).
3. Deploy a model: in **Model Catalog**, find **GPT-4.1**, click **Deploy**, choose **Serverless API**. Name the deployment (e.g. `gpt-41`).
4. Get your credentials from the deployment details:
   - **Endpoint URL**: e.g. `https://YOUR-RESOURCE.openai.azure.com/`
   - **API Key**: shown in the deployment's Keys section
   - **Deployment Name**: the name you chose (e.g. `gpt-41`)
5. In `.env.local`, add (use your real values):
   ```
   AZURE_OPENAI_ENDPOINT="https://YOUR-RESOURCE.openai.azure.com/"
   AZURE_OPENAI_API_KEY="your-key-here"
   AZURE_OPENAI_DEPLOYMENT="gpt-41"
   AZURE_OPENAI_API_VERSION="2024-10-21"
   ```
6. Save the file, then in the terminal stop the app (Ctrl+C) and run `npm run dev` again.
7. Open any assignment and use the **Chat** tab; it will use Azure OpenAI (with “Help me learn” and “Never write final answers” on by default).

---

## Summary checklist

- [ ] Node.js and npm installed (`node -v`, `npm -v`).
- [ ] Supabase project created; database password saved.
- [ ] Connection string copied; `[YOUR-PASSWORD]` replaced; final string saved.
- [ ] pgvector enabled in Supabase (SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`).
- [ ] Resend account; API key copied; `RESEND_FROM_EMAIL` set to `onboarding@resend.dev`.
- [ ] `.env.local` created; `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` filled.
- [ ] `npm install` run.
- [ ] `npx prisma migrate deploy` run.
- [ ] `npm run db:seed` run.
- [ ] `npm run dev` run; browser at http://localhost:3000.
- [ ] Signed in via magic link.

**Note:** Email reminder notifications are turned off. No domain or extra Resend setup is required for reminders.
