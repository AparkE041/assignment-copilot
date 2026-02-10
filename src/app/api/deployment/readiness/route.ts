import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  hasEncryptionKeyConfigured,
  isEncryptedSecret,
} from "@/lib/secret-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckStatus = "pass" | "warn" | "fail";

interface ReadinessCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
}

function envStatus(
  isSet: boolean,
  inProduction: boolean,
  requiredInProd = true,
): CheckStatus {
  if (isSet) return "pass";
  if (inProduction && requiredInProd) return "fail";
  return "warn";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inProduction = process.env.NODE_ENV === "production";
  const checks: ReadinessCheck[] = [];

  const databaseUrlSet = !!process.env.DATABASE_URL?.trim();
  checks.push({
    id: "database_url",
    label: "DATABASE_URL",
    status: envStatus(databaseUrlSet, inProduction),
    detail: databaseUrlSet
      ? "Database connection string is set."
      : "Database connection string is missing.",
    action: databaseUrlSet
      ? undefined
      : "Set DATABASE_URL in your deployment environment.",
  });

  const authSecretSet = !!(
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
  );
  checks.push({
    id: "auth_secret",
    label: "AUTH_SECRET",
    status: envStatus(authSecretSet, inProduction),
    detail: authSecretSet
      ? "Auth secret is configured."
      : "Auth secret is missing.",
    action: authSecretSet
      ? undefined
      : "Generate with `openssl rand -base64 32` and set AUTH_SECRET.",
  });

  const nextAuthUrlSet = !!process.env.NEXTAUTH_URL?.trim();
  checks.push({
    id: "nextauth_url",
    label: "NEXTAUTH_URL",
    status: envStatus(nextAuthUrlSet, inProduction),
    detail: nextAuthUrlSet
      ? "Auth callback URL is configured."
      : "Auth callback URL is missing.",
    action: nextAuthUrlSet
      ? undefined
      : "Set NEXTAUTH_URL to your deployed HTTPS URL.",
  });

  const cronSecretSet = !!process.env.CRON_SECRET?.trim();
  checks.push({
    id: "cron_secret",
    label: "CRON_SECRET",
    status: envStatus(cronSecretSet, inProduction),
    detail: cronSecretSet
      ? "Cron routes are protected."
      : "Cron secret is not set.",
    action: cronSecretSet
      ? undefined
      : "Set CRON_SECRET if you use scheduled sync/reminders.",
  });

  const encryptionKeySet = hasEncryptionKeyConfigured();
  checks.push({
    id: "encryption_key",
    label: "ENCRYPTION_KEY",
    status: envStatus(encryptionKeySet, inProduction, false),
    detail: encryptionKeySet
      ? "Secret encryption key is configured."
      : "Secret encryption key is not configured.",
    action: encryptionKeySet
      ? undefined
      : "Set ENCRYPTION_KEY with `openssl rand -hex 16` or `openssl rand -hex 32`.",
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      id: "database_ping",
      label: "Database Connectivity",
      status: "pass",
      detail: "Database query succeeded.",
    });
  } catch (err) {
    checks.push({
      id: "database_ping",
      label: "Database Connectivity",
      status: "fail",
      detail:
        err instanceof Error ? err.message : "Database query failed unexpectedly.",
      action: "Verify DATABASE_URL, credentials, and network access.",
    });
  }

  try {
    const connection = await prisma.canvasConnection.findUnique({
      where: { userId: session.user.id },
      select: { accessToken: true },
    });
    const storedToken = decryptSecret(connection?.accessToken)?.trim() ?? null;
    const envToken = process.env.CANVAS_PAT?.trim() ?? null;
    const hasCanvasToken = !!storedToken || !!envToken;
    const unreadableEncryptedToken =
      !!connection?.accessToken &&
      isEncryptedSecret(connection.accessToken) &&
      !storedToken;

    checks.push({
      id: "canvas_token",
      label: "Canvas Token",
      status: unreadableEncryptedToken
        ? "fail"
        : hasCanvasToken
          ? "pass"
          : "warn",
      detail: unreadableEncryptedToken
        ? "Stored Canvas token could not be decrypted with current ENCRYPTION_KEY."
        : hasCanvasToken
          ? "Canvas token is configured."
          : "Canvas token is not configured for this account.",
      action: unreadableEncryptedToken
        ? "Re-save Canvas token in Settings after configuring ENCRYPTION_KEY."
        : hasCanvasToken
          ? undefined
          : "Connect Canvas in Settings before running sync.",
    });
  } catch (err) {
    checks.push({
      id: "canvas_token",
      label: "Canvas Token",
      status: "fail",
      detail:
        err instanceof Error
          ? err.message
          : "Failed to validate Canvas token configuration.",
      action: "Retry after database connectivity is restored.",
    });
  }

  try {
    const aiSettings = await prisma.aiSettings.findUnique({
      where: { userId: session.user.id },
      select: { openRouterKey: true, azureEndpoint: true },
    });
    const storedApiKey = decryptSecret(aiSettings?.openRouterKey)?.trim() ?? null;
    const envApiKey = process.env.AZURE_OPENAI_API_KEY?.trim() ?? null;
    const endpoint =
      aiSettings?.azureEndpoint?.trim() ??
      process.env.AZURE_OPENAI_ENDPOINT?.trim() ??
      null;
    const unreadableEncryptedKey =
      !!aiSettings?.openRouterKey &&
      isEncryptedSecret(aiSettings.openRouterKey) &&
      !storedApiKey;
    const isAiConfigured = !!(endpoint && (storedApiKey || envApiKey));

    checks.push({
      id: "azure_ai",
      label: "Azure OpenAI",
      status: unreadableEncryptedKey
        ? "fail"
        : isAiConfigured
          ? "pass"
          : "warn",
      detail: unreadableEncryptedKey
        ? "Stored Azure API key could not be decrypted with current ENCRYPTION_KEY."
        : isAiConfigured
          ? "Azure OpenAI credentials are configured."
          : "Azure OpenAI is not configured.",
      action: unreadableEncryptedKey
        ? "Re-save Azure settings after configuring ENCRYPTION_KEY."
        : isAiConfigured
          ? undefined
          : "Configure endpoint and API key in Settings if you use AI features.",
    });
  } catch (err) {
    checks.push({
      id: "azure_ai",
      label: "Azure OpenAI",
      status: "fail",
      detail:
        err instanceof Error
          ? err.message
          : "Failed to validate Azure OpenAI configuration.",
      action: "Retry after database connectivity is restored.",
    });
  }

  if (inProduction && process.env.CANVAS_ALLOW_MOCK === "true") {
    checks.push({
      id: "mock_mode",
      label: "Canvas Mock Mode",
      status: "fail",
      detail: "CANVAS_ALLOW_MOCK is enabled in production.",
      action: "Disable CANVAS_ALLOW_MOCK in production to avoid inconsistent data.",
    });
  }

  const failures = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;

  return NextResponse.json({
    readyForDeployment: failures === 0,
    failures,
    warnings,
    environment: inProduction ? "production" : "development",
    checkedAt: new Date().toISOString(),
    checks,
  });
}
