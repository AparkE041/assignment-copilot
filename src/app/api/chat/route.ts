import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { htmlToText } from "@/lib/parsers/html-to-text";
import { buildRichContext } from "@/lib/ai/context-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    assignmentId,
    threadId,
    message,
    integrity = { mode: "help_me_learn", neverWriteFinalAnswers: true },
  } = body;

  if (!assignmentId || !message) {
    return NextResponse.json(
      { error: "assignmentId and message required" },
      { status: 400 }
    );
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      course: { userId: session.user.id },
    },
    include: { attachments: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const provider = await getProvider(session.user.id);
  if (!provider) {
    return NextResponse.json(
      { error: "No AI configured. Add Azure OpenAI credentials in Settings." },
      { status: 503 }
    );
  }

  const descText = assignment.descriptionHtml
    ? htmlToText(assignment.descriptionHtml)
    : "";
  const attachTexts = assignment.attachments
    .map((a) => a.extractedText)
    .filter(Boolean) as string[];
  // Use RAG-like context builder to include most relevant chunks
  const context = buildRichContext(descText, attachTexts, message);
  const systemPrompt = buildSystemPrompt(context, integrity);

  let thread = threadId
    ? await prisma.chatThread.findFirst({
        where: { id: threadId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  if (!thread) {
    thread = await prisma.chatThread.create({
      data: {
        assignmentId,
        userId: session.user.id,
      },
      include: { messages: true },
    });
  }

  await prisma.chatMessage.create({
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
        await prisma.chatMessage.create({
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
