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
import { getEffectiveAssignmentStatus } from "@/lib/assignments/completion";

interface DraftSessionInput {
  assignmentId: string;
  startAt: string;
  endAt: string;
}

function parseDraftSessions(
  raw: unknown,
  allowedAssignmentIds: Set<string>,
): { assignmentId: string; startAt: Date; endAt: Date }[] {
  if (!Array.isArray(raw)) {
    throw new Error("Draft sessions payload is invalid.");
  }

  const parsed: { assignmentId: string; startAt: Date; endAt: Date }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      throw new Error("Draft sessions payload is invalid.");
    }

    const { assignmentId, startAt, endAt } = item as DraftSessionInput;
    if (typeof assignmentId !== "string" || !allowedAssignmentIds.has(assignmentId)) {
      throw new Error("Draft session contains an unknown assignment.");
    }
    if (typeof startAt !== "string" || typeof endAt !== "string") {
      throw new Error("Draft session is missing start/end time.");
    }

    const parsedStart = new Date(startAt);
    const parsedEnd = new Date(endAt);
    if (
      Number.isNaN(parsedStart.getTime()) ||
      Number.isNaN(parsedEnd.getTime()) ||
      parsedEnd <= parsedStart
    ) {
      throw new Error("Draft session has invalid start/end time.");
    }

    parsed.push({
      assignmentId,
      startAt: parsedStart,
      endAt: parsedEnd,
    });
  }

  return parsed;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const assignmentId = body.assignmentId as string | undefined;
    const mode = body.mode === "preview" ? "preview" : "apply";
    const requestedTimeZone =
      typeof body.timeZone === "string" ? body.timeZone.trim() : null;

    const userId = session.user.id;

    const [assignments, availabilityBlocks] = await Promise.all([
      prisma.assignment.findMany({
        where: assignmentId ? { id: assignmentId, course: { userId } } : { course: { userId } },
        include: { localState: true, course: { select: { name: true } } },
      }),
      prisma.availabilityBlock.findMany({
        where: { userId },
        orderBy: { startAt: "asc" },
      }),
    ]);
    if (assignmentId && assignments.length === 0) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

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
      status: getEffectiveAssignmentStatus({
        localStatus: a.localState?.status ?? null,
        score: a.score,
        grade: a.grade,
        points: a.points,
      }),
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

    const assignIds = assignments.map((a) => a.id);
    const planResult = autoPlan(assignmentForPlan, availability);
    const assignmentDetailsById = new Map(
      assignments.map((a) => [
        a.id,
        {
          title: a.title,
          courseName: a.course.name,
          dueAt: a.dueAt?.toISOString() ?? null,
        },
      ]),
    );

    const explainability = {
      generatedAt: new Date().toISOString(),
      freeWindowCount: availability.length,
      busyBlockCount: busyBlocks.length,
      explicitAvailabilityCount: explicitAvailabilityBlocks.length,
      totalAssignments: planResult.explainability.totalAssignments,
      eligibleAssignments: planResult.explainability.eligibleAssignments,
      skippedAssignments: planResult.explainability.skippedAssignments.map((item) => ({
        assignmentId: item.assignmentId,
        assignmentTitle: assignmentDetailsById.get(item.assignmentId)?.title ?? "Assignment",
        courseName: assignmentDetailsById.get(item.assignmentId)?.courseName ?? null,
        dueAt: item.dueAt?.toISOString() ?? null,
        estimatedEffortMinutes: item.estimatedEffortMinutes,
        priority: item.priority,
        reason: item.reason,
      })),
      placements: planResult.explainability.placements.map((placement) => ({
        assignmentId: placement.assignmentId,
        assignmentTitle:
          assignmentDetailsById.get(placement.assignmentId)?.title ?? "Assignment",
        courseName: assignmentDetailsById.get(placement.assignmentId)?.courseName ?? null,
        startAt: placement.startAt.toISOString(),
        endAt: placement.endAt.toISOString(),
        dueAt: placement.dueAt?.toISOString() ?? null,
        priority: placement.priority,
        reason: placement.reason,
      })),
      unplannedAssignments: planResult.explainability.unplannedAssignments.map((item) => ({
        assignmentId: item.assignmentId,
        assignmentTitle: assignmentDetailsById.get(item.assignmentId)?.title ?? "Assignment",
        courseName: assignmentDetailsById.get(item.assignmentId)?.courseName ?? null,
        dueAt: item.dueAt?.toISOString() ?? null,
        remainingMinutes: item.remainingMinutes,
        priority: item.priority,
        reason: item.reason,
      })),
    };
    const plannedMinutes = planResult.sessions.reduce(
      (sum, sessionItem) =>
        sum + Math.max(0, Math.round((sessionItem.endAt.getTime() - sessionItem.startAt.getTime()) / 60_000)),
      0,
    );
    const summary = {
      plannedSessions: planResult.sessions.length,
      plannedMinutes,
      plannedHours: Math.round((plannedMinutes / 60) * 10) / 10,
      assignmentsScheduled: new Set(planResult.sessions.map((s) => s.assignmentId)).size,
      assignmentScope: assignmentId ? 1 : assignIds.length,
    };

    if (mode === "preview") {
      return NextResponse.json({
        mode: "preview",
        sessions: planResult.sessions.map((sessionItem) => ({
          assignmentId: sessionItem.assignmentId,
          startAt: sessionItem.startAt.toISOString(),
          endAt: sessionItem.endAt.toISOString(),
        })),
        summary,
        explainability,
      });
    }

    const sessionsToApply = Array.isArray(body.draftSessions)
      ? parseDraftSessions(body.draftSessions, new Set(assignIds))
      : planResult.sessions;

    const existingToReplace = await prisma.plannedSession.findMany({
      where: {
        userId,
        assignmentId: assignmentId ? assignmentId : { in: assignIds },
      },
      select: {
        assignmentId: true,
        startAt: true,
        endAt: true,
        completed: true,
      },
    });

    const snapshotLog = await prisma.syncLog.create({
      data: {
        userId,
        type: "plan_snapshot",
        status: "success",
        message: JSON.stringify({
          assignmentScope: assignmentId ? [assignmentId] : assignIds,
          sessions: existingToReplace.map((sessionItem) => ({
            assignmentId: sessionItem.assignmentId,
            startAt: sessionItem.startAt.toISOString(),
            endAt: sessionItem.endAt.toISOString(),
            completed: sessionItem.completed,
          })),
          createdAt: new Date().toISOString(),
        }),
      },
    });

    await prisma.syncLog.deleteMany({
      where: {
        userId,
        type: "plan_snapshot",
        id: { not: snapshotLog.id },
      },
    });

    await prisma.plannedSession.deleteMany({
      where: {
        userId,
        assignmentId: assignmentId ? assignmentId : { in: assignIds },
      },
    });

    const created =
      sessionsToApply.length > 0
        ? await prisma.plannedSession.createManyAndReturn({
            data: sessionsToApply.map((sessionItem) => ({
              assignmentId: sessionItem.assignmentId,
              userId,
              startAt: sessionItem.startAt,
              endAt: sessionItem.endAt,
              completed: false,
            })),
          })
        : [];

    return NextResponse.json({
      mode: "apply",
      sessions: created,
      summary: {
        ...summary,
        replacedSessions: existingToReplace.length,
        appliedSessions: created.length,
      },
      explainability,
    });
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
