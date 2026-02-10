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
  const { startAt, endAt, completed } = body;

  const existing = await prisma.plannedSession.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: { startAt?: Date; endAt?: Date; completed?: boolean } = {};
  if (startAt) updateData.startAt = new Date(startAt);
  if (endAt) updateData.endAt = new Date(endAt);
  if (typeof completed === "boolean") updateData.completed = completed;

  const s = await prisma.plannedSession.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(s);
}
