import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  CircleCheck,
  CircleDashed,
  Clock3,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import { getEffectiveAssignmentStatus } from "@/lib/assignments/completion";
import { LocalDateText, LocalDueLabel } from "@/components/dates/local-date";

type AssignmentRow = Prisma.AssignmentGetPayload<{
  include: { course: true; localState: true };
}>;

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let assignments: AssignmentRow[] = [];
  try {
    assignments = await prisma.assignment.findMany({
      where: { course: { userId: session.user.id } },
      include: {
        course: true,
        localState: true,
      },
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    });
  } catch (err) {
    console.error("Assignments page error:", err);
    assignments = [];
  }

  const nowMs = new Date().getTime();
  const dueSoonThresholdMs = nowMs + 3 * 24 * 60 * 60 * 1000;
  const normalized = assignments.map((assignment) => {
    const effectiveStatus = getEffectiveAssignmentStatus({
      localStatus: assignment.localState?.status ?? null,
      score: assignment.score,
      grade: assignment.grade,
      points: assignment.points,
    });
    const dueAtMs = assignment.dueAt?.getTime() ?? null;
    const isCompleted = effectiveStatus === "done";
    const isOverdue = !isCompleted && dueAtMs != null && dueAtMs < nowMs;
    const isDueSoon =
      !isCompleted &&
      dueAtMs != null &&
      dueAtMs >= nowMs &&
      dueAtMs <= dueSoonThresholdMs;

    return {
      assignment,
      effectiveStatus,
      isCompleted,
      isOverdue,
      isDueSoon,
      dueAtMs,
    };
  });

  const activeAssignments = normalized
    .filter((entry) => !entry.isCompleted)
    .sort((a, b) => {
      const rank = (item: (typeof normalized)[number]) => {
        if (item.isOverdue) return 0;
        if (item.isDueSoon) return 1;
        if (item.dueAtMs == null) return 3;
        return 2;
      };
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;

      if (a.dueAtMs == null && b.dueAtMs == null) {
        return b.assignment.updatedAt.getTime() - a.assignment.updatedAt.getTime();
      }
      if (a.dueAtMs == null) return 1;
      if (b.dueAtMs == null) return -1;
      return a.dueAtMs - b.dueAtMs;
    });

  const completedAssignments = normalized
    .filter((entry) => entry.isCompleted)
    .sort(
      (a, b) => b.assignment.updatedAt.getTime() - a.assignment.updatedAt.getTime()
    );

  function getStatusBadge(status: string) {
    if (status === "done") {
      return (
        <Badge variant="secondary" className="capitalize">
          Done
        </Badge>
      );
    }
    if (status === "in_progress") {
      return (
        <Badge variant="secondary" className="capitalize">
          In progress
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="capitalize">
        Not started
      </Badge>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
        <p className="text-muted-foreground mt-1">
          Focus on what still needs to be completed
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-2">
            No assignments yet
          </p>
          <p className="text-muted-foreground mb-4 text-sm">
            Sync Canvas to fetch your assignments from your courses.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium transition-colors"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="glass rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <CircleDashed className="w-3.5 h-3.5" />
                Active: {activeAssignments.length}
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-red-600 dark:text-red-400 border-red-500/40">
                <CircleAlert className="w-3.5 h-3.5" />
                Overdue: {activeAssignments.filter((a) => a.isOverdue).length}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Clock3 className="w-3.5 h-3.5" />
                Due soon: {activeAssignments.filter((a) => a.isDueSoon).length}
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-500/40">
                <CircleCheck className="w-3.5 h-3.5" />
                Completed: {completedAssignments.length}
              </Badge>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
              Needs Attention
            </h2>
            {activeAssignments.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Everything is complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  New work will appear here after your next Canvas sync.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {activeAssignments.map(
                  ({ assignment, effectiveStatus, isOverdue }) => (
                    <li key={assignment.id}>
                      <Link
                        href={`/assignments/${assignment.id}`}
                        className={`block rounded-2xl p-5 transition-all group border ${
                          isOverdue
                            ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                            : "glass border-transparent hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow">
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {assignment.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.course.name}
                              {assignment.dueAt && (
                                <>
                                  {" · Due "}
                                  <LocalDateText
                                    iso={assignment.dueAt.toISOString()}
                                    pattern="MMM d, yyyy"
                                  />
                                </>
                              )}
                            </p>
                            <p
                              className={`mt-1 text-xs font-medium ${
                                isOverdue
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <LocalDueLabel iso={assignment.dueAt?.toISOString() ?? null} />
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getStatusBadge(effectiveStatus)}
                            {assignment.score != null && assignment.points != null ? (
                              <span
                                className={`text-sm font-semibold ${
                                  assignment.points > 0 &&
                                  assignment.score / assignment.points >= 0.9
                                    ? "text-green-600 dark:text-green-400"
                                    : assignment.points > 0 &&
                                        assignment.score / assignment.points >= 0.7
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {assignment.score}/{assignment.points}
                              </span>
                            ) : assignment.grade ? (
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {assignment.grade}
                              </span>
                            ) : assignment.points != null ? (
                              <span className="text-sm text-muted-foreground font-medium">
                                {assignment.points} pts
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>

          {completedAssignments.length > 0 && (
            <section>
              <details className="rounded-2xl border border-border/70 bg-secondary/20">
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <span className="inline-flex items-center gap-2">
                    <CircleCheck className="w-4 h-4 text-emerald-500" />
                    Completed ({completedAssignments.length})
                  </span>
                  <span>Show</span>
                </summary>
                <ul className="px-3 pb-3 space-y-2">
                  {completedAssignments.map(({ assignment }) => (
                    <li key={assignment.id}>
                      <Link
                        href={`/assignments/${assignment.id}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground/80 truncate">
                            {assignment.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {assignment.course.name}
                            {assignment.dueAt && (
                              <>
                                {" · Due "}
                                <LocalDateText
                                  iso={assignment.dueAt.toISOString()}
                                  pattern="MMM d, yyyy"
                                />
                              </>
                            )}
                          </p>
                        </div>
                        {assignment.score != null && assignment.points != null ? (
                          <span className="text-xs text-muted-foreground font-medium">
                            {assignment.score}/{assignment.points}
                          </span>
                        ) : assignment.grade ? (
                          <span className="text-xs text-muted-foreground font-medium">
                            {assignment.grade}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
