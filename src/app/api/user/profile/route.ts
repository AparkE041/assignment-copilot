import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      bio: true,
      timezone: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    image?: unknown;
    bio?: unknown;
    timezone?: unknown;
  };

  const name = normalizeText(body.name);
  const image = normalizeText(body.image);
  const bio = normalizeText(body.bio);
  const timezone = normalizeText(body.timezone);

  if (name && name.length > 80) {
    return NextResponse.json(
      { error: "Name must be 80 characters or fewer." },
      { status: 400 }
    );
  }

  if (bio && bio.length > 280) {
    return NextResponse.json(
      { error: "Bio must be 280 characters or fewer." },
      { status: 400 }
    );
  }

  if (image) {
    let parsed: URL;
    try {
      parsed = new URL(image);
    } catch {
      return NextResponse.json(
        { error: "Profile photo must be a valid URL." },
        { status: 400 }
      );
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "Profile photo URL must start with http:// or https://." },
        { status: 400 }
      );
    }
  }

  if (timezone && !isValidTimezone(timezone)) {
    return NextResponse.json(
      { error: "Timezone is invalid. Use an IANA timezone like America/Chicago." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      image,
      bio,
      timezone,
    },
    select: {
      name: true,
      email: true,
      image: true,
      bio: true,
      timezone: true,
    },
  });

  return NextResponse.json({ success: true, user: updated });
}
