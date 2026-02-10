import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  differenceInMinutes,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfWeek,
} from "date-fns";
import { CalendarView } from "./calendar-view";
import { AutoPlanButton } from "./auto-plan-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Settings, Clock3, ListChecks, Timer, TrendingUp } from "lucide-react";

type PlannedSessionRow = Prisma.PlannedSessionGetPayload<{
  include: {
    assignment: { select: { id: true; title: true; course: { select: { name: true } } } };
  };
}>;

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let plannedSessions: PlannedSessionRow[] = [];
  try {
    plannedSessions = await prisma.plannedSession.findMany({
    where: { userId: session.user.id },
    include: {
      assignment: {
        select: { id: true, title: true, course: { select: { name: true } } },
      },
    },
    orderBy: { startAt: "asc" },
  });
  } catch (err) {
    console.error("Calendar page error:", err);
    plannedSessions = [];
  }

  const events = plannedSessions.map((ps) => ({
    id: ps.id,
    title: ps.assignment.title,
    start: ps.startAt,
    end: ps.endAt,
    resource: {
      sessionId: ps.id,
      assignmentId: ps.assignment.id,
      courseName: ps.assignment.course.name,
      completed: ps.completed,
    },
  }));

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekSessions = plannedSessions.filter((session) =>
    isWithinInterval(session.startAt, { start: weekStart, end: weekEnd })
  );
  const todaySessions = plannedSessions.filter((session) => isSameDay(session.startAt, now));
  const completedWeek = weekSessions.filter((session) => session.completed).length;
  const completionRate =
    weekSessions.length > 0
      ? Math.round((completedWeek / weekSessions.length) * 100)
      : 0;
  const plannedHoursWeek =
    weekSessions.reduce(
      (total, session) => total + differenceInMinutes(session.endAt, session.startAt),
      0
    ) / 60;
  const upcomingSessions = plannedSessions
    .filter((session) => session.startAt >= now && !session.completed)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Plan and adapt your week at a glance
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AutoPlanButton />
          <Link href="/settings">
            <Button variant="outline" className="rounded-xl gap-2">
              <Settings className="w-4 h-4" />
              Availability
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">This Week</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{weekSessions.length}</p>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <ListChecks className="w-3.5 h-3.5" />
            Planned sessions
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Completion</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{completionRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {completedWeek}/{weekSessions.length || 0} done
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Planned Time</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{plannedHoursWeek.toFixed(1)}h</p>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" />
            Across this week
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{todaySessions.length}</p>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5" />
            Sessions scheduled
          </p>
        </div>
      </div>

      {upcomingSessions.length > 0 && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Coming Up
            </h2>
            <p className="text-xs text-muted-foreground">
              {format(now, "EEEE, MMM d")}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {upcomingSessions.map((session) => (
              <Link
                key={session.id}
                href={`/assignments/${session.assignment.id}`}
                className="rounded-xl border border-border/70 bg-secondary/40 p-3 hover:bg-secondary transition-colors"
              >
                <p className="text-sm font-medium text-foreground truncate">{session.assignment.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.assignment.course.name}
                </p>
                <p className="mt-1 text-xs text-foreground/80">
                  {format(session.startAt, "EEE, MMM d")} • {format(session.startAt, "h:mm a")} -{" "}
                  {format(session.endAt, "h:mm a")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <CalendarView events={events} />
    </div>
  );
}
