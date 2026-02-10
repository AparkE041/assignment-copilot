import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STATUSES = ["not_started", "in_progress", "done"] as const;

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assignmentId } = await params;
  if (!assignmentId) {
    return NextResponse.json(
      { error: "Assignment ID required" },
      { status: 400 },
    );
  }

  let body: {
    status?: string;
    priority?: number;
    estimatedEffortMinutes?: number;
    notes?: string;
  };
  try {
    body = await _req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      course: { userId: session.user.id },
    },
    include: { localState: true },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 },
    );
  }

  // Build update data
  const updateData: {
    status?: string;
    priority?: number;
    estimatedEffortMinutes?: number;
    notes?: string;
  } = {};

  if (
    typeof body.status === "string" &&
    STATUSES.includes(body.status as (typeof STATUSES)[number])
  ) {
    updateData.status = body.status;
  }

  if (typeof body.priority === "number" && body.priority >= 0 && body.priority <= 2) {
    updateData.priority = body.priority;
  }

  if (
    typeof body.estimatedEffortMinutes === "number" &&
    body.estimatedEffortMinutes >= 0
  ) {
    updateData.estimatedEffortMinutes = body.estimatedEffortMinutes;
  }

  if (typeof body.notes === "string") {
    updateData.notes = body.notes;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  if (assignment.localState) {
    await prisma.assignmentLocalState.update({
      where: { id: assignment.localState.id },
      data: updateData,
    });
  } else {
    await prisma.assignmentLocalState.create({
      data: {
        assignmentId: assignment.id,
        status: updateData.status ?? "not_started",
        priority: updateData.priority ?? 0,
        estimatedEffortMinutes: updateData.estimatedEffortMinutes,
        notes: updateData.notes,
      },
    });
  }

  return NextResponse.json({ success: true, ...updateData });
}
