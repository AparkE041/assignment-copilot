import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseIcsWithDiagnostics } from "@/lib/ics/parser";

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
  const blocks = await prisma.availabilityBlock.findMany({
    where: { userId, source: { in: ICS_UPLOAD_SOURCES } },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const latestLog = await prisma.syncLog.findFirst({
    where: { userId, type: "availability_ics_import" },
    orderBy: { createdAt: "desc" },
    select: { status: true, message: true, createdAt: true },
  });
  const diagnostics = safeParseJson<{
    diagnostics?: {
      totalEvents?: number;
      parsedEvents?: number;
      ignoredEvents?: number;
      ignored?: { reason: string; count: number; examples?: string[] }[];
    };
  }>(latestLog?.message ?? null)?.diagnostics;

  return NextResponse.json({
    importedBlocks: blocks.length,
    latestImportedAt: blocks[0]?.createdAt?.toISOString() ?? null,
    lastStatus: latestLog?.status ?? "never",
    lastAttemptAt: latestLog?.createdAt?.toISOString() ?? null,
    diagnostics: diagnostics ?? null,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "ICS file required" },
      { status: 400 }
    );
  }

  const text = await file.text();
  const userId = session.user.id;
  let defaultTimeZone: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    defaultTimeZone = user?.timezone ?? null;
  } catch (error) {
    console.warn("Could not read user timezone for ICS import:", error);
  }

  const parsed = parseIcsWithDiagnostics(text, {
    defaultTimeZone: defaultTimeZone ?? undefined,
  });
  const events = parsed.events.filter(
    (event) => event.end instanceof Date && event.start instanceof Date && event.end > event.start,
  );

  if (events.length === 0) {
    await prisma.syncLog.create({
      data: {
        userId,
        type: "availability_ics_import",
        status: "failed",
        message: JSON.stringify({
          imported: 0,
          diagnostics: parsed.diagnostics,
        }),
      },
    });
    return NextResponse.json(
      {
        error:
          "No calendar events were found in this ICS file. Make sure the file contains VEVENT entries with DTSTART/DTEND (or DURATION).",
        diagnostics: parsed.diagnostics,
      },
      { status: 422 },
    );
  }

  // Delete existing ICS blocks for this user
  await prisma.availabilityBlock.deleteMany({
    where: { userId, source: { in: ICS_UPLOAD_SOURCES } },
  });

  const created = await prisma.availabilityBlock.createManyAndReturn({
    data: events.map((e) => ({
      userId,
      startAt: e.start,
      endAt: e.end,
      source: "ics_upload",
    })),
  });

  await prisma.syncLog.create({
    data: {
      userId,
      type: "availability_ics_import",
      status: "success",
      message: JSON.stringify({
        imported: created.length,
        diagnostics: parsed.diagnostics,
      }),
    },
  });

  return NextResponse.json({
    imported: created.length,
    blocks: created,
    diagnostics: parsed.diagnostics,
  });
}
