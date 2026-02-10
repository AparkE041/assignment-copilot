import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react";

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const assignments = await prisma.assignment.findMany({
    where: { course: { userId: session.user.id } },
    include: {
      course: true,
      localState: true,
    },
    orderBy: { dueAt: "asc" },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
        <p className="text-muted-foreground mt-1">
          All your assignments across courses
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
        <ul className="space-y-3">
          {assignments.map((a) => (
            <li key={a.id}>
              <Link
                href={`/assignments/${a.id}`}
                className="block glass rounded-2xl p-5 hover:bg-secondary/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {a.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.course.name}
                      {a.dueAt && ` · Due ${format(a.dueAt, "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={
                        a.localState?.status === "done" 
                          ? "default" 
                          : a.localState?.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                      className="capitalize"
                    >
                      {a.localState?.status?.replace("_", " ") ?? "not started"}
                    </Badge>
                    {a.score != null && a.points != null ? (
                      <span
                        className={`text-sm font-semibold ${
                          a.score / a.points >= 0.9
                            ? "text-green-600 dark:text-green-400"
                            : a.score / a.points >= 0.7
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {a.score}/{a.points}
                      </span>
                    ) : a.grade ? (
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {a.grade}
                      </span>
                    ) : a.points != null ? (
                      <span className="text-sm text-muted-foreground font-medium">
                        {a.points} pts
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
