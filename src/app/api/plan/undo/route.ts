import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface SnapshotSession {
  assignmentId: string;
  startAt: string;
  endAt: string;
  completed?: boolean;
}

interface SnapshotPayload {
  assignmentScope: string[];
  sessions: SnapshotSession[];
  createdAt?: string;
}

function parseSnapshotPayload(raw: string | null): SnapshotPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      assignmentScope?: unknown;
      sessions?: unknown;
      createdAt?: unknown;
    };
    const assignmentScope = Array.isArray(parsed.assignmentScope)
      ? parsed.assignmentScope.filter((id): id is string => typeof id === "string")
      : [];
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.filter((item): item is SnapshotSession => {
          if (!item || typeof item !== "object") return false;
          const candidate = item as SnapshotSession;
          return (
            typeof candidate.assignmentId === "string" &&
            typeof candidate.startAt === "string" &&
            typeof candidate.endAt === "string"
          );
        })
      : [];

    return {
      assignmentScope,
      sessions,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : undefined,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await prisma.syncLog.findFirst({
    where: { userId: session.user.id, type: "plan_snapshot", status: "success" },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, message: true },
  });
  const parsed = parseSnapshotPayload(snapshot?.message ?? null);

  return NextResponse.json({
    canUndo: !!snapshot && !!parsed,
    snapshotCreatedAt: snapshot?.createdAt.toISOString() ?? null,
    sessionCount: parsed?.sessions.length ?? 0,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const snapshot = await prisma.syncLog.findFirst({
    where: { userId, type: "plan_snapshot", status: "success" },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, message: true },
  });
  if (!snapshot) {
    return NextResponse.json({ error: "No plan snapshot available to undo." }, { status: 404 });
  }

  const payload = parseSnapshotPayload(snapshot.message);
  if (!payload) {
    return NextResponse.json(
      { error: "Last plan snapshot is invalid and cannot be undone." },
      { status: 422 },
    );
  }

  const assignmentScope =
    payload.assignmentScope.length > 0
      ? payload.assignmentScope
      : Array.from(new Set(payload.sessions.map((sessionItem) => sessionItem.assignmentId)));

  const ownedAssignments = await prisma.assignment.findMany({
    where: { id: { in: assignmentScope }, course: { userId } },
    select: { id: true },
  });
  if (ownedAssignments.length !== assignmentScope.length) {
    return NextResponse.json(
      { error: "Undo scope contains assignments you no longer have access to." },
      { status: 400 },
    );
  }

  const restoredRows = payload.sessions
    .map((sessionItem) => {
      const startAt = new Date(sessionItem.startAt);
      const endAt = new Date(sessionItem.endAt);
      if (
        Number.isNaN(startAt.getTime()) ||
        Number.isNaN(endAt.getTime()) ||
        endAt <= startAt
      ) {
        return null;
      }

      return {
        assignmentId: sessionItem.assignmentId,
        userId,
        startAt,
        endAt,
        completed: !!sessionItem.completed,
      };
    })
    .filter(
      (sessionItem): sessionItem is {
        assignmentId: string;
        userId: string;
        startAt: Date;
        endAt: Date;
        completed: boolean;
      } => !!sessionItem,
    );

  await prisma.$transaction(async (tx) => {
    await tx.plannedSession.deleteMany({
      where: {
        userId,
        assignmentId: { in: assignmentScope },
      },
    });

    if (restoredRows.length > 0) {
      await tx.plannedSession.createMany({
        data: restoredRows,
      });
    }

    await tx.syncLog.delete({
      where: { id: snapshot.id },
    });

    await tx.syncLog.create({
      data: {
        userId,
        type: "plan_undo",
        status: "success",
        message: `Restored ${restoredRows.length} session${restoredRows.length === 1 ? "" : "s"}.`,
      },
    });
  });

  return NextResponse.json({
    success: true,
    restoredSessions: restoredRows.length,
    snapshotCreatedAt: snapshot.createdAt.toISOString(),
  });
}
