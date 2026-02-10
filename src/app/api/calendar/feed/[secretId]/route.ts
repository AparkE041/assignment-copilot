import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateIcs } from "@/lib/ics/generator";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ secretId: string }> }
) {
  const { secretId } = await params;

  const user = await prisma.user.findFirst({
    where: { calendarFeedSecret: secretId },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessions = await prisma.plannedSession.findMany({
    where: { userId: user.id },
    include: { assignment: true },
    orderBy: { startAt: "asc" },
  });

  const events = sessions.map((s) => ({
    id: s.id,
    title: s.assignment.title,
    startAt: s.startAt,
    endAt: s.endAt,
  }));

  const ics = generateIcs(events);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=assignment-copilot.ics",
    },
  });
}
