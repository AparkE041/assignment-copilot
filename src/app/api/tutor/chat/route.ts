import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/ai/provider";
import { buildTutorSystemPrompt } from "@/lib/ai/tutor-prompt";
import { htmlToText } from "@/lib/parsers/html-to-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { message, threadId } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "message required" },
      { status: 400 }
    );
  }

  const provider = await getProvider(session.user.id);
  if (!provider) {
    return NextResponse.json(
      { error: "No AI configured. Add Azure OpenAI credentials in Settings." },
      { status: 503 }
    );
  }

  // Build context from user's assignments
  const assignments = await prisma.assignment.findMany({
    where: { course: { userId: session.user.id } },
    include: {
      course: { select: { name: true } },
      localState: { select: { status: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 50,
  });

  const contextParts = assignments.map((a) => {
    const desc = a.descriptionHtml
      ? htmlToText(a.descriptionHtml).slice(0, 500)
      : "";
    return `- ${a.title} (${a.course.name})${a.dueAt ? `, due ${a.dueAt.toISOString().slice(0, 10)}` : ""}${a.localState?.status ? `, status: ${a.localState.status}` : ""}${desc ? `\n  Description excerpt: ${desc}` : ""}`;
  });
  const assignmentsContext =
    contextParts.length > 0
      ? contextParts.join("\n")
      : "No assignments synced yet. Student can sync Canvas from Dashboard.";

  const systemPrompt = buildTutorSystemPrompt(assignmentsContext);

  let thread = threadId
    ? await prisma.tutorThread.findFirst({
        where: { id: threadId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  if (!thread) {
    thread = await prisma.tutorThread.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  await prisma.tutorMessage.create({
    data: { threadId: thread.id, role: "user", content: message },
  });

  const history = thread.messages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history,
    { role: "user" as const, content: message },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      try {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ threadId: thread.id })}\n\n`
          )
        );
        for await (const chunk of provider.streamChat(messages)) {
          fullContent += chunk;
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ content: chunk })}\n\n`
            )
          );
        }
        await prisma.tutorMessage.create({
          data: { threadId: thread.id, role: "assistant", content: fullContent },
        });
        controller.enqueue(
          new TextEncoder().encode("data: [DONE]\n\n")
        );
      } catch (err) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
