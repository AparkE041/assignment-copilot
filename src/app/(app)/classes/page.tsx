import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { format } from "date-fns";
import { Library, BookOpen, ChevronRight } from "lucide-react";

type CourseRow = Prisma.CourseGetPayload<{
  include: {
    _count: { select: { assignments: true } };
    assignments: { select: { id: true; title: true; dueAt: true } };
  };
}>;

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let courses: CourseRow[] = [];
  try {
    courses = await prisma.course.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { assignments: true } },
      assignments: {
        orderBy: { dueAt: "asc" },
        take: 3,
        select: { id: true, title: true, dueAt: true },
      },
    },
    orderBy: { name: "asc" },
  });
  } catch (err) {
    console.error("Classes page error:", err);
    courses = [];
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Classes</h1>
        <p className="text-muted-foreground mt-1">
          Your courses and assignments by class
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/10 to-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Library className="w-8 h-8 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-2">
            No classes yet
          </p>
          <p className="text-muted-foreground mb-4 text-sm">
            Sync Canvas to load your courses and assignments.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium transition-colors"
          >
            Go to Dashboard <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/classes/${course.id}`}
                className="block glass rounded-2xl p-5 hover:bg-secondary/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow">
                    <Library className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {course.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {course._count.assignments} assignment
                        {course._count.assignments !== 1 ? "s" : ""}
                      </p>
                      {course.currentGrade && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-green-500/10 text-green-700 dark:text-green-400">
                          {course.currentGrade}
                          {course.currentScore != null ? ` · ${course.currentScore}%` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                </div>
                {course.assignments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Upcoming
                    </p>
                    <ul className="space-y-1">
                      {course.assignments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{a.title}</span>
                          {a.dueAt && (
                            <span className="flex-shrink-0 text-xs">
                              {format(new Date(a.dueAt), "MMM d")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
