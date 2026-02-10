# Assignment Copilot – Manual Testing Guide

Use this checklist to verify auth, onboarding, and main features in the browser.

**Prerequisites:** Database is set up (see `SETUP.md`), `.env.local` has `DATABASE_URL` and `AUTH_SECRET`. Start the app:

```bash
npm run dev
```

Then open **http://localhost:3000** (or the port shown in the terminal).

---

## 1. Landing & Navigation

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open http://localhost:3000 | Landing page: hero, “Your Academic Co-Pilot”, features, CTA. |
| 1.2 | Click **Get Started** or **Sign in** | Navigate to `/login`. |
| 1.3 | Click logo or back to home | Return to `/`. |

---

## 2. Auth – Sign Up (New User)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | On `/login`, select **Sign Up** (toggle). | Form shows Email, Password, **Name**. |
| 2.2 | Enter a **new** email (e.g. `test@example.com`), password (≥8 chars), name. | No error yet. |
| 2.3 | Click **Sign Up**. | Request succeeds; redirect to **/onboarding**. |
| 2.4 | If you see “CredentialsSignin” or “Invalid credentials” | Check: email unique, password ≥8 chars; check terminal/network for API errors. |

---

## 3. Onboarding

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | On first step | “Welcome to Assignment Copilot”, progress bar, **Continue**. |
| 3.2 | Click **Continue** | Step 2: “What you can do” (features). |
| 3.3 | Click **Continue** | Step 3: “Connect to Canvas” – optional PAT field. |
| 3.4 | (Optional) Paste a Canvas PAT, or click **Skip for now** | Step 4: “You’re all set!”. |
| 3.5 | Click **Get Started** | Loading briefly, then redirect to **/dashboard**. |

---

## 4. Auth – Sign In (Existing User)

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Sign out (nav → Log out icon). | Redirect to `/` or `/login`. |
| 4.2 | Go to `/login`, ensure **Sign In** is selected. | Form: Email, Password only. |
| 4.3 | Enter same email & password used in 2.2. | — |
| 4.4 | Click **Sign In**. | Redirect to **/dashboard** (onboarding already done). |
| 4.5 | Wrong password | “Invalid credentials” or similar; stay on login. |

---

## 5. Protected Routes & Onboarding Redirect

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | While signed out, open http://localhost:3000/dashboard | Redirect to **/login**. |
| 5.2 | Sign in with a user who has **not** completed onboarding. | Redirect to **/onboarding** until they complete it. |
| 5.3 | Complete onboarding with that user. | After “Get Started”, redirect to **/dashboard** and no longer to onboarding. |

---

## 6. Dashboard

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | View dashboard while signed in. | Header “Dashboard”, “Sync Canvas” button, four stat cards (Total, Completed, In Progress, Urgent). |
| 6.2 | With no data | “Today’s Sessions” and “Urgent Assignments” show empty states; “Sync Canvas” and quick links work. |
| 6.3 | Click **Sync Canvas** | Button shows loading; then stats/list update (or stay empty if no PAT/mock). |
| 6.4 | Click **Assignments**, **Calendar**, **Settings** in nav | Each page loads without error. |

---

## 7. Assignments

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Open **Assignments**. | List of assignments (or empty state with “Sync Canvas” link). |
| 7.2 | If list has items | Click one assignment. | Assignment detail: title, course, summary, requirements, checklist, plan, chat, etc. |
| 7.3 | On detail | Change status, add checklist item, or use AI chat if implemented. | Changes save and UI updates. |

---

## 8. Calendar

| Step | Action | Expected |
|------|--------|----------|
| 8.1 | Open **Calendar**. | Week/month view, “Auto-plan” and “Import availability (ICS)” (or similar). |
| 8.2 | (If implemented) Use **Auto-plan** | Sessions appear on calendar. |
| 8.3 | (If implemented) Drag a session | Time/date updates. |

---

## 9. Settings

| Step | Action | Expected |
|------|--------|----------|
| 9.1 | Open **Settings**. | Sections: Profile, Password, Canvas, Availability (ICS), Calendar Export. |
| 9.2 | Canvas | Enter PAT and save (or disconnect). | Success message or state change. |
| 9.3 | Availability | Upload an .ics file. | Import succeeds or shows clear error. |
| 9.4 | Calendar Export | Copy feed URL or “Generate” if available. | URL copies; subscription works in Apple Calendar (or similar). |

---

## 10. Sign Out & Session

| Step | Action | Expected |
|------|--------|----------|
| 10.1 | Click **Log out** (nav). | Signed out; redirect to `/` or `/login`. |
| 10.2 | Open `/dashboard` again. | Redirect to **/login**. |

---

## Quick Smoke Test (Minimal)

1. **Start:** `npm run dev` → open http://localhost:3000  
2. **Sign up:** Login → Sign Up → email, password (≥8), name → Sign Up → **/onboarding**  
3. **Onboarding:** Continue through steps → optional Canvas PAT or Skip → Get Started → **/dashboard**  
4. **Dashboard:** See stats and sections; click Assignments, Calendar, Settings.  
5. **Sign out:** Log out → confirm redirect to home/login.

If all of the above pass, core auth, onboarding, and navigation are working.
