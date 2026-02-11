import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-crypto";
import { syncCanvas } from "@/lib/canvas/sync";
import { syncAvailabilitySubscription } from "@/lib/availability/subscriptions";

const ICS_UPLOAD_SOURCES = ["ics", "ics_upload"];

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const [
    canvasConnection,
    canvasLogs,
    subscriptions,
    icsBlocks,
    latestIcsLog,
  ] = await Promise.all([
    prisma.canvasConnection.findUnique({
      where: { userId },
      select: { id: true, updatedAt: true },
    }),
    prisma.syncLog.findMany({
      where: { userId, type: "canvas_full" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { status: true, message: true, createdAt: true },
    }),
    prisma.availabilitySubscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        lastSyncedAt: true,
        lastSyncStatus: true,
        lastSyncMessage: true,
      },
    }),
    prisma.availabilityBlock.findMany({
      where: { userId, source: { in: ICS_UPLOAD_SOURCES } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.syncLog.findFirst({
      where: { userId, type: "availability_ics_import" },
      orderBy: { createdAt: "desc" },
      select: { status: true, message: true, createdAt: true },
    }),
  ]);

  const latestCanvas = canvasLogs[0] ?? null;
  const lastCanvasSuccess = canvasLogs.find((logItem) => logItem.status === "success") ?? null;
  const lastCanvasFailure = canvasLogs.find((logItem) => logItem.status === "failed") ?? null;

  const icsDiagnostic = safeParseJson<{
    imported?: number;
    parsedEvents?: number;
    ignoredEvents?: number;
  }>(latestIcsLog?.message ?? null);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    canvas: {
      connected: !!canvasConnection,
      lastStatus: latestCanvas?.status ?? "never",
      lastMessage: latestCanvas?.message ?? null,
      lastAttemptAt: latestCanvas?.createdAt.toISOString() ?? null,
      lastSuccessAt: lastCanvasSuccess?.createdAt.toISOString() ?? null,
      lastFailureAt: lastCanvasFailure?.createdAt.toISOString() ?? null,
    },
    icsUpload: {
      importedBlocks: icsBlocks.length,
      latestImportedAt: icsBlocks[0]?.createdAt.toISOString() ?? null,
      lastStatus: latestIcsLog?.status ?? "never",
      lastAttemptAt: latestIcsLog?.createdAt.toISOString() ?? null,
      lastMessage: latestIcsLog?.message ?? null,
      parsedEvents: icsDiagnostic?.parsedEvents ?? null,
      ignoredEvents: icsDiagnostic?.ignoredEvents ?? null,
    },
    subscriptions: {
      total: subscriptions.length,
      success: subscriptions.filter((sub) => sub.lastSyncStatus === "success").length,
      failed: subscriptions.filter((sub) => sub.lastSyncStatus === "failed").length,
      neverSynced: subscriptions.filter((sub) => !sub.lastSyncStatus).length,
      items: subscriptions.map((sub) => ({
        id: sub.id,
        name: sub.name,
        lastStatus: sub.lastSyncStatus ?? "never",
        lastSyncedAt: sub.lastSyncedAt?.toISOString() ?? null,
        lastMessage: sub.lastSyncMessage ?? null,
      })),
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const target = typeof body.target === "string" ? body.target : "";
  const subscriptionId =
    typeof body.subscriptionId === "string" ? body.subscriptionId : null;

  if (target === "canvas") {
    const connection = await prisma.canvasConnection.findUnique({
      where: { userId },
      select: { accessToken: true },
    });
    const token = decryptSecret(connection?.accessToken)?.trim() ?? null;
    if (!token) {
      return NextResponse.json(
        { error: "Canvas token not found. Reconnect Canvas in Settings." },
        { status: 400 },
      );
    }

    const result = await syncCanvas(userId, token);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Canvas sync failed." },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, target: "canvas", result });
  }

  if (target === "subscriptions") {
    const subscriptions = await prisma.availabilitySubscription.findMany({
      where: subscriptionId ? { id: subscriptionId, userId } : { userId },
      select: { id: true },
    });
    if (subscriptionId && subscriptions.length === 0) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    const results: {
      id: string;
      success: boolean;
      imported?: number;
      error?: string;
    }[] = [];
    for (const subscription of subscriptions) {
      try {
        const { imported } = await syncAvailabilitySubscription(subscription.id);
        results.push({ id: subscription.id, success: true, imported });
      } catch (error) {
        results.push({
          id: subscription.id,
          success: false,
          error: error instanceof Error ? error.message : "Sync failed.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      target: "subscriptions",
      attempted: results.length,
      failed: results.filter((item) => !item.success).length,
      results,
    });
  }

  return NextResponse.json(
    { error: "Invalid retry target. Use 'canvas' or 'subscriptions'." },
    { status: 400 },
  );
}
