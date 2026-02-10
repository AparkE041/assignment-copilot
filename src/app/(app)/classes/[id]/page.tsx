import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Library,
  BookOpen,
  ArrowLeft,
  FileText,
  FileCode,
} from "lucide-react";
import { ExtractSyllabusButton } from "@/components/syllabus/extract-syllabus-button";
import { CategorizeSyllabusButton } from "@/components/syllabus/categorize-syllabus-button";
import { SyllabusDashboard } from "@/components/syllabus/syllabus-dashboard";
import { SanitizedHtml } from "@/components/sanitized-html";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const course = await prisma.course.findFirst({
    where: { id, userId: session.user.id },
    include: {
      assignments: {
        orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
        include: { localState: { select: { status: true } } },
      },
    },
  });

  if (!course) notFound();

  const raw = course.rawPayload as Record<string, unknown> | null;
  const syllabusHtml =
    typeof raw?.syllabus_body === "string" ? raw.syllabus_body : null;
  const syllabusFromFile = course.syllabusExtractedText;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href="/classes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to classes
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Library className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{course.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <p className="text-muted-foreground">
                {course.assignments.length} assignment
                {course.assignments.length !== 1 ? "s" : ""}
              </p>
              {course.currentGrade && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-semibold">
                  Current grade: {course.currentGrade}
                  {course.currentScore != null ? ` (${course.currentScore}%)` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus */}
      <section className="glass rounded-2xl p-6 shadow-apple">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Syllabus</h2>
            <p className="text-sm text-muted-foreground">
              Course overview and policies
            </p>
          </div>
        </div>
        {syllabusFromFile && syllabusFromFile.trim() ? (
          <>
            <SyllabusDashboard
              text={syllabusFromFile}
              sections={
                Array.isArray(course.syllabusSections)
                  ? (course.syllabusSections as { id: string; title: string; content: string }[])
                  : null
              }
            />
            <CategorizeSyllabusButton
              courseId={course.id}
              hasExtractedText={!!syllabusFromFile?.trim()}
              hasSections={
                Array.isArray(course.syllabusSections) &&
                (course.syllabusSections as unknown[]).length > 0
              }
            />
          </>
        ) : syllabusHtml && syllabusHtml.trim() ? (
          <>
            <SanitizedHtml
              html={syllabusHtml}
              className="prose prose-sm max-w-none text-foreground dark:prose-invert"
            />
            <ExtractSyllabusButton
              courseId={course.id}
              hasSyllabusHtml={!!syllabusHtml?.trim()}
              hasSyllabusExtracted={!!syllabusFromFile?.trim()}
            />
          </>
        ) : syllabusFromFile || syllabusHtml ? (
          <p className="text-muted-foreground">
            Syllabus is a linked file but could not be extracted. Ensure the file
            is PDF or DOCX and try syncing again.
          </p>
        ) : (
          <p className="text-muted-foreground">
            No syllabus synced from Canvas. Sync Canvas from Dashboard or
            Settings; syllabus will appear here if your course has one (inline
            or linked as PDF/DOCX) in Canvas.
          </p>
        )}
      </section>

      {/* Assignments */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Assignments
            </h2>
            <p className="text-sm text-muted-foreground">
              All assignments for this class
            </p>
          </div>
        </div>

        {course.assignments.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-2">
              No assignments yet
            </p>
            <p className="text-sm text-muted-foreground">
              Sync Canvas to pull assignments from Canvas.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {course.assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/assignments/${a.id}`}
                  className="flex items-center gap-4 glass rounded-2xl p-4 hover:bg-secondary/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow">
                    <FileCode className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {a.title}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                      {a.dueAt
                        ? format(new Date(a.dueAt), "MMM d, yyyy")
                        : "No due date"}
                      {a.localState?.status && (
                        <>
                          <span>·</span>
                          <span className="capitalize">
                            {a.localState.status.replace("_", " ")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-sm text-primary font-medium flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
