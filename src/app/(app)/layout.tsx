import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { TutorFab } from "@/components/tutor/tutor-fab";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await auth();
  } catch (err) {
    console.error("App layout auth error:", err);
    redirect("/login");
  }

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

  return (
    <div className="min-h-screen bg-background">
      <AppNav user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
        {children}
      </main>
      <TutorFab />
    </div>
  );
}
