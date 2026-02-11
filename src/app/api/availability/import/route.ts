import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseIcs } from "@/lib/ics/parser";

const ICS_UPLOAD_SOURCES = ["ics", "ics_upload"];

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

  return NextResponse.json({
    importedBlocks: blocks.length,
    latestImportedAt: blocks[0]?.createdAt?.toISOString() ?? null,
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

  const events = parseIcs(text, {
    defaultTimeZone: defaultTimeZone ?? undefined,
  }).filter(
    (event) => event.end instanceof Date && event.start instanceof Date && event.end > event.start,
  );

  if (events.length === 0) {
    return NextResponse.json(
      {
        error:
          "No calendar events were found in this ICS file. Make sure the file contains VEVENT entries with DTSTART/DTEND (or DURATION).",
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

  return NextResponse.json({
    imported: created.length,
    blocks: created,
  });
}
