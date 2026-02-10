import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncCanvas } from "@/lib/canvas/sync";
import { decryptSecret } from "@/lib/secret-crypto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  let accessToken: string | null = null;

  // Try to get token from CanvasConnection
  const connection = await prisma.canvasConnection.findUnique({
    where: { userId },
  });
  accessToken = decryptSecret(connection?.accessToken)?.trim() ?? null;

  // Or from request body (first-time connect)
  if (!accessToken) {
    const body = await request.json().catch(() => ({}));
    accessToken =
      (typeof body.token === "string" ? body.token.trim() : null) ??
      process.env.CANVAS_PAT?.trim() ??
      null;
  }

  if (
    !accessToken &&
    process.env.NODE_ENV === "production" &&
    process.env.CANVAS_ALLOW_MOCK !== "true"
  ) {
    return NextResponse.json(
      {
        error:
          "No Canvas token configured. Connect Canvas in Settings before syncing.",
      },
      { status: 400 }
    );
  }

  // In mock mode (no PAT), use empty token - client returns mock data
  const tokenToUse = accessToken ?? "";

  const result = await syncCanvas(userId, tokenToUse);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Sync failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(result);
}
