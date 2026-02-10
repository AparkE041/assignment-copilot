import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { assignmentId, title, order = 0 } = body;

  if (!assignmentId || !title) {
    return NextResponse.json(
      { error: "assignmentId and title required" },
      { status: 400 }
    );
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      course: { userId: session.user.id },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const item = await prisma.checklistItem.create({
    data: {
      assignmentId,
      title: String(title).trim(),
      order: Number(order) || 0,
      checked: false,
    },
  });

  return NextResponse.json(item);
}
