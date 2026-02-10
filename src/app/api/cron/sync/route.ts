import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-crypto";

// Vercel Cron calls this hourly. Sync Canvas for all connected users.
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

  const connections = await prisma.canvasConnection.findMany();
  const { syncCanvas } = await import("@/lib/canvas/sync");

  const results = [];
  for (const conn of connections) {
    try {
      const token = decryptSecret(conn.accessToken)?.trim();
      if (!token) {
        results.push({
          userId: conn.userId,
          success: false,
          error: "Missing or unreadable Canvas token",
        });
        continue;
      }
      const result = await syncCanvas(conn.userId, token);
      results.push({ userId: conn.userId, ...result });
    } catch (err) {
      results.push({
        userId: conn.userId,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
