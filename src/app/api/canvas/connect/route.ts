import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { error: "Personal Access Token is required" },
      { status: 400 }
    );
  }

  await prisma.canvasConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      accessToken: token,
    },
    update: { accessToken: token },
  });

  return NextResponse.json({ success: true });
}
