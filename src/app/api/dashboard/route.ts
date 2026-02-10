import { NextResponse } from "next/server";
import { differenceInDays } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [assignments, plannedSessions] = await Promise.all([
      prisma.assignment.findMany({
        where: { course: { userId } },
        include: {
          course: { select: { name: true } },
          localState: { select: { status: true } },
        },
        orderBy: { dueAt: "asc" },
      }),
      prisma.plannedSession.findMany({
        where: {
          userId,
          startAt: { gte: new Date() },
          completed: false,
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              course: { select: { name: true } },
            },
          },
        },
        orderBy: { startAt: "asc" },
      }),
    ]);

    // Calculate stats
    const stats = {
      total: assignments.length,
      completed: assignments.filter(
        (a) => a.localState?.status === "done"
      ).length,
      inProgress: assignments.filter(
        (a) => a.localState?.status === "in_progress"
      ).length,
      urgent: assignments.filter((a) => {
        if (!a.dueAt) return false;
        const daysUntil = differenceInDays(new Date(a.dueAt), new Date());
        return daysUntil >= 0 && daysUntil <= 3;
      }).length,
    };

    return NextResponse.json({
      assignments: assignments.map((a) => ({
        ...a,
        dueAt: a.dueAt?.toISOString() || null,
      })),
      plannedSessions: plannedSessions.map((s) => ({
        ...s,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
      })),
      stats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
