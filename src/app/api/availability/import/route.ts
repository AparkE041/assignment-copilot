import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseIcs } from "@/lib/ics/parser";

const ICS_UPLOAD_SOURCES = ["ics", "ics_upload"];

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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  const events = parseIcs(text, {
    defaultTimeZone: user?.timezone ?? undefined,
  }).filter(
    (event) => event.end instanceof Date && event.start instanceof Date && event.end > event.start,
  );

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
