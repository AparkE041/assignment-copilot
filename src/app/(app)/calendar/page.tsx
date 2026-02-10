import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CalendarView } from "./calendar-view";
import { AutoPlanButton } from "./auto-plan-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Settings } from "lucide-react";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let plannedSessions;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Plan and view your work sessions
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

      {/* Calendar */}
      <CalendarView events={events} />
    </div>
  );
}
