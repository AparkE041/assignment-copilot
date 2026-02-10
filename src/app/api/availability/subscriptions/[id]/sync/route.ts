import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  syncAvailabilitySubscription,
  toAvailabilitySubscriptionForClient,
} from "@/lib/availability/subscriptions";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.availabilitySubscription.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  try {
    const { imported } = await syncAvailabilitySubscription(id);
    const refreshed = await prisma.availabilitySubscription.findUnique({
      where: { id },
    });
    if (!refreshed) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    return NextResponse.json({
      imported,
      subscription: toAvailabilitySubscriptionForClient(refreshed),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed." },
      { status: 400 },
    );
  }
}
