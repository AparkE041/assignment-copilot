import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { calendarFeedSecret: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const feedUrl = user?.calendarFeedSecret
    ? `${baseUrl}/api/calendar/feed/${user.calendarFeedSecret}`
    : null;

  return NextResponse.json({ feedUrl });
}

export async function POST(_request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = randomBytes(24).toString("hex");
  await prisma.user.update({
    where: { id: session.user.id },
    data: { calendarFeedSecret: secret },
  });
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const feedUrl = `${baseUrl}/api/calendar/feed/${secret}`;
  return NextResponse.json({ feedUrl, secret });
}
