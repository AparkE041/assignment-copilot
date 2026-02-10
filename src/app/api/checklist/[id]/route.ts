import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { checked, title } = body;

  const existing = await prisma.checklistItem.findFirst({
    where: { id },
    include: {
      assignment: { include: { course: true } },
    },
  });

  if (!existing || existing.assignment.course.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: { checked?: boolean; title?: string } = {};
  if (typeof checked === "boolean") updateData.checked = checked;
  if (typeof title === "string") updateData.title = title.trim();

  const item = await prisma.checklistItem.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(item);
}
