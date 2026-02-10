import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CanvasConnectForm } from "./canvas-connect-form";
import { AzureForm } from "./azure-form";
import { AvailabilityImport } from "./availability-import";
import { CalendarExport } from "./calendar-export";
import { DeploymentReadiness } from "./deployment-readiness";
import { ProfileSettingsForm } from "./profile-settings-form";
import { PasswordResetForm } from "./password-reset-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let connection = null;
  let user = null;
  try {
    [connection, user] = await Promise.all([
      prisma.canvasConnection.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          email: true,
          name: true,
          image: true,
          bio: true,
          timezone: true,
          password: true,
        },
      }),
    ]);
  } catch (err) {
    console.error("Settings page error:", err);
  }

  const isConnected = !!connection;
  const hasPassword = !!user?.password;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Profile, account security, deployment checks, and integrations
        </p>
      </div>

      <Card className="glass border-0 rounded-2xl shadow-apple hover:shadow-apple-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A8 8 0 1118.88 6.196M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 10a9 9 0 10-18 0h18z" />
              </svg>
            </div>
            Profile
          </CardTitle>
          <CardDescription>
            Personalize your display name, photo URL, timezone, and profile details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm
            initialProfile={{
              email: user?.email ?? null,
              name: user?.name ?? null,
              image: user?.image ?? null,
              bio: user?.bio ?? null,
              timezone: user?.timezone ?? null,
            }}
          />
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-2xl shadow-apple hover:shadow-apple-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11zm0 0v2m-6 7h12a2 2 0 002-2v-4a8 8 0 10-16 0v4a2 2 0 002 2z" />
              </svg>
            </div>
            Password
          </CardTitle>
          <CardDescription>
            {hasPassword
              ? "Update your password for email sign-in."
              : "Set a password if you currently use OAuth sign-in only."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordResetForm hasPassword={hasPassword} />
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-2xl shadow-apple hover:shadow-apple-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-1a8 8 0 11-16 0 8 8 0 0116 0z" />
              </svg>
            </div>
            Deployment Readiness
          </CardTitle>
          <CardDescription>
            Verify deployment configuration and integration health for this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeploymentReadiness />
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-2xl shadow-apple hover:shadow-apple-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Canvas
          </CardTitle>
          <CardDescription>
            Connect with a Personal Access Token. Generate one in your
            Canvas account: Profile → Settings → Approved Integrations → New Access
            Token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CanvasConnectForm
            isConnected={isConnected}
            hasEnvPat={!!process.env.CANVAS_PAT}
          />
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-2xl shadow-apple hover:shadow-apple-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            AI (Azure OpenAI)
          </CardTitle>
          <CardDescription>
            Chat, tutor, and syllabus categorization via Azure AI Foundry. Deploy
            a model at{" "}
            <a href="https://ai.azure.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
              ai.azure.com
            </a>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AzureForm />
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-2xl shadow-apple hover:shadow-apple-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            Availability Calendars
          </CardTitle>
          <CardDescription>
            Import a one-time ICS file or subscribe to live feeds to block busy times during auto-planning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityImport />
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-2xl shadow-apple hover:shadow-apple-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            Calendar Export
          </CardTitle>
          <CardDescription>
            Subscribe to your planned sessions in Apple Calendar. Generate a
            secret feed URL and add it as a calendar subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarExport />
        </CardContent>
      </Card>
    </div>
  );
}
