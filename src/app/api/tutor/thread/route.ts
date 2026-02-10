import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thread = await prisma.tutorThread.findUnique({
    where: { userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!thread) {
    return NextResponse.json({ threadId: null, messages: [] });
  }

  return NextResponse.json({
    threadId: thread.id,
    messages: thread.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
  });
}
