import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Paperclip,
  ListChecks,
  CalendarClock,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { AssignmentSummary } from "@/components/assignment/assignment-summary";
import { ChecklistSection } from "@/components/assignment/checklist-section";
import { AssignmentControls } from "@/components/assignment/assignment-controls";
import { ChatPanel } from "@/components/chat/chat-panel";
import { AssignmentStatusSelect } from "@/components/assignment/assignment-status-select";
import { Button } from "@/components/ui/button";
import { SanitizedHtml } from "@/components/sanitized-html";
import { getEffectiveAssignmentStatus } from "@/lib/assignments/completion";
import { LocalDateText } from "@/components/dates/local-date";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  let assignment;
  try {
    assignment = await prisma.assignment.findFirst({
      where: {
        id,
        course: { userId: session.user.id },
      },
      include: {
        course: true,
        localState: true,
        attachments: true,
        checklistItems: { orderBy: { order: "asc" } },
        chatThreads: {
          where: { userId: session.user.id },
          take: 1,
          orderBy: { updatedAt: "desc" },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
  } catch (err) {
    console.error("Assignment detail error:", err);
    notFound();
  }

  if (!assignment) notFound();

  const chatThread = assignment.chatThreads[0] ?? null;
  const summary = await getAssignmentSummary(assignment);
  const effectiveStatus = getEffectiveAssignmentStatus({
    localStatus: assignment.localState?.status ?? null,
    score: assignment.score,
    grade: assignment.grade,
    points: assignment.points,
  });

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/assignments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to assignments
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {assignment.title}
            </h1>
            <p className="text-muted-foreground mt-1">{assignment.course.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {assignment.dueAt && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Due{" "}
                  <LocalDateText
                    iso={assignment.dueAt.toISOString()}
                    pattern="MMM d, yyyy"
                  />
                </span>
              )}
              {assignment.points != null && (
                <Badge variant="secondary" className="font-normal">
                  {assignment.points} pts
                </Badge>
              )}
              {assignment.score != null && assignment.points != null && (
                <Badge
                  variant="outline"
                  className={`font-medium ${
                    assignment.score / assignment.points >= 0.9
                      ? "border-green-500 text-green-600 dark:text-green-400"
                      : assignment.score / assignment.points >= 0.7
                        ? "border-yellow-500 text-yellow-600 dark:text-yellow-400"
                        : "border-red-500 text-red-600 dark:text-red-400"
                  }`}
                >
                  {assignment.score}/{assignment.points}
                  {assignment.grade ? ` (${assignment.grade})` : ""}
                </Badge>
              )}
              {assignment.grade && assignment.score == null && (
                <Badge variant="outline" className="font-medium border-blue-500 text-blue-600 dark:text-blue-400">
                  Grade: {assignment.grade}
                </Badge>
              )}
            </div>
          </div>
          <AssignmentStatusSelect
            assignmentId={assignment.id}
            currentStatus={effectiveStatus}
          />
        </div>

        {/* Priority + Effort controls */}
        <AssignmentControls
          assignmentId={assignment.id}
          currentPriority={assignment.localState?.priority ?? 0}
          currentEffort={assignment.localState?.estimatedEffortMinutes ?? null}
        />
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="glass rounded-xl p-1 w-full sm:w-auto flex flex-wrap h-auto gap-1">
          <TabsTrigger value="summary" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="w-4 h-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="requirements" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4" />
            Requirements
          </TabsTrigger>
          <TabsTrigger value="attachments" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Paperclip className="w-4 h-4" />
            Attachments
          </TabsTrigger>
          <TabsTrigger value="checklist" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ListChecks className="w-4 h-4" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="plan" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CalendarClock className="w-4 h-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <AssignmentSummary
            assignmentId={assignment.id}
            summary={summary}
          />
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <Card className="glass border-0 rounded-2xl shadow-apple">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Assignment description
              </CardTitle>
              <CardDescription>
                Full instructions from Canvas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignment.descriptionHtml?.trim() ? (
                <SanitizedHtml
                  html={assignment.descriptionHtml}
                  className="prose prose-sm max-w-none dark:prose-invert"
                />
              ) : (
                <div className="rounded-xl bg-secondary/50 p-6 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No description available from Canvas.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add details in Canvas or use the Chat tab to ask questions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card className="glass border-0 rounded-2xl shadow-apple">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Attachments
              </CardTitle>
              <CardDescription>
                Files attached to this assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignment.attachments.length === 0 ? (
                <div className="rounded-xl bg-secondary/50 p-6 text-center">
                  <Paperclip className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No attachments for this assignment.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {assignment.attachments.map((att) => (
                    <li key={att.id}>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
                      >
                        <Paperclip className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 truncate text-foreground font-medium">
                          {att.filename ?? "Attachment"}
                        </span>
                        <Badge variant="outline" className="flex-shrink-0">
                          {att.extractionStatus}
                        </Badge>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <ChecklistSection
            assignmentId={assignment.id}
            items={assignment.checklistItems}
          />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <Card className="glass border-0 rounded-2xl shadow-apple">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="w-5 h-5" />
                Planned sessions
              </CardTitle>
              <CardDescription>
                Work sessions for this assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                View and manage planned work sessions on the calendar.
              </p>
              <Link href={`/calendar?assignment=${assignment.id}`}>
                <Button variant="outline" className="rounded-xl gap-2 hover:bg-secondary">
                  <CalendarClock className="w-4 h-4" />
                  View on calendar
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <ChatPanel
            assignmentId={assignment.id}
            threadId={chatThread?.id}
            messages={
              chatThread?.messages.map((m) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
              })) ?? []
            }
            integrityDefaults={{
              mode: "help_me_learn",
              neverWriteFinalAnswers: true,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function getAssignmentSummary(assignment: {
  descriptionHtml: string | null;
  attachments: { extractedText: string | null }[];
}) {
  const htmlToText = (await import("@/lib/parsers/html-to-text")).htmlToText;
  const descText = assignment.descriptionHtml
    ? htmlToText(assignment.descriptionHtml)
    : "";
  const attachmentTexts = assignment.attachments
    .map((a) => a.extractedText)
    .filter(Boolean) as string[];
  const fullText = [descText, ...attachmentTexts].filter(Boolean).join("\n\n");

  return {
    deliverables: extractDeliverables(fullText),
    constraints: extractConstraints(fullText),
    rubricHighlights: [] as string[],
    questionsForInstructor: [] as string[],
    rawText: fullText,
  };
}

function extractDeliverables(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const deliverables: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes("submit") ||
      lower.includes("deliverable") ||
      lower.includes("turn in")
    ) {
      deliverables.push(line);
    } else if (lower.includes("assignment") && lower.includes(":")) {
      deliverables.push(line);
    }
  }
  if (deliverables.length === 0 && text) {
    deliverables.push("Review full description in the Requirements tab.");
  }
  return deliverables;
}

function extractConstraints(text: string): string[] {
  const constraints: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("word count") || lower.includes("words")) {
    const match = text.match(/\d+\s*words?/i);
    if (match) constraints.push(`Word count: ${match[0]}`);
  }
  if (lower.includes("pdf") || lower.includes(".pdf")) constraints.push("PDF");
  if (lower.includes("docx") || lower.includes(".docx"))
    constraints.push("DOCX");
  if (lower.includes("double spaced")) constraints.push("Double spaced");
  if (lower.includes("mla") || lower.includes("apa"))
    constraints.push("MLA/APA citation");
  return constraints;
}
