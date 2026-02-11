import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { encryptSecret, hasEncryptionKeyConfigured } from "@/lib/secret-crypto";
import { verifyTotpCode } from "@/lib/auth/totp";

export async function POST(req: Request) {
  try {
    // Rate limiting: 5 registration attempts per 15 minutes per IP
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(`register:${clientIp}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
      scope: "auth_register",
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many registration attempts. Please try again later.",
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() || null : null;
    const twoFactorEnabled = body.twoFactorEnabled !== false;
    const twoFactorSecret =
      typeof body.twoFactorSecret === "string" ? body.twoFactorSecret.trim() : "";
    const twoFactorCode =
      typeof body.twoFactorCode === "string" ? body.twoFactorCode.trim() : "";
    const email = rawEmail.toLowerCase();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (!twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is required for new accounts." },
        { status: 400 }
      );
    }

    if (!hasEncryptionKeyConfigured()) {
      return NextResponse.json(
        {
          error:
            "Server is missing ENCRYPTION_KEY. Two-factor setup is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    if (!twoFactorSecret || !twoFactorCode) {
      return NextResponse.json(
        {
          error:
            "Complete two-factor setup: scan the authenticator QR code and enter a 6-digit code.",
        },
        { status: 400 }
      );
    }

    if (
      !verifyTotpCode({
        secret: twoFactorSecret,
        code: twoFactorCode,
      })
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid 2FA code. Check your authenticator app and try again.",
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate calendar feed secret
    const calendarFeedSecret = crypto.randomUUID();

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        calendarFeedSecret,
        twoFactorEnabled: true,
        twoFactorSecret: encryptSecret(twoFactorSecret),
        hasOnboarded: false,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: unknown) {
    console.error("Registration error:", error);

    // Prisma unique constraint (e.g. email or calendarFeedSecret collision)
    const prismaError = error as { code?: string; meta?: { target?: string[] } };
    if (prismaError?.code === "P2002") {
      const target = prismaError.meta?.target as string[] | undefined;
      if (target?.includes("email")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Prisma connection / DB errors
    if (prismaError?.code === "P1001" || prismaError?.code === "P1002") {
      return NextResponse.json(
        { error: "Database unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
