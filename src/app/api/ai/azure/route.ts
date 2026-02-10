import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

/**
 * POST /api/ai/azure - Save Azure OpenAI settings (endpoint, API key, deployment)
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() || null : null;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() || null : null;
  const deployment = typeof body.deployment === "string" ? body.deployment.trim() || null : null;
  const encryptedApiKey = apiKey ? encryptSecret(apiKey) ?? apiKey : null;

  try {
    await prisma.aiSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        openRouterKey: encryptedApiKey,
        azureEndpoint: endpoint,
        azureDeployment: deployment,
      },
      update: {
        openRouterKey: encryptedApiKey,
        azureEndpoint: endpoint,
        azureDeployment: deployment,
      },
    });
  } catch (err) {
    console.error("Azure settings save error:", err);
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * GET /api/ai/azure - Check if Azure OpenAI is configured
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.aiSettings.findUnique({
    where: { userId: session.user.id },
  });

  const configured = !!(
    decryptSecret(settings?.openRouterKey)?.trim() &&
    settings?.azureEndpoint?.trim()
  );

  return NextResponse.json({
    configured,
    endpoint: settings?.azureEndpoint ?? undefined,
    deployment: settings?.azureDeployment ?? undefined,
  });
}
