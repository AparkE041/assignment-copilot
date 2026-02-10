import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { TutorFab } from "@/components/tutor/tutor-fab";

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

  return (
    <div className="min-h-screen bg-background">
      <AppNav user={session.user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
        {children}
      </main>
      <TutorFab />
    </div>
  );
}
