import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  buildTotpUri,
  formatManualEntryKey,
  generateTotpSecret,
} from "@/lib/auth/totp";

const ISSUER = "Assignment Copilot";

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`2fa-setup:${clientIp}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Too many attempts. Please try again later.",
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : "new-user";

  const secret = generateTotpSecret();
  const otpauthUrl = buildTotpUri({
    secret,
    accountName: email,
    issuer: ISSUER,
  });

  return NextResponse.json({
    secret,
    manualEntryKey: formatManualEntryKey(secret),
    issuer: ISSUER,
    otpauthUrl,
  });
}
