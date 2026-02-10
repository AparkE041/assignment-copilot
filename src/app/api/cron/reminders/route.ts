import { NextResponse } from "next/server";

// Vercel Cron calls this every 15 min. Validate CRON_SECRET.
// Email reminders are disabled (no domain/Resend required for notifications).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Email notifications disabled. Reminder logic skipped; no emails sent.
  return NextResponse.json({
    ok: true,
    sent: 0,
    skipped: 0,
    message: "Email reminders are disabled.",
  });
}
