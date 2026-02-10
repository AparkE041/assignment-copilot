import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { autoPlan } from "@/lib/planning/auto-plan";
import { normalizeAvailabilityBlocksForPlanning } from "@/lib/availability/normalize-for-planning";

/** Default availability when user has none: weekdays 9am–5pm for the next 45 days. */
function getDefaultAvailability(): { startAt: Date; endAt: Date }[] {
  const now = new Date();
  const blocks: { startAt: Date; endAt: Date }[] = [];
  for (let d = 0; d < 45; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const day = date.getDay();
    if (day === 0 || day === 6) continue; // skip weekend
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(17, 0, 0, 0);
    if (end > now) blocks.push({ startAt: start, endAt: end });
  }
  return blocks;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const assignmentId = body.assignmentId as string | undefined;
  const requestedTimeZone =
    typeof body.timeZone === "string" ? body.timeZone.trim() : null;

  const userId = session.user.id;

  const [assignments, availabilityBlocks, user] = await Promise.all([
    prisma.assignment.findMany({
      where: assignmentId ? { id: assignmentId, course: { userId } } : { course: { userId } },
      include: { localState: true },
    }),
    prisma.availabilityBlock.findMany({
      where: { userId },
      orderBy: { startAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),
  ]);

  let effectiveTimeZone = user?.timezone?.trim() || null;
  if (requestedTimeZone) {
    try {
      // Validate incoming browser timezone before using or storing it.
      new Intl.DateTimeFormat("en-US", { timeZone: requestedTimeZone });
      effectiveTimeZone = requestedTimeZone;
      if (requestedTimeZone !== user?.timezone) {
        await prisma.user.update({
          where: { id: userId },
          data: { timezone: requestedTimeZone },
        });
      }
    } catch {
      // Ignore invalid timezone input and keep stored user timezone.
    }
  }

  const assignmentForPlan = assignments.map((a) => ({
    id: a.id,
    dueAt: a.dueAt,
    status: a.localState?.status ?? "not_started",
    estimatedEffortMinutes: a.localState?.estimatedEffortMinutes ?? 60,
    priority: a.localState?.priority ?? 0,
  }));

  let availability = normalizeAvailabilityBlocksForPlanning(
    availabilityBlocks.map((b) => ({ startAt: b.startAt, endAt: b.endAt })),
    { timeZone: effectiveTimeZone ?? undefined },
  ).filter((b) => b.endAt > new Date()); // only future blocks
  if (availability.length === 0) {
    availability = getDefaultAvailability();
  }

  const sessions = autoPlan(assignmentForPlan, availability);

  // Delete existing planned sessions for these assignments (or all if not assignmentId)
  const assignIds = assignments.map((a) => a.id);
  await prisma.plannedSession.deleteMany({
    where: {
      userId,
      assignmentId: assignmentId ? assignmentId : { in: assignIds },
    },
  });

  // Create new sessions
  const created = await prisma.plannedSession.createManyAndReturn({
    data: sessions.map((s) => ({
      assignmentId: s.assignmentId,
      userId,
      startAt: s.startAt,
      endAt: s.endAt,
      completed: false,
    })),
  });

  return NextResponse.json({ sessions: created });
}
