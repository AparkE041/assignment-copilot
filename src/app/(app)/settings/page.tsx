import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CanvasConnectForm } from "./canvas-connect-form";
import { AzureForm } from "./azure-form";
import { AvailabilityImport } from "./availability-import";
import { CalendarExport } from "./calendar-export";
import { DeploymentReadiness } from "./deployment-readiness";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let connection = null;
  try {
    connection = await prisma.canvasConnection.findUnique({
      where: { userId: session.user.id },
    });
  } catch (err) {
    console.error("Settings page error:", err);
  }

  const isConnected = !!connection;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Deployment checks, Canvas, availability, and calendar export
        </p>
      </div>

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
            Canvas (Belmont)
          </CardTitle>
          <CardDescription>
            Connect with a Personal Access Token. Generate one in Belmont
            Canvas: Profile → Settings → Approved Integrations → New Access
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
            Availability (ICS)
          </CardTitle>
          <CardDescription>
            Import availability blocks from an .ics file exported from Apple
            Calendar or other calendar apps.
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
