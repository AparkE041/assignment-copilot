import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tutor sessions are intentionally ephemeral. We do not persist or restore history.
  return NextResponse.json({ threadId: null, messages: [] });
}
