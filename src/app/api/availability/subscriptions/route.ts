import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createAvailabilitySubscription,
  listAvailabilitySubscriptions,
  syncAvailabilitySubscription,
  toAvailabilitySubscriptionForClient,
} from "@/lib/availability/subscriptions";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await listAvailabilitySubscriptions(session.user.id);
  return NextResponse.json({ subscriptions });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const feedUrl = typeof body.feedUrl === "string" ? body.feedUrl : "";
  const name = typeof body.name === "string" ? body.name : null;

  if (!feedUrl.trim()) {
    return NextResponse.json(
      { error: "Calendar feed URL is required." },
      { status: 400 },
    );
  }

  if (name && name.trim().length > 80) {
    return NextResponse.json(
      { error: "Calendar name must be 80 characters or fewer." },
      { status: 400 },
    );
  }

  let subscription;
  try {
    subscription = await createAvailabilitySubscription({
      userId: session.user.id,
      name,
      feedUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create subscription." },
      { status: 400 },
    );
  }

  try {
    const { imported } = await syncAvailabilitySubscription(subscription.id);
    const refreshed = await prisma.availabilitySubscription.findUnique({
      where: { id: subscription.id },
    });

    return NextResponse.json(
      {
        subscription: refreshed
          ? toAvailabilitySubscriptionForClient(refreshed)
          : toAvailabilitySubscriptionForClient(subscription),
        imported,
      },
      { status: 201 },
    );
  } catch (error) {
    const refreshed = await prisma.availabilitySubscription.findUnique({
      where: { id: subscription.id },
    });

    return NextResponse.json(
      {
        subscription: refreshed
          ? toAvailabilitySubscriptionForClient(refreshed)
          : toAvailabilitySubscriptionForClient(subscription),
        warning: error instanceof Error ? error.message : "Subscription created, but first sync failed.",
      },
      { status: 201 },
    );
  }
}
