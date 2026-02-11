import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { autoPlan } from "@/lib/planning/auto-plan";
import {
  buildDefaultAvailabilityForPlanning,
  normalizeAvailabilityBlocksForPlanning,
} from "@/lib/availability/normalize-for-planning";
import {
  isBusyCalendarSource,
  subtractBusyFromAvailability,
} from "@/lib/availability/derive-free-windows";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const assignmentId = body.assignmentId as string | undefined;
    const requestedTimeZone =
      typeof body.timeZone === "string" ? body.timeZone.trim() : null;

    const userId = session.user.id;

    const [assignments, availabilityBlocks] = await Promise.all([
      prisma.assignment.findMany({
        where: assignmentId ? { id: assignmentId, course: { userId } } : { course: { userId } },
        include: { localState: true },
      }),
      prisma.availabilityBlock.findMany({
        where: { userId },
        orderBy: { startAt: "asc" },
      }),
    ]);

    let storedTimeZone: string | null = null;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      });
      storedTimeZone = user?.timezone?.trim() ?? null;
    } catch (error) {
      console.warn("Could not read user timezone for planning:", error);
    }

    let effectiveTimeZone = storedTimeZone;
    if (requestedTimeZone) {
      try {
        // Validate incoming browser timezone before using or storing it.
        new Intl.DateTimeFormat("en-US", { timeZone: requestedTimeZone });
        effectiveTimeZone = requestedTimeZone;
        if (requestedTimeZone !== storedTimeZone) {
          await prisma.user.update({
            where: { id: userId },
            data: { timezone: requestedTimeZone },
          });
        }
      } catch {
        // Ignore invalid timezone input and keep stored timezone.
      }
    }

    const assignmentForPlan = assignments.map((a) => ({
      id: a.id,
      dueAt: a.dueAt,
      status: a.localState?.status ?? "not_started",
      estimatedEffortMinutes: a.localState?.estimatedEffortMinutes ?? 60,
      priority: a.localState?.priority ?? 0,
    }));

    const now = new Date();
    const busyBlocks = availabilityBlocks
      .filter((block) => isBusyCalendarSource(block.source))
      .map((block) => ({ startAt: block.startAt, endAt: block.endAt }))
      .filter((block) => block.endAt > now);

    const explicitAvailabilityBlocks = availabilityBlocks
      .filter((block) => !isBusyCalendarSource(block.source))
      .map((block) => ({ startAt: block.startAt, endAt: block.endAt }))
      .filter((block) => block.endAt > now);

    const baseAvailabilityRaw =
      explicitAvailabilityBlocks.length > 0
        ? explicitAvailabilityBlocks
        : buildDefaultAvailabilityForPlanning({
            timeZone: effectiveTimeZone ?? undefined,
          });
    const baseAvailability = normalizeAvailabilityBlocksForPlanning(
      baseAvailabilityRaw,
      { timeZone: effectiveTimeZone ?? undefined },
    );

    let availability = subtractBusyFromAvailability(baseAvailability, busyBlocks, {
      minFreeMinutes: 30,
    });
    if (availability.length === 0) {
      // If user has explicit availability and it's fully blocked, keep empty and return no sessions.
      if (explicitAvailabilityBlocks.length === 0 && busyBlocks.length === 0) {
        availability = buildDefaultAvailabilityForPlanning({
          timeZone: effectiveTimeZone ?? undefined,
        });
      }
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
  } catch (error) {
    console.error("Auto-plan route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Auto-plan failed due to a server error.",
      },
      { status: 500 },
    );
  }
}
