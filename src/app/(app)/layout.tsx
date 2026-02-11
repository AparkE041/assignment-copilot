import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { TutorFab } from "@/components/tutor/tutor-fab";
import { TimezoneGuardrail } from "@/components/timezone-guardrail";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Redirect to onboarding if not completed
  if (!session.user.hasOnboarded) {
    redirect("/onboarding");
  }

  // Pass only serializable user props to client component (avoids Server Component serialization errors)
  const user = {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };

  let storedTimezone: string | null = null;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true },
    });
    storedTimezone = dbUser?.timezone ?? null;
  } catch (error) {
    console.warn("Could not load timezone for guardrail:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav user={user} />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8 page-transition">
        <TimezoneGuardrail storedTimezone={storedTimezone} />
        {children}
      </main>
      <TutorFab />
    </div>
  );
}
