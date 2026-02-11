import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
  differenceInMinutes,
  differenceInDays,
} from "date-fns";
import { getEffectiveAssignmentStatus } from "@/lib/assignments/completion";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  const [assignments, allSessions] = await Promise.all([
    prisma.assignment.findMany({
      where: { course: { userId } },
      include: { localState: true, course: { select: { name: true } } },
    }),
    // All sessions for total stats
    prisma.plannedSession.findMany({
      where: { userId },
      select: { startAt: true, endAt: true, completed: true },
    }),
  ]);

  // Weekly breakdown (last 4 weeks)
  const weeklyData: {
    week: string;
    plannedMinutes: number;
    completedMinutes: number;
  }[] = [];

  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekSessions = allSessions.filter(
      (s) => s.startAt >= weekStart && s.startAt <= weekEnd,
    );

    const planned = weekSessions.reduce(
      (sum, s) => sum + differenceInMinutes(s.endAt, s.startAt),
      0,
    );
    const completed = weekSessions
      .filter((s) => s.completed)
      .reduce((sum, s) => sum + differenceInMinutes(s.endAt, s.startAt), 0);

    weeklyData.push({
      week: format(weekStart, "MMM d"),
      plannedMinutes: planned,
      completedMinutes: completed,
    });
  }

  // This week's stats
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekSessions = allSessions.filter(
    (s) => s.startAt >= thisWeekStart && s.startAt <= thisWeekEnd,
  );
  const thisWeekPlanned = thisWeekSessions.reduce(
    (sum, s) => sum + differenceInMinutes(s.endAt, s.startAt),
    0,
  );
  const thisWeekCompleted = thisWeekSessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + differenceInMinutes(s.endAt, s.startAt), 0);

  // Assignment status breakdown
  const statusCounts = { not_started: 0, in_progress: 0, done: 0 };
  const effectiveStatusByAssignment = new Map<string, keyof typeof statusCounts>();
  for (const a of assignments) {
    const s = getEffectiveAssignmentStatus({
      localStatus: a.localState?.status ?? null,
      score: a.score,
      grade: a.grade,
      points: a.points,
    }) as keyof typeof statusCounts;
    const normalizedStatus: keyof typeof statusCounts =
      s in statusCounts ? s : "not_started";
    effectiveStatusByAssignment.set(a.id, normalizedStatus);
    statusCounts[normalizedStatus]++;
  }

  // Upcoming workload (next 7 days)
  const upcomingAssignments = assignments
    .filter((a) => {
      if (effectiveStatusByAssignment.get(a.id) === "done") return false;
      if (!a.dueAt) return false;
      const days = differenceInDays(a.dueAt, now);
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => (a.dueAt!.getTime() - b.dueAt!.getTime()));

  // Course breakdown
  const courseMap = new Map<string, { total: number; completed: number; effort: number }>();
  for (const a of assignments) {
    const name = a.course.name;
    const entry = courseMap.get(name) ?? { total: 0, completed: 0, effort: 0 };
    entry.total++;
    if (effectiveStatusByAssignment.get(a.id) === "done") entry.completed++;
    entry.effort += a.localState?.estimatedEffortMinutes ?? 0;
    courseMap.set(name, entry);
  }

  const courseBreakdown = Array.from(courseMap.entries()).map(([name, data]) => ({
    name,
    ...data,
  }));

  // Total stats
  const totalPlannedMinutes = allSessions.reduce(
    (sum, s) => sum + differenceInMinutes(s.endAt, s.startAt),
    0,
  );
  const totalCompletedMinutes = allSessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + differenceInMinutes(s.endAt, s.startAt), 0);

  return NextResponse.json({
    weeklyData,
    thisWeek: {
      plannedMinutes: thisWeekPlanned,
      completedMinutes: thisWeekCompleted,
      sessionsCount: thisWeekSessions.length,
      completedCount: thisWeekSessions.filter((s) => s.completed).length,
    },
    statusCounts,
    upcomingAssignments: upcomingAssignments.slice(0, 10).map((a) => ({
      id: a.id,
      title: a.title,
      courseName: a.course.name,
      dueAt: a.dueAt?.toISOString() ?? null,
      status: effectiveStatusByAssignment.get(a.id) ?? "not_started",
    })),
    courseBreakdown,
    totals: {
      assignments: assignments.length,
      plannedHours: Math.round(totalPlannedMinutes / 60 * 10) / 10,
      completedHours: Math.round(totalCompletedMinutes / 60 * 10) / 10,
      completionRate:
        allSessions.length > 0
          ? Math.round(
              (allSessions.filter((s) => s.completed).length / allSessions.length) * 100,
            )
          : 0,
    },
  });
}
